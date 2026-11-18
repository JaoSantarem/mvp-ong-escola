package br.org.social.controller;

import br.org.social.model.*;
import br.org.social.repository.*;
import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> invalidRequest(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(
            Map.of(
                "error",
                Objects.toString(error.getReason(), "Não foi possível concluir a solicitação.")
            )
        );
    }

    private final MemberRepository members;
    private final MemberDirectoryRepository directory;
    private final StudentRepository students;
    private final InstructorRepository instructors;
    private final ProjectRepository projects;
    private final MeetingRepository meetings;
    private final PhotoAssetRepository photos;
    private final Path root;

    public PhotoController(
        MemberRepository m,
        MemberDirectoryRepository d,
        StudentRepository s,
        InstructorRepository i,
        ProjectRepository p,
        MeetingRepository mt,
        PhotoAssetRepository f,
        @Value("${app.upload-dir:uploads}") String uploadDir
    ) {
        members = m;
        directory = d;
        students = s;
        instructors = i;
        projects = p;
        meetings = mt;
        photos = f;
        root = Path.of(uploadDir).toAbsolutePath().normalize().resolve("photos");
    }

    public record PhotoOut(
        Long id,
        Long ownerId,
        String fileName,
        String contentType,
        String caption,
        LocalDate photoDate,
        Instant uploadedAt,
        String url
    ) {}

    private PhotoOut output(PhotoAsset p) {
        return new PhotoOut(
            p.id,
            p.ownerId,
            p.fileName,
            p.contentType,
            p.caption,
            p.photoDate,
            p.uploadedAt,
            "/api/photos/files/" + p.id
        );
    }

    private Member actor(Authentication a) {
        return members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow();
    }

    private void access(Member m, String type, boolean write) {
        boolean allowed = switch (type) {
            case "PROJECT" -> m.hasManagementAccess();
            case "STUDENT", "MEETING" -> m.hasDayToDayAccess();
            case "INSTRUCTOR" -> m.hasManagementAccess() || (!write && m.hasDayToDayAccess());
            case "MEMBER" -> m.hasManagementAccess() && "ADMIN".equals(m.getRole());
            default -> throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Tipo de foto inválido."
            );
        };
        if (!allowed) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Acesso não permitido a estas fotos."
        );
        if (
            write &&
            !Set.of("ADMIN", "COORDINATOR").contains(m.getRole()) &&
            !("MEETING".equals(type) && "INSTRUCTOR".equals(m.getRole()))
        ) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Apenas administradores e coordenação podem anexar fotos."
        );
    }

    private void owner(Member m, String type, Long id) {
        Long org = m.getOrg().getId();
        boolean exists = switch (type) {
            case "PROJECT" -> projects.findByIdAndOrgId(id, org).isPresent();
            case "STUDENT" -> students.findByIdAndOrgId(id, org).isPresent();
            case "MEETING" -> meetings.findByIdAndOrgId(id, org).isPresent();
            case "INSTRUCTOR" -> instructors.findByIdAndOrgId(id, org).isPresent();
            case "MEMBER" -> directory.findByIdAndOrgId(id, org).isPresent();
            default -> false;
        };
        if (!exists) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Cadastro não encontrado."
        );
    }

    @GetMapping("/avatars/{type}")
    public List<PhotoOut> avatars(@PathVariable String type, Authentication a) {
        Member m = actor(a);
        access(m, type, false);
        if (Set.of("PROJECT", "MEETING").contains(type)) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST
        );
        Map<Long, PhotoOut> latest = new LinkedHashMap<>();
        photos
            .findByOrgIdAndOwnerTypeOrderByIdDesc(m.getOrg().getId(), type)
            .forEach(p -> latest.putIfAbsent(p.ownerId, output(p)));
        return new ArrayList<>(latest.values());
    }

    @GetMapping("/{type}/{ownerId}")
    public List<PhotoOut> list(
        @PathVariable String type,
        @PathVariable Long ownerId,
        @RequestParam(required = false) @DateTimeFormat(
            iso = DateTimeFormat.ISO.DATE
        ) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(
            iso = DateTimeFormat.ISO.DATE
        ) LocalDate until,
        Authentication a
    ) {
        Member m = actor(a);
        access(m, type, false);
        owner(m, type, ownerId);
        if (from != null && until != null && from.isAfter(until)) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Período inválido."
        );
        return photos
            .findByOrgIdAndOwnerTypeAndOwnerIdOrderByPhotoDateDescIdDesc(
                m.getOrg().getId(),
                type,
                ownerId
            )
            .stream()
            .filter(
                p ->
                    (from == null || !p.photoDate.isBefore(from)) &&
                    (until == null || !p.photoDate.isAfter(until))
            )
            .map(this::output)
            .toList();
    }

    @PostMapping(value = "/{type}/{ownerId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public List<PhotoOut> upload(
        @PathVariable String type,
        @PathVariable Long ownerId,
        @RequestParam("files") List<MultipartFile> files,
        @RequestParam(required = false) @DateTimeFormat(
            iso = DateTimeFormat.ISO.DATE
        ) LocalDate photoDate,
        @RequestParam(defaultValue = "") String caption,
        Authentication a
    ) throws IOException {
        Member m = actor(a);
        access(m, type, true);
        if ("MEETING".equals(type)) meetings
            .lockByIdAndOrgId(ownerId, m.getOrg().getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        owner(m, type, ownerId);
        int max = Set.of("PROJECT", "MEETING").contains(type) ? 10 : 1;
        if (
            files.isEmpty() ||
            files.size() > max ||
            files.stream().mapToLong(MultipartFile::getSize).sum() > 30L * 1024 * 1024
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Envie até " + max + " foto(s), com no máximo 30 MB no total."
        );
        if (caption.length() > 500) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "A legenda deve ter até 500 caracteres."
        );
        List<byte[]> content = new ArrayList<>();
        List<String> formats = new ArrayList<>();
        for (MultipartFile file : files) {
            if (
                file.isEmpty() || file.getSize() > 8L * 1024 * 1024
            ) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Cada foto deve ter até 8 MB e não pode estar vazia."
            );
            byte[] bytes = file.getBytes();
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new IOException();
                var reader = readers.next();
                try {
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!Set.of("png", "jpeg", "jpg").contains(format)) throw new IOException();
                    reader.setInput(input, true, true);
                    if (
                        (long) reader.getWidth(0) * reader.getHeight(0) > 40_000_000L
                    ) throw new IOException();
                    reader.read(0); // Verify actual content, not just the file extension or MIME header.
                    formats.add(format.equals("png") ? "png" : "jpg");
                } finally {
                    reader.dispose();
                }
            } catch (Exception e) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Use uma imagem JPG ou PNG válida, de até 40 megapixels."
                );
            }
            content.add(bytes);
        }
        Files.createDirectories(root);
        List<Path> written = new ArrayList<>();
        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) for (Path path : written)
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ignored) {}
                }
            }
        );
        List<PhotoOut> results = new ArrayList<>();
        for (int n = 0; n < files.size(); n++) {
            String ext = formats.get(n);
            String key = UUID.randomUUID() + "." + ext;
            Path target = root.resolve(key);
            written.add(target);
            Files.write(target, content.get(n), StandardOpenOption.CREATE_NEW);
            PhotoAsset p = new PhotoAsset();
            p.orgId = m.getOrg().getId();
            p.ownerType = type;
            p.ownerId = ownerId;
            p.storageName = key;
            p.fileName = Objects.toString(
                files.get(n).getOriginalFilename(),
                "foto." + ext
            ).replaceAll("[\\\\/\r\n]", "_");
            if (p.fileName.length() > 255) p.fileName = p.fileName.substring(
                p.fileName.length() - 255
            );
            p.contentType = ext.equals("png") ? "image/png" : "image/jpeg";
            p.caption = caption.trim();
            p.photoDate =
                photoDate == null ? LocalDate.now(ZoneId.of("America/Sao_Paulo")) : photoDate;
            p.uploadedAt = Instant.now();
            results.add(output(photos.save(p)));
        }
        return results;
    }

    @GetMapping("/files/{id}")
    public ResponseEntity<Resource> file(@PathVariable Long id, Authentication a) {
        Member m = actor(a);
        PhotoAsset p = photos
            .findByIdAndOrgId(id, m.getOrg().getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        access(m, p.ownerType, false);
        owner(m, p.ownerType, p.ownerId);
        Path target = root.resolve(p.storageName).normalize();
        if (
            !target.startsWith(root) || !Files.isRegularFile(target)
        ) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(p.contentType))
            .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
            .header("X-Content-Type-Options", "nosniff")
            .body(new FileSystemResource(target));
    }
}
