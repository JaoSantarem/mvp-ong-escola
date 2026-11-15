package br.org.social;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/incomes")
class IncomeApi {

    final Incomes incomes;
    final Members members;
    final Projects projects;

    IncomeApi(Incomes i, Members m, Projects p) {
        incomes = i;
        members = m;
        projects = p;
    }

    record Input(
        String type,
        String description,
        String source,
        BigDecimal amount,
        LocalDate receivedDate,
        Long projectId
    ) {}

    record Output(
        Long id,
        String type,
        String description,
        String source,
        BigDecimal amount,
        LocalDate receivedDate,
        Long projectId,
        String projectName
    ) {}

    Member actor(Authentication a) {
        return members.findByEmailOrLogin(a.getName(), a.getName()).orElseThrow();
    }

    Output output(Income i) {
        return new Output(
            i.id,
            i.type,
            i.description,
            i.source,
            i.amount,
            i.receivedDate,
            i.project == null ? null : i.project.id,
            i.project == null ? null : i.project.name
        );
    }

    @GetMapping
    List<Output> list(Authentication a) {
        return incomes
            .findByOrgIdOrderByReceivedDateDescIdDesc(actor(a).org.id)
            .stream()
            .map(this::output)
            .toList();
    }

    @PostMapping
    Output add(@RequestBody Input in, Authentication a) {
        Member m = actor(a);
        if (!List.of("ADMIN", "COORDINATOR").contains(m.role)) throw new ResponseStatusException(
            HttpStatus.FORBIDDEN
        );
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
        i.org = m.org;
        i.type = in.type();
        i.description = in.description().trim();
        i.source = in.source() == null ? "" : in.source().trim();
        i.amount = in.amount();
        i.receivedDate = in.receivedDate();
        i.project =
            in.projectId() == null
                ? null
                : projects
                      .findByIdAndOrgId(in.projectId(), m.org.id)
                      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return output(incomes.save(i));
    }
}
