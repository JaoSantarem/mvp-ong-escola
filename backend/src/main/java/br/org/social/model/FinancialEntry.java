package br.org.social.model;

import jakarta.persistence.MappedSuperclass;
import java.math.BigDecimal;
import java.time.LocalDate;

@MappedSuperclass
public abstract class FinancialEntry {

    public LocalDate dueDate;
    public String beneficiary;
    public String reimbursementTo;

    public abstract Long getId();

    public abstract BigDecimal getAmount();

    public abstract void setAmount(BigDecimal amount);

    public abstract String getDescription();

    public abstract void setDescription(String description);

    public abstract String getStatus();

    public abstract void setStatus(String status);
}
