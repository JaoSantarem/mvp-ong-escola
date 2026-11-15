package br.org.social;

import jakarta.persistence.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.http.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.*;
import org.springframework.security.crypto.password.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@io.swagger.v3.oas.annotations.tags.Tag(
    name = "Organização e financeiro",
    description = "Cadastro da organização, oficinas, projetos, despesas e decisões de prestação de contas"
)
@RestController
@RequestMapping("/api")
class Api {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(Api.class);
    final Orgs os;
    final Members ms;
    final Workshops ws;
    final Projects ps;
    final Expenses es;
    final PasswordEncoder enc;

    Api(Orgs o, Members m, Workshops w, Projects p, Expenses e, PasswordEncoder x) {
        os = o;
        ms = m;
        ws = w;
        ps = p;
        es = e;
        enc = x;
    }

    record Setup(
        String organization,
        String organizationType,
        String login,
        String email,
        String password
    ) {}

    record WIn(String name, String description) {}

    record WOut(Long id, String name, String description, boolean active) {}

    record PIn(String name, String funder, BigDecimal budget) {}

    record POut(Long id, String name, String funder, BigDecimal budget) {}

    record EIn(
        Long projectId,
        Long workshopId,
        String description,
        String category,
        BigDecimal amount,
        LocalDate expenseDate,
        String documentName
    ) {}

    Member who(Authentication a) {
        return ms.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow();
    }

    Org tenant(Authentication a) {
        return who(a).org;
    }

    void manager(Authentication a) {
        if (
            !List.of("ADMIN", "COORDINATOR").contains(who(a).role)
        ) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ação restrita à coordenação");
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @GetMapping("/health")
    Map health() {
        return Map.of("status", "ok");
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/setup")
    ResponseEntity<?> setup(@RequestBody Setup s) {
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
        log.info("signup_created organizationId={}", o.id);
        return ResponseEntity.ok(Map.of("organizationId", o.id));
    }

    @GetMapping("/me")
    Map me(Authentication a) {
        Member m = who(a);
        return Map.of(
            "organization",
            m.org.name,
            "login",
            m.login == null ? m.email : m.login,
            "email",
            m.email,
            "role",
            m.role
        );
    }

    @GetMapping("/workshops")
    List<WOut> workshops(Authentication a) {
        return ws
            .findByOrgId(tenant(a).id)
            .stream()
            .map(w -> new WOut(w.id, w.name, w.description, w.active))
            .toList();
    }

    @PostMapping("/workshops")
    WOut addW(@RequestBody WIn i, Authentication a) {
        manager(a);
        Workshop w = ws.save(new Workshop(tenant(a), i.name(), i.description()));
        return new WOut(w.id, w.name, w.description, w.active);
    }

    @PatchMapping("/workshops/{id}/close")
    Workshop close(@PathVariable Long id, Authentication a) {
        manager(a);
        Workshop w = ws
            .findByIdAndOrgId(id, tenant(a).id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        w.active = false;
        return ws.save(w);
    }

    @GetMapping("/projects")
    List<POut> projects(Authentication a) {
        return ps
            .findByOrgId(tenant(a).id)
            .stream()
            .map(p -> new POut(p.id, p.name, p.funder, p.budget))
            .toList();
    }

    @PostMapping("/projects")
    POut addP(@RequestBody PIn i, Authentication a) {
        manager(a);
        Project p = ps.save(new Project(tenant(a), i.name(), i.funder(), i.budget()));
        return new POut(p.id, p.name, p.funder, p.budget);
    }

    @GetMapping("/expenses")
    List<Expense> expenses(Authentication a) {
        return es.findByOrgId(tenant(a).id);
    }

    @PostMapping("/expenses")
    Expense addE(@RequestBody EIn i, Authentication a) {
        manager(a);
        Org o = tenant(a);
        Project p = ps
            .findByIdAndOrgId(i.projectId(), o.id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Workshop w =
            i.workshopId() == null
                ? null
                : ws
                      .findByIdAndOrgId(i.workshopId(), o.id)
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

    @PostMapping("/expenses/{id}/{decision}")
    Expense decide(@PathVariable Long id, @PathVariable String decision, Authentication a) {
        manager(a);
        if (!List.of("approve", "reject").contains(decision)) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST
        );
        Expense e = es
            .findByIdAndOrgId(id, tenant(a).id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        e.status = decision.equals("approve") ? "APPROVED" : "REJECTED";
        e.approvedBy = a.getName();
        return es.save(e);
    }
}
