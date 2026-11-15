package br.org.social.controller;

import br.org.social.model.Income;
import br.org.social.model.Member;
import br.org.social.repository.IncomeRepository;
import br.org.social.repository.MemberRepository;
import br.org.social.repository.ProjectRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/incomes")
public class IncomeController {

    final IncomeRepository incomes;
    final MemberRepository members;
    final ProjectRepository projects;

    public IncomeController(IncomeRepository i, MemberRepository m, ProjectRepository p) {
        incomes = i;
        members = m;
        projects = p;
    }

    public record Input(
        String type,
        String description,
        String source,
        BigDecimal amount,
        LocalDate receivedDate,
        Long projectId
    ) {}

    public record Output(
        Long id,
        String type,
        String description,
        String source,
        BigDecimal amount,
        LocalDate receivedDate,
        Long projectId,
        String projectName
    ) {}

    public Member actor(Authentication a) {
        return members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow();
    }

    public Output output(Income i) {
        return new Output(
            i.getId(),
            i.getType(),
            i.getDescription(),
            i.getSource(),
            i.getAmount(),
            i.getReceivedDate(),
            i.getProject() == null ? null : i.getProject().getId(),
            i.getProject() == null ? null : i.getProject().getName()
        );
    }

    @GetMapping
    public List<Output> list(Authentication a) {
        return incomes
            .findByOrgIdOrderByReceivedDateDescIdDesc(actor(a).getOrg().getId())
            .stream()
            .map(this::output)
            .toList();
    }

    @PostMapping
    public Output add(@RequestBody Input in, Authentication a) {
        Member m = actor(a);
        if (
            !List.of("ADMIN", "COORDINATOR").contains(m.getRole())
        ) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (
            in.type() == null ||
            !List.of("DONATION", "CASH_IN").contains(in.type()) ||
            in.description() == null ||
            in.description().isBlank() ||
            in.receivedDate() == null ||
            in.amount() == null ||
            in.amount().signum() <= 0 ||
            in.amount().scale() > 2 ||
            in.amount().compareTo(new BigDecimal("9999999999999.99")) > 0
        ) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Informe tipo, descrição, data e valor positivo com até duas casas decimais"
        );
        Income i = new Income();
        i.setOrg(m.getOrg());
        i.setType(in.type());
        i.setDescription(in.description().trim());
        i.setSource(in.source() == null ? "" : in.source().trim());
        i.setAmount(in.amount());
        i.setReceivedDate(in.receivedDate());
        i.setProject(
            in.projectId() == null
                ? null
                : projects
                      .findByIdAndOrgId(in.projectId(), m.getOrg().getId())
                      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND))
        );
        return output(incomes.save(i));
    }
}
