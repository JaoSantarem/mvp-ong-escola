package br.org.social.controller;

import br.org.social.model.*;
import br.org.social.repository.*;
import br.org.social.service.LedgerFiles;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ledger")
public class FinancialActions {

    final OrganizationFinanceController organization;
    final IncomeRepository incomes;
    final ExpenseRepository expenses;
    final LedgerEventRepository events;
    final LedgerFiles files;

    public FinancialActions(
        OrganizationFinanceController organization,
        IncomeRepository incomes,
        ExpenseRepository expenses,
        LedgerEventRepository events,
        LedgerFiles files
    ) {
        this.organization = organization;
        this.incomes = incomes;
        this.expenses = expenses;
        this.events = events;
        this.files = files;
    }

    public record Change(
        String action,
        Long revision,
        BigDecimal amount,
        LocalDate date,
        String accountName,
        String method,
        String reason,
        Long eventId,
        String description,
        LocalDate dueDate,
        String counterparty
    ) {}

    static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    static boolean validMoney(BigDecimal value) {
        return (
            value != null &&
            value.signum() > 0 &&
            value.scale() <= 2 &&
            value.compareTo(new BigDecimal("9999999999999.99")) <= 0
        );
    }

    static String required(String value, String label) {
        if (value == null || value.isBlank() || value.trim().length() > 255) throw invalid(
            "Confira o campo " + label + " (até 255 caracteres)."
        );
        return value.trim();
    }

    static BigDecimal settled(List<LedgerEvent> history) {
        return history
            .stream()
            .filter(e -> e.amount != null)
            .map(e -> e.amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    static boolean isLegacy(FinancialEntry entry) {
        return entry instanceof Income i && i.getStatus() == null && i.getReceivedDate() != null;
    }

    static LedgerEvent legacyReceipt(Income income) {
        LedgerEvent event = new LedgerEvent(
            income.getOrg().getId(),
            income.getType(),
            income.getId(),
            "SETTLE",
            null
        );
        event.recordedAt = null;
        event.movementDate = income.getReceivedDate();
        event.amount = income.getAmount();
        event.note = "Recebimento do cadastro anterior";
        return event;
    }

    static long revision(List<LedgerEvent> history) {
        return history.isEmpty() ? 0 : history.get(history.size() - 1).id;
    }

    static void describe(Map<String, Object> row, FinancialEntry entry, List<LedgerEvent> stored) {
        List<LedgerEvent> history = isLegacy(entry)
            ? List.of(legacyReceipt((Income) entry))
            : stored;
        BigDecimal paid = settled(history);
        BigDecimal remaining = entry.getAmount().subtract(paid);
        String status = entry.getStatus();
        if (paid.signum() > 0) status =
            remaining.signum() == 0 ? (entry instanceof Expense ? "PAID" : "RECEIVED") : "PARTIAL";
        boolean closed = "CANCELLED".equals(status) || "REJECTED".equals(status);
        row.put("status", status);
        row.put("history", history);
        row.put("revision", revision(stored));
        row.put("settledAmount", paid);
        row.put("openAmount", closed ? BigDecimal.ZERO : remaining);
        row.put("dueDate", entry.dueDate);
        row.put("beneficiary", entry.beneficiary);
        row.put("reimbursementTo", entry.reimbursementTo);
        row.put(
            "lastMovement",
            history
                .stream()
                .map(e -> e.movementDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null)
        );
        row.put(
            "overdue",
            !closed &&
                remaining.signum() > 0 &&
                entry.dueDate != null &&
                entry.dueDate.isBefore(LocalDate.now())
        );
    }

    @PostMapping("/{kind}/{id}/actions")
    @Transactional(
        rollbackFor = Exception.class,
        isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED
    )
    public Map<String, Object> change(
        @PathVariable String kind,
        @PathVariable Long id,
        @RequestPart("data") Change change,
        @RequestPart(value = "file", required = false) MultipartFile file,
        Authentication auth
    ) throws Exception {
        organization.manager(auth);
        Long org = organization.tenant(auth).getId();
        boolean expense = "EXPENSE".equals(kind);
        FinancialEntry entry;
        if (expense) entry = expenses
            .lockEntry(id, org)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        else entry = incomes
            .lockEntry(id, org)
            .filter(i -> kind.equals(i.getType()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        List<LedgerEvent> history = events.findByOrgIdAndKindAndRecordIdOrderById(org, kind, id);
        if (!Objects.equals(change.revision(), revision(history))) throw conflict(
            "O lançamento mudou. Reabra os detalhes para conferir o saldo."
        );
        if ("CANCELLED".equals(entry.getStatus())) throw conflict(
            "Este lançamento está cancelado."
        );
        String action = Objects.toString(change.action(), "");
        LedgerEvent event = new LedgerEvent(org, kind, id, action, auth.getName());
        Long reversedId = change.eventId();
        if (isLegacy(entry)) {
            Income income = (Income) entry;
            var original = events.save(legacyReceipt(income));
            income.entryDate = income.getReceivedDate();
            income.setStatus("RECEIVED");
            history.add(original);
            if (Objects.equals(reversedId, 0L)) reversedId = original.id;
        }
        if (!"SETTLE".equals(action) && file != null) throw invalid(
            "O comprovante deve acompanhar uma baixa."
        );
        BigDecimal paid = settled(history);
        BigDecimal remaining = entry.getAmount().subtract(paid);
        switch (action) {
            case "SETTLE" -> {
                if (expense && !"APPROVED".equals(entry.getStatus())) throw conflict(
                    "A despesa precisa estar aprovada para registrar o pagamento."
                );
                if (
                    !validMoney(change.amount()) || change.amount().compareTo(remaining) > 0
                ) throw invalid("O valor deve ser positivo e não pode superar o saldo em aberto.");
                event.movementDate = movementDate(change.date());
                event.amount = change.amount();
                event.accountName = required(change.accountName(), "conta ou caixa");
                event.method = required(change.method(), "forma de movimentação");
            }
            case "REVERSE" -> {
                Long target = reversedId;
                LedgerEvent original = history
                    .stream()
                    .filter(e -> "SETTLE".equals(e.action) && e.id.equals(target))
                    .findFirst()
                    .orElseThrow(() -> invalid("Selecione uma baixa deste lançamento."));
                if (
                    history.stream().anyMatch(e -> Objects.equals(e.reversesId, original.id))
                ) throw conflict("Esta baixa já foi estornada.");
                event.movementDate = movementDate(change.date());
                if (event.movementDate.isBefore(original.movementDate)) throw invalid(
                    "O estorno deve ocorrer a partir da data da baixa."
                );
                event.reversesId = original.id;
                event.amount = original.amount.negate();
                event.accountName = original.accountName;
                event.method = original.method;
                event.note = required(change.reason(), "motivo do estorno");
            }
            case "CANCEL" -> {
                if (paid.signum() != 0) throw conflict("Estorne as baixas antes de cancelar.");
                event.note = required(change.reason(), "motivo do cancelamento");
                entry.setStatus("CANCELLED");
            }
            case "CORRECT" -> {
                if (paid.signum() != 0) throw conflict(
                    "Estorne as baixas antes de corrigir os dados."
                );
                if (!validMoney(change.amount()) || change.dueDate() == null) throw invalid(
                    "Informe um valor e um vencimento válidos."
                );
                String description = required(change.description(), "descrição");
                String counterparty = Objects.toString(change.counterparty(), "").trim();
                if (counterparty.length() > 255) throw invalid(
                    "Informe um nome de até 255 caracteres."
                );
                String previousParty =
                    entry instanceof Income i ? i.getSource() : entry.beneficiary;
                event.note =
                    required(change.reason(), "motivo da correção") +
                    " · Dados anteriores: " +
                    entry.getDescription() +
                    " · " +
                    entry.getAmount() +
                    " · " +
                    Objects.toString(entry.dueDate, "sem vencimento") +
                    " · " +
                    Objects.toString(previousParty, "");
                entry.setDescription(description);
                entry.setAmount(change.amount());
                entry.dueDate = change.dueDate();
                if (entry instanceof Expense e) {
                    e.beneficiary = counterparty;
                    e.setApprovedBy(null);
                    e.setStatus("PENDING");
                } else ((Income) entry).setSource(counterparty);
            }
            default -> throw invalid("Ação financeira inválida.");
        }
        events.save(event);
        if (file != null) files.save(org, kind, id, event.id, List.of(file));
        if (entry instanceof Income i && event.amount != null) {
            boolean complete = paid.add(event.amount).compareTo(entry.getAmount()) == 0;
            i.setStatus(complete ? "RECEIVED" : "EXPECTED");
            LocalDate latest = event.movementDate;
            for (LedgerEvent past : history)
                if (past.movementDate != null && past.movementDate.isAfter(latest)) latest =
                    past.movementDate;
            i.setReceivedDate(complete ? latest : null);
        }
        return Map.of("id", id, "revision", event.id);
    }

    static LocalDate movementDate(LocalDate date) {
        if (date == null || date.isAfter(LocalDate.now())) throw invalid(
            "Informe a data efetiva até hoje."
        );
        return date;
    }
}
