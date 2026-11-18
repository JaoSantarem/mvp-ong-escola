package br.org.social.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.math.BigDecimal;
import java.time.LocalDate;

@com.fasterxml.jackson.annotation.JsonAutoDetect(
    getterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE,
    isGetterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE
)
@Entity
public class Expense extends FinancialEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Org org;

    @ManyToOne
    private Project project;

    @ManyToOne
    private Workshop workshop;

    private String description,
        category,
        documentName,
        documentKey,
        status = "PENDING",
        approvedBy;
    private BigDecimal amount;
    private LocalDate expenseDate;

    protected Expense() {}

    public Expense(
        Org o,
        Project p,
        Workshop w,
        String d,
        String c,
        BigDecimal a,
        LocalDate dt,
        String doc
    ) {
        org = o;
        project = p;
        workshop = w;
        description = d;
        category = c;
        amount = a;
        expenseDate = dt;
        documentName = doc;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long value) {
        this.id = value;
    }

    public Org getOrg() {
        return org;
    }

    public void setOrg(Org value) {
        this.org = value;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project value) {
        this.project = value;
    }

    public Workshop getWorkshop() {
        return workshop;
    }

    public void setWorkshop(Workshop value) {
        this.workshop = value;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String value) {
        this.description = value;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String value) {
        this.category = value;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String value) {
        this.documentName = value;
    }

    public String getDocumentKey() {
        return documentKey;
    }

    public void setDocumentKey(String value) {
        this.documentKey = value;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String value) {
        this.status = value;
    }

    public String getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(String value) {
        this.approvedBy = value;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal value) {
        this.amount = value;
    }

    public LocalDate getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(LocalDate value) {
        this.expenseDate = value;
    }
}
