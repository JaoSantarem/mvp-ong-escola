package br.org.social.controller;

import br.org.social.model.Expense;
import br.org.social.model.Instructor;
import br.org.social.model.Member;
import br.org.social.model.Org;
import br.org.social.model.OrgPosition;
import br.org.social.model.Workshop;
import br.org.social.model.WorkshopInstructor;
import br.org.social.repository.ExpenseRepository;
import br.org.social.repository.InstructorRepository;
import br.org.social.repository.MemberDirectoryRepository;
import br.org.social.repository.MemberRepository;
import br.org.social.repository.OrgPositionRepository;
import br.org.social.repository.ProjectRepository;
import br.org.social.repository.StudentRepository;
import br.org.social.repository.WorkshopInstructorRepository;
import br.org.social.repository.WorkshopRepository;
import br.org.social.security.TokenSecurity;
import java.math.BigDecimal;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@io.swagger.v3.oas.annotations.tags.Tag(
    name = "Equipe e relatórios",
    description = "Usuários, instrutores, vínculos com oficinas e relatórios"
)
@RestController
@RequestMapping("/api")
public class TeamController {

    final MemberRepository members;
    final MemberDirectoryRepository directory;
    final OrgPositionRepository positions;
    final PasswordEncoder encoder;
    final InstructorRepository instructors;
    final WorkshopRepository workshops;
    final WorkshopInstructorRepository assignments;
    final ProjectRepository projects;
    final ExpenseRepository expenses;
    final StudentRepository students;

    public TeamController(
        MemberRepository m,
        MemberDirectoryRepository d,
        OrgPositionRepository op,
        PasswordEncoder e,
        InstructorRepository i,
        WorkshopRepository w,
        WorkshopInstructorRepository a,
        ProjectRepository p,
        ExpenseRepository x,
        StudentRepository s
    ) {
        members = m;
        directory = d;
        positions = op;
        encoder = e;
        instructors = i;
        workshops = w;
        assignments = a;
        projects = p;
        expenses = x;
        students = s;
    }

    public record UserIn(
        String name,
        String login,
        String email,
        Boolean dayToDayAccess,
        Boolean managementAccess
    ) {}

    public record AreaAccess(boolean dayToDayAccess, boolean managementAccess) {}

    public record PositionIn(String name, String description) {}

    public record PositionAssign(Long positionId) {}

    public record InstructorIn(String name, String area, String contact, Boolean active) {}

    public record InstructorOut(
        Long id,
        String name,
        String area,
        String contact,
        Boolean active
    ) {}

    public record WorkshopInstructorOut(Long id, InstructorOut instructor) {}

    public record Assign(Long instructorId) {}

    public Member actor(Authentication a) {
        return members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow();
    }

    public Org org(Authentication a) {
        return actor(a).getOrg();
    }

    public void admin(Authentication a) {
        if (!"ADMIN".equals(actor(a).getRole())) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN
        );
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users(Authentication a) {
        admin(a);
        return directory.findByOrgId(org(a).getId()).stream().map(this::userView).toList();
    }

    public Map<String, Object> userView(Member u) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", u.getId());
        view.put("name", u.getName() == null ? "" : u.getName());
        view.put("login", u.getLogin());
        view.put("email", u.getEmail());
        view.put("permissionRole", u.getRole());
        view.put("dayToDayAccess", u.hasDayToDayAccess());
        view.put("managementAccess", u.hasManagementAccess());
        view.put("positionId", u.getPosition() == null ? null : u.getPosition().getId());
        view.put("positionName", u.getPosition() == null ? null : u.getPosition().getName());
        return view;
    }

    @PostMapping("/users")
    public Map<String, Object> addUser(@RequestBody UserIn i, Authentication a) {
        admin(a);
        if (i.name() == null || i.name().isBlank()) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe o nome do membro"
        );
        if (
            i.login() == null || i.login().isBlank() || i.login().trim().length() < 3
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Login deve ter pelo menos 3 caracteres"
        );
        if (
            i.email() == null || !i.email().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
        ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "E-mail inválido");
        String login = i.login().trim();
        String email = i.email().trim().toLowerCase(Locale.ROOT);
        if (members.findByEmailOrLogin(email, login).isPresent()) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "E-mail ou login já cadastrado"
        );
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        String setupToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Member u = new Member(org(a), login, email, null, "INSTRUCTOR");
        u.setName(i.name().trim());
        u.setDayToDayAccess(i.dayToDayAccess() == null || i.dayToDayAccess());
        u.setManagementAccess(Boolean.TRUE.equals(i.managementAccess()));
        u.setPasswordSetupRequired(true);
        u.setSetupTokenHash(TokenSecurity.hash(setupToken));
        u.setSetupTokenExpiresAt(java.time.Instant.now().plus(java.time.Duration.ofDays(7)));
        u = directory.save(u);
        Map<String, Object> result = userView(u);
        result.put("setupToken", setupToken);
        result.put("setupTokenExpiresAt", u.getSetupTokenExpiresAt().toString());
        return result;
    }

    @PutMapping("/users/{id}/areas")
    public Map<String, Object> updateAreas(
        @PathVariable Long id,
        @RequestBody AreaAccess access,
        Authentication a
    ) {
        admin(a);
        Member target = directory
            .findByIdAndOrgId(id, org(a).getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (
            "ADMIN".equals(target.getRole()) &&
            (!access.dayToDayAccess() || !access.managementAccess())
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Administradores mantêm acesso às duas áreas."
        );
        target.setDayToDayAccess(access.dayToDayAccess());
        target.setManagementAccess(access.managementAccess());
        return userView(directory.save(target));
    }

    @GetMapping("/positions")
    public List<Map<String, Object>> positions(Authentication a) {
        admin(a);
        return this.positions
            .findByOrgId(org(a).getId())
            .stream()
            .map(p ->
                Map.<String, Object>of(
                    "id",
                    p.getId(),
                    "name",
                    p.getName(),
                    "description",
                    p.getDescription() == null ? "" : p.getDescription()
                )
            )
            .toList();
    }

    @PostMapping("/positions")
    public Map<String, Object> addPosition(@RequestBody PositionIn input, Authentication a) {
        admin(a);
        if (input.name() == null || input.name().isBlank()) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe o nome do cargo"
        );
        Org o = org(a);
        String name = input.name().trim();
        if (
            positions.findByOrgIdAndNameIgnoreCase(o.getId(), name).isPresent()
        ) throw new ResponseStatusException(HttpStatus.CONFLICT, "Esse cargo já existe");
        OrgPosition p = positions.save(
            new OrgPosition(o, name, input.description() == null ? "" : input.description().trim())
        );
        return Map.of("id", p.getId(), "name", p.getName(), "description", p.getDescription());
    }

    @PutMapping("/users/{id}/position")
    public Map<String, Object> assignPosition(
        @PathVariable Long id,
        @RequestBody PositionAssign input,
        Authentication a
    ) {
        admin(a);
        Org o = org(a);
        Member user = directory
            .findByIdAndOrgId(id, o.getId())
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Membro não encontrado nesta organização"
                )
            );
        if (input.positionId() == null) user.setPosition(null);
        else user.setPosition(
            positions
                .findByIdAndOrgId(input.positionId(), o.getId())
                .orElseThrow(() ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Cargo não encontrado nesta organização"
                    )
                )
        );
        return userView(directory.save(user));
    }

    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/users/{id}/password-reset")
    public Map<String, Object> resetPassword(@PathVariable Long id, Authentication a) {
        admin(a);
        Org o = org(a);
        Member user = directory
            .findByIdAndOrgId(id, o.getId())
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Membro não encontrado nesta organização"
                )
            );
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        String setupToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        user.setHash(null);
        user.setPasswordSetupRequired(true);
        user.setSetupTokenHash(TokenSecurity.hash(setupToken));
        user.setSetupTokenExpiresAt(java.time.Instant.now().plus(java.time.Duration.ofDays(7)));
        directory.save(user);
        return Map.of(
            "setupToken",
            setupToken,
            "setupTokenExpiresAt",
            user.getSetupTokenExpiresAt().toString()
        );
    }

    @GetMapping("/instructors")
    public List<InstructorOut> instructors(Authentication a) {
        return instructors
            .findByOrgId(org(a).getId())
            .stream()
            .map(i ->
                new InstructorOut(i.getId(), i.getName(), i.getArea(), i.getContact(), i.isActive())
            )
            .toList();
    }

    @PostMapping("/instructors")
    public InstructorOut addInstructor(@RequestBody InstructorIn i, Authentication a) {
        if (
            !List.of("ADMIN", "COORDINATOR").contains(actor(a).getRole())
        ) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        validateInstructor(i);
        Instructor instructor = instructors.save(
            new Instructor(org(a), i.name().trim(), i.area(), i.contact())
        );
        return new InstructorOut(
            instructor.getId(),
            instructor.getName(),
            instructor.getArea(),
            instructor.getContact(),
            instructor.isActive()
        );
    }

    private void validateInstructor(InstructorIn i) {
        if (i.name() == null || i.name().isBlank()) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe o nome do instrutor"
        );
        if (
            i.contact() == null || !i.contact().matches("^\\(\\d{2}\\) (?:\\d{4}|\\d{5})-\\d{4}$")
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe um telefone válido com DDD, por exemplo (11) 91234-5678"
        );
    }

    @PutMapping("/instructors/{id}")
    public InstructorOut updateInstructor(
        @PathVariable Long id,
        @RequestBody InstructorIn i,
        Authentication a
    ) {
        if (
            !List.of("ADMIN", "COORDINATOR").contains(actor(a).getRole())
        ) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Instructor instructor = instructors
            .findByIdAndOrgId(id, org(a).getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        validateInstructor(i);
        if (i.active() != null) instructor.setActive(i.active());
        instructor.setName(i.name().trim());
        instructor.setArea(i.area());
        instructor.setContact(i.contact());
        instructors.save(instructor);
        return new InstructorOut(
            instructor.getId(),
            instructor.getName(),
            instructor.getArea(),
            instructor.getContact(),
            instructor.isActive()
        );
    }

    @GetMapping("/workshops/{id}/instructors")
    public List<WorkshopInstructorOut> workshopInstructors(
        @PathVariable Long id,
        Authentication a
    ) {
        Org o = org(a);
        workshops
            .findByIdAndOrgId(id, o.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return assignments
            .findByWorkshopIdAndOrgId(id, o.getId())
            .stream()
            .map(x ->
                new WorkshopInstructorOut(
                    x.getId(),
                    new InstructorOut(
                        x.getInstructor().getId(),
                        x.getInstructor().getName(),
                        x.getInstructor().getArea(),
                        x.getInstructor().getContact(),
                        x.getInstructor().isActive()
                    )
                )
            )
            .toList();
    }

    @PostMapping("/workshops/{id}/instructors")
    public WorkshopInstructorOut assign(
        @PathVariable Long id,
        @RequestBody Assign input,
        Authentication a
    ) {
        if (
            !List.of("ADMIN", "COORDINATOR").contains(actor(a).getRole())
        ) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        Org o = org(a);
        Workshop w = workshops
            .findByIdAndOrgId(id, o.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Instructor i = instructors
            .findByIdAndOrgId(input.instructorId(), o.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!w.getActive() || !i.isActive()) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Oficina ou instrutor inativo."
        );
        if (
            assignments.existsByWorkshopIdAndInstructorIdAndOrgId(id, i.getId(), o.getId())
        ) throw new ResponseStatusException(HttpStatus.CONFLICT, "Instrutor já designado");
        WorkshopInstructor assignment = assignments.save(new WorkshopInstructor(o, w, i));
        return new WorkshopInstructorOut(
            assignment.getId(),
            new InstructorOut(i.getId(), i.getName(), i.getArea(), i.getContact(), i.isActive())
        );
    }

    @GetMapping("/reports/summary")
    public Map<String, Object> summary(Authentication a) {
        Org o = org(a);
        List<Expense> rows = expenses.findByOrgId(o.getId());
        BigDecimal spent = rows
            .stream()
            .filter(e -> "APPROVED".equals(e.getStatus()))
            .map(e -> e.getAmount())
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return Map.of(
            "workshops",
            workshops.findByOrgId(o.getId()).size(),
            "participants",
            students.findByOrgId(o.getId()).size(),
            "projects",
            projects.findByOrgId(o.getId()).size(),
            "expenses",
            rows.size(),
            "approvedExpenses",
            spent,
            "pendingExpenses",
            rows
                .stream()
                .filter(e -> "PENDING".equals(e.getStatus()))
                .count()
        );
    }

    @GetMapping(value = "/reports/expenses.csv", produces = "text/csv;charset=UTF-8")
    public org.springframework.http.ResponseEntity<String> expenseCsv(Authentication a) {
        StringBuilder csv = new StringBuilder(
            "\ufeffdata,projeto,fonte,categoria,descricao,valor,status,comprovante\n"
        );
        for (Expense e : expenses.findByOrgId(org(a).getId())) {
            csv.append(csv(e.getExpenseDate() == null ? "" : e.getExpenseDate().toString()))
                .append(',')
                .append(csv(e.getProject() == null ? "" : e.getProject().getName()))
                .append(',')
                .append(csv(e.getProject() == null ? "" : e.getProject().getFunder()))
                .append(',')
                .append(csv(e.getCategory()))
                .append(',')
                .append(csv(e.getDescription()))
                .append(',')
                .append(e.getAmount())
                .append(',')
                .append(csv(e.getStatus()))
                .append(',')
                .append(csv(e.getDocumentName()))
                .append('\n');
        }
        return org.springframework.http.ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=despesas.csv")
            .body(csv.toString());
    }

    public String csv(String value) {
        return "\"" + (value == null ? "" : value.replace("\"", "\"\"")) + "\"";
    }
}
