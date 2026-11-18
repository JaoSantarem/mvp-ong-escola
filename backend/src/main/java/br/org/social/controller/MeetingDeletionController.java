package br.org.social.controller;

import br.org.social.model.*;
import br.org.social.repository.*;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/meetings")
public class MeetingDeletionController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(
        MeetingDeletionController.class
    );
    private final MemberRepository members;
    private final MeetingRepository meetings;
    private final AttendanceRepository attendance;
    private final PedagogicalNoteRepository notes;
    private final PhotoAssetRepository photos;
    private final PasswordEncoder encoder;
    private final Path root;
    private final Map<Long, java.util.List<java.time.Instant>> failures =
        new java.util.concurrent.ConcurrentHashMap<>();

    public MeetingDeletionController(
        MemberRepository members,
        MeetingRepository meetings,
        AttendanceRepository attendance,
        PedagogicalNoteRepository notes,
        PhotoAssetRepository photos,
        PasswordEncoder encoder,
        @Value("${app.upload-dir:uploads}") String uploadDir
    ) {
        this.members = members;
        this.meetings = meetings;
        this.attendance = attendance;
        this.notes = notes;
        this.photos = photos;
        this.encoder = encoder;
        root = Path.of(uploadDir).toAbsolutePath().normalize().resolve("photos");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> error(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(
            Map.of("error", Objects.toString(e.getReason(), "Não foi possível excluir o encontro."))
        );
    }

    private Member actor(Authentication a) {
        Member m = members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow();
        if (
            !m.hasDayToDayAccess() || !Set.of("ADMIN", "COORDINATOR").contains(m.getRole())
        ) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Apenas administração e coordenação podem excluir encontros."
        );
        return m;
    }

    public record Confirmation(String password, boolean confirmed) {}

    @GetMapping("/{id}/deletion-preview")
    public Map<String, Object> preview(@PathVariable Long id, Authentication a) {
        Member m = actor(a);
        Long org = m.getOrg().getId();
        ClassMeeting meeting = meetings
            .findByIdAndOrgId(id, org)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return Map.of(
            "id",
            id,
            "meetingDate",
            meeting.getMeetingDate(),
            "topic",
            Objects.toString(meeting.getTopic(), "Encontro"),
            "attendance",
            attendance.findByMeetingIdAndOrgId(id, org).size(),
            "notes",
            notes.findByMeetingIdAndOrgId(id, org).size(),
            "photos",
            photos
                .findByOrgIdAndOwnerTypeAndOwnerIdOrderByPhotoDateDescIdDesc(org, "MEETING", id)
                .size()
        );
    }

    private synchronized void verify(Member m, String password) {
        var now = java.time.Instant.now();
        failures.entrySet().removeIf(entry ->
            entry
                .getValue()
                .stream()
                .noneMatch(t -> t.isAfter(now.minusSeconds(900)))
        );
        var attempts = failures.computeIfAbsent(m.getId(), key -> new ArrayList<>());
        attempts.removeIf(t -> !t.isAfter(now.minusSeconds(900)));
        if (attempts.size() >= 5) throw new ResponseStatusException(
            HttpStatus.TOO_MANY_REQUESTS,
            "Muitas tentativas de senha. Tente novamente em 15 minutos."
        );
        boolean valid = false;
        try {
            valid = m.getHash() != null && encoder.matches(password, m.getHash());
        } catch (IllegalArgumentException ignored) {}
        if (!valid) {
            attempts.add(now);
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Senha incorreta. O encontro não foi excluído."
            );
        }
        failures.remove(m.getId());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(
        @PathVariable Long id,
        @RequestBody Confirmation input,
        Authentication a
    ) {
        Member m = actor(a);
        Long org = m.getOrg().getId();
        ClassMeeting meeting = meetings
            .lockByIdAndOrgId(id, org)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (
            !input.confirmed() ||
            input.password() == null ||
            input.password().isBlank() ||
            input.password().length() > 1000
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Confirme a exclusão e informe sua senha atual."
        );
        verify(m, input.password());
        var images = photos.findByOrgIdAndOwnerTypeAndOwnerIdOrderByPhotoDateDescIdDesc(
            org,
            "MEETING",
            id
        );
        var files = images
            .stream()
            .map(p -> root.resolve(p.storageName).normalize())
            .filter(p -> p.startsWith(root))
            .toList();
        attendance.deleteAll(attendance.findByMeetingIdAndOrgId(id, org));
        notes.deleteAll(notes.findByMeetingIdAndOrgId(id, org));
        photos.deleteAll(images);
        meetings.delete(meeting);
        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (Path file : files)
                        try {
                            Files.deleteIfExists(file);
                        } catch (java.io.IOException e) {
                            log.warn(
                                "Não foi possível limpar um arquivo do encontro excluído {}",
                                id
                            );
                        }
                }
            }
        );
        return ResponseEntity.noContent().build();
    }
}
