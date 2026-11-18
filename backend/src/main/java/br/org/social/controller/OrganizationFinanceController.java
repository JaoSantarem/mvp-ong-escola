package br.org.social.controller;

import br.org.social.model.Expense;
import br.org.social.model.Member;
import br.org.social.model.Org;
import br.org.social.model.Project;
import br.org.social.model.Workshop;
import br.org.social.repository.ExpenseRepository;
import br.org.social.repository.MemberRepository;
import br.org.social.repository.OrgRepository;
import br.org.social.repository.ProjectRepository;
import br.org.social.repository.WorkshopRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@io.swagger.v3.oas.annotations.tags.Tag(
    name = "Organização e financeiro",
    description = "Cadastro da organização, oficinas, projetos, despesas e decisões de prestação de contas"
)
@RestController
@RequestMapping("/api")
public class OrganizationFinanceController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(
        OrganizationFinanceController.class
    );
    final OrgRepository os;
    final MemberRepository ms;
    final WorkshopRepository ws;
    final ProjectRepository ps;
    final ExpenseRepository es;
    final PasswordEncoder enc;
    final br.org.social.repository.LedgerEventRepository events;

    public OrganizationFinanceController(
        OrgRepository o,
        MemberRepository m,
        WorkshopRepository w,
        ProjectRepository p,
        ExpenseRepository e,
        PasswordEncoder x,
        br.org.social.repository.LedgerEventRepository events
    ) {
        os = o;
        ms = m;
        ws = w;
        ps = p;
        es = e;
        enc = x;
        this.events = events;
    }

    public record Setup(
        String organization,
        String organizationType,
        String login,
        String email,
        String password
    ) {}

    public record WIn(String name, String description, Boolean active) {}

    public record WOut(Long id, String name, String description, boolean active) {}

    public record PIn(String name, String funder, BigDecimal budget) {}

    public record POut(Long id, String name, String funder, BigDecimal budget) {}

    public record EIn(
        Long projectId,
        Long workshopId,
        String description,
        String category,
        BigDecimal amount,
        LocalDate expenseDate,
        String documentName
    ) {}

    public Member who(Authentication a) {
        return ms.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow();
    }

    public Org tenant(Authentication a) {
        return who(a).getOrg();
    }

    public void manager(Authentication a) {
        if (
            !List.of("ADMIN", "COORDINATOR").contains(who(a).getRole())
        ) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ação restrita à coordenação");
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @GetMapping("/health")
    public Map health() {
        return Map.of("status", "ok");
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/setup")
    public ResponseEntity<?> setup(@RequestBody Setup s) {
        log.info(
            "signup_received type={} loginPresent={} emailPresent={}",
            s.organizationType(),
            s.login() != null,
            s.email() != null
        );
        if (
            s.password() == null || s.password().length() < 10
        ) return ResponseEntity.badRequest().body(Map.of("error", "senha mínima: 10 caracteres"));
        if (
            s.login() == null || s.login().isBlank() || s.login().length() < 3
        ) return ResponseEntity.badRequest().body(
            Map.of("error", "login deve ter pelo menos 3 caracteres")
        );
        if (
            !List.of("ONG", "ESCOLA").contains(s.organizationType())
        ) return ResponseEntity.badRequest().body(Map.of("error", "Tipo deve ser ONG ou ESCOLA"));
        if (ms.findByEmailOrLogin(s.email(), s.login()).isPresent()) {
            log.warn("signup_rejected reason=duplicate_email_or_login");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of("error", "E-mail ou login já cadastrado")
            );
        }
        Org o = os.save(new Org(s.organization(), s.organizationType()));
        ms.save(new Member(o, s.login(), s.email(), enc.encode(s.password()), "ADMIN"));
        log.info("signup_created organizationId={}", o.getId());
        return ResponseEntity.ok(Map.of("organizationId", o.getId()));
    }

    @GetMapping("/me")
    public Map me(Authentication a) {
        Member m = who(a);
        return Map.of(
            "organization",
            m.getOrg().getName(),
            "login",
            m.getLogin() == null ? m.getEmail() : m.getLogin(),
            "email",
            m.getEmail(),
            "role",
            m.getRole(),
            "id",
            m.getId(),
            "dayToDayAccess",
            m.hasDayToDayAccess(),
            "managementAccess",
            m.hasManagementAccess()
        );
    }

    private String validName(String name) {
        if (
            name == null || name.isBlank() || name.length() > 255
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe um nome de até 255 caracteres."
        );
        return name.trim();
    }

    @GetMapping("/workshops")
    public List<WOut> workshops(Authentication a) {
        return ws
            .findByOrgId(tenant(a).getId())
            .stream()
            .map(w -> new WOut(w.getId(), w.getName(), w.getDescription(), w.getActive()))
            .toList();
    }

    @PostMapping("/workshops")
    public WOut addW(@RequestBody WIn i, Authentication a) {
        manager(a);
        Workshop w = ws.save(new Workshop(tenant(a), validName(i.name()), i.description()));
        return new WOut(w.getId(), w.getName(), w.getDescription(), w.getActive());
    }

    @org.springframework.web.bind.annotation.PutMapping("/workshops/{id}")
    public WOut editWorkshop(@PathVariable Long id, @RequestBody WIn input, Authentication a) {
        manager(a);
        Workshop w = ws
            .findByIdAndOrgId(id, tenant(a).getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        w.setName(validName(input.name()));
        w.setDescription(input.description());
        if (input.active() != null) w.setActive(input.active());
        ws.save(w);
        return new WOut(id, w.getName(), w.getDescription(), w.getActive());
    }

    @PatchMapping("/workshops/{id}/close")
    public Workshop close(@PathVariable Long id, Authentication a) {
        manager(a);
        Workshop w = ws
            .findByIdAndOrgId(id, tenant(a).getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        w.setActive(false);
        return ws.save(w);
    }

    @GetMapping("/projects")
    public List<POut> projects(Authentication a) {
        return ps
            .findByOrgId(tenant(a).getId())
            .stream()
            .map(p -> new POut(p.getId(), p.getName(), p.getFunder(), p.getBudget()))
            .toList();
    }

    @PostMapping("/projects")
    public POut addP(@RequestBody PIn i, Authentication a) {
        manager(a);
        Project p = ps.save(new Project(tenant(a), validName(i.name()), i.funder(), i.budget()));
        return new POut(p.getId(), p.getName(), p.getFunder(), p.getBudget());
    }

    @org.springframework.web.bind.annotation.PutMapping("/projects/{id}")
    public POut editProject(@PathVariable Long id, @RequestBody PIn input, Authentication a) {
        manager(a);
        Project project = ps
            .findByIdAndOrgId(id, tenant(a).getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (
            input.budget() == null || input.budget().signum() < 0 || input.budget().scale() > 2
        ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Orçamento inválido.");
        project.setName(validName(input.name()));
        project.setFunder(input.funder());
        project.setBudget(input.budget());
        ps.save(project);
        return new POut(id, project.getName(), project.getFunder(), project.getBudget());
    }

    @GetMapping("/expenses")
    public List<Expense> expenses(Authentication a) {
        return es.findByOrgId(tenant(a).getId());
    }

    @PostMapping("/expenses")
    public Expense addE(@RequestBody EIn i, Authentication a) {
        manager(a);
        Org o = tenant(a);
        if (
            !FinancialActions.validMoney(i.amount()) ||
            i.expenseDate() == null ||
            i.description() == null ||
            i.description().isBlank() ||
            i.category() == null ||
            i.category().isBlank()
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Confira a descrição, categoria, data e valor da despesa."
        );
        Project p =
            i.projectId() == null
                ? null
                : ps
                      .findByIdAndOrgId(i.projectId(), o.getId())
                      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Workshop w =
            i.workshopId() == null
                ? null
                : ws
                      .findByIdAndOrgId(i.workshopId(), o.getId())
                      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return es.save(
            new Expense(
                o,
                p,
                w,
                i.description(),
                i.category(),
                i.amount(),
                i.expenseDate(),
                i.documentName()
            )
        );
    }

    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/expenses/{id}/{decision}")
    public Expense decide(@PathVariable Long id, @PathVariable String decision, Authentication a) {
        manager(a);
        if (!List.of("approve", "reject").contains(decision)) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST
        );
        Expense e = es
            .lockEntry(id, tenant(a).getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!"PENDING".equals(e.getStatus())) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Esta despesa já teve uma decisão."
        );
        events.save(
            new br.org.social.model.LedgerEvent(
                tenant(a).getId(),
                "EXPENSE",
                id,
                decision.equals("approve") ? "APPROVE" : "REJECT",
                a.getName()
            )
        );
        e.setStatus(decision.equals("approve") ? "APPROVED" : "REJECTED");
        e.setApprovedBy(a.getName());
        return es.save(e);
    }
}
