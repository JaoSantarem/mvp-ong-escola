package br.org.social.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@com.fasterxml.jackson.annotation.JsonAutoDetect(
    getterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE,
    isGetterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE
)
@Entity
public class LedgerExtra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;
    private String kind;
    private Long recordId;

    @Column(length = 5000)
    private String observation;

    public Long getId() {
        return id;
    }

    public void setId(Long value) {
        this.id = value;
    }

    public Long getOrgId() {
        return orgId;
    }

    public void setOrgId(Long value) {
        this.orgId = value;
    }

    public String getKind() {
        return kind;
    }

    public void setKind(String value) {
        this.kind = value;
    }

    public Long getRecordId() {
        return recordId;
    }

    public void setRecordId(Long value) {
        this.recordId = value;
    }

    public String getObservation() {
        return observation;
    }

    public void setObservation(String value) {
        this.observation = value;
    }
}
