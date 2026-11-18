package br.org.social.controller;

import br.org.social.model.Expense;
import br.org.social.model.LedgerAttachment;
import br.org.social.model.LedgerExtra;
import br.org.social.model.LedgerPersonLink;
import br.org.social.repository.*;
import br.org.social.repository.LedgerAttachmentRepository;
import br.org.social.repository.LedgerExtraRepository;
import br.org.social.repository.MemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ledger")
public class LedgerController {

    final MemberRepository members;
    final OrganizationFinanceController api;
    final IncomeController income;
    final LedgerExtraRepository extras;
    final LedgerAttachmentRepository attachments;
    final ObjectMapper json;
    final StudentRepository students;
    final InstructorRepository instructors;
    final MemberDirectoryRepository directory;
    final LedgerPersonLinkRepository people;

    public LedgerController(
        MemberRepository m,
        OrganizationFinanceController a,
        IncomeController i,
        LedgerExtraRepository e,
        LedgerAttachmentRepository f,
        ObjectMapper j,
        StudentRepository students,
        InstructorRepository instructors,
        MemberDirectoryRepository directory,
        LedgerPersonLinkRepository people
    ) {
        members = m;
        api = a;
        income = i;
        extras = e;
        attachments = f;
        json = j;
        this.students = students;
        this.instructors = instructors;
        this.directory = directory;
        this.people = people;
    }

    public record Input(
        String type,
        String description,
        String source,
        BigDecimal amount,
        LocalDate date,
        Long projectId,
        Long workshopId,
        String category,
        String reference,
        String observation,
        boolean staffExpense,
        List<Long> participantIds,
        List<Long> instructorIds,
        List<Long> memberIds
    ) {}

    public Long org(Authentication a) {
        return members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow().getOrg().getId();
    }

    @GetMapping("/people")
    public Map<String, Object> people(Authentication a) {
        Long o = org(a);
        return Map.of(
            "participants",
            students
                .findByOrgId(o)
                .stream()
                .map(p -> Map.of("id", p.getId(), "name", p.getName()))
                .toList(),
            "instructors",
            instructors
                .findByOrgId(o)
                .stream()
                .map(p -> Map.of("id", p.getId(), "name", p.getName()))
                .toList(),
            "members",
            directory
                .findByOrgId(o)
                .stream()
                .map(p ->
                    Map.of("id", p.getId(), "name", Objects.toString(p.getName(), p.getLogin()))
                )
                .toList()
        );
    }

    private List<LedgerPersonLink> personLinks(String type, List<Long> ids, Long org) {
        if (ids == null) return List.of();
        if (ids.size() > 200 || ids.contains(null)) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Vínculos inválidos."
        );
        return ids
            .stream()
            .distinct()
            .map(id -> {
                String name = switch (type) {
                    case "STUDENT" -> students
                        .findByIdAndOrgId(id, org)
                        .map(p -> p.getName())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                    case "INSTRUCTOR" -> instructors
                        .findByIdAndOrgId(id, org)
                        .map(p -> p.getName())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                    default -> directory
                        .findByIdAndOrgId(id, org)
                        .map(p -> Objects.toString(p.getName(), p.getLogin()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                };
                LedgerPersonLink link = new LedgerPersonLink();
                link.orgId = org;
                link.personId = id;
                link.personType = type;
                link.name = name;
                return link;
            })
            .toList();
    }

    @PostMapping
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> create(
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
        List<LedgerPersonLink> links = new ArrayList<>();
        if ("EXPENSE".equals(in.type())) {
            links.addAll(personLinks("STUDENT", in.participantIds(), org(a)));
            links.addAll(personLinks("INSTRUCTOR", in.instructorIds(), org(a)));
            links.addAll(personLinks("MEMBER", in.memberIds(), org(a)));
        } else if (
            in.staffExpense() ||
            (in.participantIds() != null && !in.participantIds().isEmpty()) ||
            (in.instructorIds() != null && !in.instructorIds().isEmpty()) ||
            (in.memberIds() != null && !in.memberIds().isEmpty())
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Vínculos de pessoas e staff são exclusivos de despesas."
        );
        Long id;
        if ("DONATION".equals(in.type())) id = income
            .add(
                new IncomeController.Input(
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
                    new OrganizationFinanceController.EIn(
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
                .getId();
        }
        Long o = org(a);
        LedgerExtra e = new LedgerExtra();
        e.setOrgId(o);
        e.setKind(in.type());
        e.setRecordId(id);
        e.setObservation(in.observation());
        e.setStaffExpense("EXPENSE".equals(in.type()) && in.staffExpense());
        for (LedgerPersonLink link : links) {
            link.kind = in.type();
            link.recordId = id;
            people.save(link);
        }
        extras.save(e);
        for (MultipartFile f : files) {
            LedgerAttachment t = new LedgerAttachment();
            t.setOrgId(o);
            t.setKind(in.type());
            t.setRecordId(id);
            t.setName(
                Objects.toString(f.getOriginalFilename(), "anexo").replaceAll("[\\\\/\\r\\n]", "_")
            );
            if (t.getName().length() > 200) t.setName(
                t.getName().substring(t.getName().length() - 200)
            );
            t.setContent(f.getBytes());
            attachments.save(t);
        }
        return Map.of("id", id, "type", in.type());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Authentication a) {
        Long o = org(a);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (IncomeController.Output i : income.list(a)) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", i.id());
            r.put("type", i.type());
            r.put("description", i.description());
            r.put("source", i.source());
            r.put("amount", i.amount());
            r.put("date", i.receivedDate());
            r.put("project", i.projectName());
            r.put("projectId", i.projectId());
            r.put("status", "RECEIVED");
            rows.add(r);
        }
        for (Expense e : api.expenses(a)) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", e.getId());
            r.put("type", "EXPENSE");
            r.put("description", e.getDescription());
            r.put("amount", e.getAmount());
            r.put("date", e.getExpenseDate());
            r.put("project", e.getProject() == null ? null : e.getProject().getName());
            r.put("projectId", e.getProject() == null ? null : e.getProject().getId());
            r.put("workshop", e.getWorkshop() == null ? null : e.getWorkshop().getName());
            r.put("category", e.getCategory());
            r.put("reference", e.getDocumentName());
            r.put("status", e.getStatus());
            r.put("approvedBy", e.getApprovedBy());
            if (e.getDocumentKey() != null) r.put(
                "legacyAttachment",
                Map.of(
                    "name",
                    Objects.toString(e.getDocumentName(), "comprovante"),
                    "url",
                    "/api/expenses/" + e.getId() + "/document"
                )
            );
            rows.add(r);
        }
        List<LedgerExtra> es = extras.findByOrgId(o);
        List<LedgerAttachment> fs = attachments.findByOrgId(o);
        List<LedgerPersonLink> personRows = people.findByOrgId(o);
        for (Map<String, Object> r : rows) {
            r.put("staffExpense", false);
            r.put("expenseOrigin", "EXPENSE".equals(r.get("type")) ? "Geral" : "—");
            var related = personRows
                .stream()
                .filter(p -> p.kind.equals(r.get("type")) && p.recordId.equals(r.get("id")))
                .toList();
            r.put(
                "participants",
                related
                    .stream()
                    .filter(p -> "STUDENT".equals(p.personType))
                    .map(p -> p.name)
                    .collect(java.util.stream.Collectors.joining(", "))
            );
            r.put(
                "team",
                related
                    .stream()
                    .filter(p -> !"STUDENT".equals(p.personType))
                    .map(p -> p.name)
                    .collect(java.util.stream.Collectors.joining(", "))
            );
            es.stream()
                .filter(
                    e -> e.getKind().equals(r.get("type")) && e.getRecordId().equals(r.get("id"))
                )
                .findFirst()
                .ifPresent(e -> {
                    r.put("observation", e.getObservation());
                    r.put("staffExpense", e.isStaffExpense());
                    r.put(
                        "expenseOrigin",
                        "EXPENSE".equals(r.get("type"))
                            ? e.isStaffExpense()
                                ? "Equipe (staff)"
                                : "Geral"
                            : "—"
                    );
                });
            r.put(
                "attachments",
                fs
                    .stream()
                    .filter(
                        f ->
                            f.getKind().equals(r.get("type")) && f.getRecordId().equals(r.get("id"))
                    )
                    .map(f ->
                        Map.of("name", f.getName(), "url", "/api/ledger/attachments/" + f.getId())
                    )
                    .toList()
            );
        }
        return rows;
    }

    @GetMapping("/attachments/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> download(@PathVariable Long id, Authentication a) {
        LedgerAttachment f = attachments
            .findByIdAndOrgId(id, org(a))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment()
                    .filename(f.getName(), StandardCharsets.UTF_8)
                    .build()
                    .toString()
            )
            .body(f.getContent());
    }
}
