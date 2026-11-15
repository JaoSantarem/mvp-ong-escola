package br.org.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Entity
class LedgerExtra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    Long orgId;
    String kind;
    Long recordId;

    @Column(length = 5000)
    String observation;
}

@Entity
class LedgerAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    Long orgId;
    String kind;
    Long recordId;
    String name;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.LONGVARBINARY)
    byte[] content;
}

interface LedgerExtras extends JpaRepository<LedgerExtra, Long> {
    List<LedgerExtra> findByOrgId(Long id);
}

interface LedgerAttachments extends JpaRepository<LedgerAttachment, Long> {
    List<LedgerAttachment> findByOrgId(Long id);
    Optional<LedgerAttachment> findByIdAndOrgId(Long id, Long org);
}

@RestController
@RequestMapping("/api/ledger")
class LedgerApi {

    final Members members;
    final Api api;
    final IncomeApi income;
    final LedgerExtras extras;
    final LedgerAttachments attachments;
    final ObjectMapper json;

    LedgerApi(Members m, Api a, IncomeApi i, LedgerExtras e, LedgerAttachments f, ObjectMapper j) {
        members = m;
        api = a;
        income = i;
        extras = e;
        attachments = f;
        json = j;
    }

    record Input(
        String type,
        String description,
        String source,
        BigDecimal amount,
        LocalDate date,
        Long projectId,
        Long workshopId,
        String category,
        String reference,
        String observation
    ) {}

    Long org(Authentication a) {
        return members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow().org.id;
    }

    @PostMapping
    @Transactional(rollbackFor = Exception.class)
    Map<String, Object> create(
        @RequestPart("data") String payload,
        @RequestPart(value = "files", required = false) List<MultipartFile> files,
        Authentication a
    ) throws Exception {
        api.manager(a);
        Input in = json.readValue(payload, Input.class);
        if (
            !Set.of("DONATION", "EXPENSE").contains(Objects.toString(in.type(), "")) ||
            in.description() == null ||
            in.description().isBlank() ||
            in.description().length() > 255 ||
            in.date() == null ||
            in.amount() == null ||
            in.amount().signum() <= 0 ||
            in.amount().scale() > 2 ||
            in.amount().compareTo(new BigDecimal("9999999999999.99")) > 0 ||
            (in.observation() != null && in.observation().length() > 5000)
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Confira tipo, descrição, data, valor e observação (até 5000 caracteres)"
        );
        if (files == null) files = List.of();
        if (files.size() > 5) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Envie até 5 anexos"
        );
        long size = 0;
        for (MultipartFile f : files) {
            size += f.getSize();
            String n = Objects.toString(f.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
            if (
                f.isEmpty() ||
                f.getSize() > 15 * 1024 * 1024 ||
                !n.matches(".*\\.(pdf|png|jpg|jpeg)$")
            ) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Use PDF, PNG ou JPG de até 15 MB"
            );
        }
        if (size > 30 * 1024 * 1024) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Os anexos devem somar até 30 MB"
        );
        Long id;
        if ("DONATION".equals(in.type())) id = income
            .add(
                new IncomeApi.Input(
                    "DONATION",
                    in.description(),
                    in.source(),
                    in.amount(),
                    in.date(),
                    in.projectId()
                ),
                a
            )
            .id();
        else {
            if (
                in.projectId() == null || in.category() == null || in.category().isBlank()
            ) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Informe projeto e categoria"
            );
            id = api
                .addE(
                    new Api.EIn(
                        in.projectId(),
                        in.workshopId(),
                        in.description(),
                        in.category(),
                        in.amount(),
                        in.date(),
                        in.reference()
                    ),
                    a
                )
                .id;
        }
        Long o = org(a);
        LedgerExtra e = new LedgerExtra();
        e.orgId = o;
        e.kind = in.type();
        e.recordId = id;
        e.observation = in.observation();
        extras.save(e);
        for (MultipartFile f : files) {
            LedgerAttachment t = new LedgerAttachment();
            t.orgId = o;
            t.kind = in.type();
            t.recordId = id;
            t.name = Objects.toString(f.getOriginalFilename(), "anexo").replaceAll(
                "[\\\\/\\r\\n]",
                "_"
            );
            if (t.name.length() > 200) t.name = t.name.substring(t.name.length() - 200);
            t.content = f.getBytes();
            attachments.save(t);
        }
        return Map.of("id", id, "type", in.type());
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<Map<String, Object>> list(Authentication a) {
        Long o = org(a);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (IncomeApi.Output i : income.list(a)) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", i.id());
            r.put("type", i.type());
            r.put("description", i.description());
            r.put("source", i.source());
            r.put("amount", i.amount());
            r.put("date", i.receivedDate());
            r.put("project", i.projectName());
            r.put("status", "RECEIVED");
            rows.add(r);
        }
        for (Expense e : api.expenses(a)) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", e.id);
            r.put("type", "EXPENSE");
            r.put("description", e.description);
            r.put("amount", e.amount);
            r.put("date", e.expenseDate);
            r.put("project", e.project == null ? null : e.project.name);
            r.put("workshop", e.workshop == null ? null : e.workshop.name);
            r.put("category", e.category);
            r.put("reference", e.documentName);
            r.put("status", e.status);
            r.put("approvedBy", e.approvedBy);
            if (e.documentKey != null) r.put(
                "legacyAttachment",
                Map.of(
                    "name",
                    Objects.toString(e.documentName, "comprovante"),
                    "url",
                    "/api/expenses/" + e.id + "/document"
                )
            );
            rows.add(r);
        }
        List<LedgerExtra> es = extras.findByOrgId(o);
        List<LedgerAttachment> fs = attachments.findByOrgId(o);
        for (Map<String, Object> r : rows) {
            es.stream()
                .filter(e -> e.kind.equals(r.get("type")) && e.recordId.equals(r.get("id")))
                .findFirst()
                .ifPresent(e -> r.put("observation", e.observation));
            r.put(
                "attachments",
                fs
                    .stream()
                    .filter(f -> f.kind.equals(r.get("type")) && f.recordId.equals(r.get("id")))
                    .map(f -> Map.of("name", f.name, "url", "/api/ledger/attachments/" + f.id))
                    .toList()
            );
        }
        return rows;
    }

    @GetMapping("/attachments/{id}")
    @Transactional(readOnly = true)
    ResponseEntity<byte[]> download(@PathVariable Long id, Authentication a) {
        LedgerAttachment f = attachments
            .findByIdAndOrgId(id, org(a))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment()
                    .filename(f.name, StandardCharsets.UTF_8)
                    .build()
                    .toString()
            )
            .body(f.content);
    }
}
