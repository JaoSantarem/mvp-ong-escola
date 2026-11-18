package br.org.social.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(indexes = @Index(name = "idx_financial_history", columnList = "orgId,kind,recordId"))
public class LedgerEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "orgId", nullable = false)
    public Long orgId;

    @Column(name = "recordId", nullable = false)
    public Long recordId;

    @Column(nullable = false)
    public String kind;

    @Column(nullable = false)
    public String action;

    public String actor;
    public Instant recordedAt;
    public LocalDate movementDate;

    @Column(precision = 19, scale = 2)
    public BigDecimal amount;

    public String accountName;
    public String method;

    @Column(length = 1500)
    public String note;

    public Long reversesId;

    protected LedgerEvent() {}

    public LedgerEvent(Long org, String kind, Long record, String action, String actor) {
        this.orgId = org;
        this.kind = kind;
        this.recordId = record;
        this.action = action;
        this.actor = actor;
        this.recordedAt = Instant.now();
    }
}
