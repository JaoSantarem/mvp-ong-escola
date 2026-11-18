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

    final br.org.social.service.LedgerFiles fileStore;
    final LedgerEventRepository events;
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
        LedgerPersonLinkRepository people,
        br.org.social.service.LedgerFiles fileStore,
        LedgerEventRepository events
    ) {
        this.fileStore = fileStore;
        this.events = events;
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
        List<Long> memberIds,
        LocalDate dueDate,
        boolean expected,
        String beneficiary,
        String reimbursementTo,
        String accountName,
        String method,
        String schedule,
        Integer occurrences
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
            !Set.of("DONATION", "EXPENSE", "CASH_IN").contains(Objects.toString(in.type(), "")) ||
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
        boolean expense = "EXPENSE".equals(in.type());
        boolean scheduled =
            in.schedule() != null && !in.schedule().isBlank() && !"ONCE".equals(in.schedule());
        int count = scheduled && in.occurrences() != null ? in.occurrences() : 1;
        if (
            scheduled &&
            (!Set.of("INSTALLMENTS", "REPEAT").contains(in.schedule()) ||
                count < 2 ||
                count > 60 ||
                (!expense && !in.expected()) ||
                in.dueDate() == null)
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Confira a quantidade e o vencimento da série mensal."
        );
        if (in.expected() && in.dueDate() == null) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe o vencimento da conta a receber."
        );
        for (String field : new String[] {
            in.beneficiary(),
            in.reimbursementTo(),
            in.source(),
            in.accountName(),
            in.method(),
            in.category(),
            in.reference(),
        })
            if (field != null && field.length() > 255) throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Use até 255 caracteres por campo."
            );
        if (
            !expense && !in.expected() && in.date().isAfter(LocalDate.now())
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Use uma previsão para recebimentos futuros."
        );
        long cents = in.amount().movePointRight(2).longValueExact();
        boolean split = "INSTALLMENTS".equals(in.schedule());
        if (split && cents < count) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Cada parcela deve valer ao menos um centavo."
        );
        List<Long> ids = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            BigDecimal amount = split
                ? BigDecimal.valueOf(cents / count + (index < cents % count ? 1 : 0), 2)
                : in.amount();
            LocalDate due = in.dueDate() == null ? null : in.dueDate().plusMonths(index);
            String description = in.description().trim();
            Long id;
            if (!expense) {
                var record = new br.org.social.model.Income();
                record.setOrg(api.tenant(a));
                record.setProject(
                    in.projectId() == null
                        ? null
                        : api.ps
                              .findByIdAndOrgId(in.projectId(), org(a))
                              .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND))
                );
                record.setType(in.type());
                record.setDescription(description);
                record.setSource(in.source());
                record.setAmount(amount);
                record.entryDate = in.date();
                record.dueDate = due;
                record.setStatus(in.expected() ? "EXPECTED" : "RECEIVED");
                if (!in.expected()) record.setReceivedDate(in.date());
                id = income.incomes.save(record).getId();
            } else {
                if (
                    in.category() == null || in.category().isBlank()
                ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a categoria");
                var expenseRecord = api.addE(
                    new OrganizationFinanceController.EIn(
                        in.projectId(),
                        in.workshopId(),
                        description,
                        in.category(),
                        amount,
                        in.date(),
                        in.reference()
                    ),
                    a
                );
                expenseRecord.dueDate = due;
                expenseRecord.beneficiary = in.beneficiary();
                expenseRecord.reimbursementTo = in.staffExpense() ? in.reimbursementTo() : null;
                id = expenseRecord.getId();
            }
            Long o = org(a);
            LedgerExtra e = new LedgerExtra();
            e.setOrgId(o);
            e.setKind(in.type());
            e.setRecordId(id);
            e.setObservation(in.observation());
            e.setStaffExpense("EXPENSE".equals(in.type()) && in.staffExpense());
            for (LedgerPersonLink person : links) {
                LedgerPersonLink link = new LedgerPersonLink();
                link.orgId = person.orgId;
                link.personType = person.personType;
                link.personId = person.personId;
                link.name = person.name;
                link.kind = in.type();
                link.recordId = id;
                people.save(link);
            }
            extras.save(e);
            var created = new br.org.social.model.LedgerEvent(
                o,
                in.type(),
                id,
                "CREATE",
                a.getName()
            );
            if (scheduled) created.note =
                (split ? "Parcela " : "Mensalidade ") + (index + 1) + " de " + count;
            events.save(created);
            if (!expense && !in.expected()) {
                var receipt = new br.org.social.model.LedgerEvent(
                    o,
                    in.type(),
                    id,
                    "SETTLE",
                    a.getName()
                );
                receipt.amount = amount;
                receipt.movementDate = in.date();
                receipt.accountName = in.accountName();
                receipt.method = in.method();
                events.save(receipt);
            }
            // Os documentos de origem da série ficam no primeiro lançamento.
            if (index == 0) fileStore.save(o, in.type(), id, null, files);
            ids.add(id);
        }
        return Map.of("id", ids.get(0), "ids", ids, "type", in.type());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(Authentication a) {
        Long o = org(a);
        List<Map<String, Object>> rows = new ArrayList<>();
        var histories = events
            .findByOrgIdOrderById(o)
            .stream()
            .collect(
                java.util.stream.Collectors.groupingBy(event -> event.kind + ":" + event.recordId)
            );
        for (var i : income.incomes.findByOrgIdOrderByReceivedDateDescIdDesc(o)) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", i.getId());
            r.put("type", i.getType());
            r.put("description", i.getDescription());
            r.put("source", i.getSource());
            r.put("amount", i.getAmount());
            r.put("date", i.entryDate == null ? i.getReceivedDate() : i.entryDate);
            r.put("project", i.getProject() == null ? null : i.getProject().getName());
            r.put("projectId", i.getProject() == null ? null : i.getProject().getId());
            FinancialActions.describe(
                r,
                i,
                histories.getOrDefault(i.getType() + ":" + i.getId(), List.of())
            );
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
            FinancialActions.describe(
                r,
                e,
                histories.getOrDefault("EXPENSE:" + e.getId(), List.of())
            );
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
        var fs = attachments.listMetadata(o);
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
                        Map.of(
                            "name",
                            f.getName(),
                            "url",
                            "/api/ledger/attachments/" + f.getId(),
                            "eventId",
                            f.getEventId() == null ? 0L : f.getEventId()
                        )
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
