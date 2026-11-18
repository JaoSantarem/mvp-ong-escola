package br.org.social.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@com.fasterxml.jackson.annotation.JsonAutoDetect(
    getterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE,
    isGetterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE
)
@Entity
public class LedgerAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orgId;
    private String kind;
    private Long recordId;
    private String name;
    public Long eventId;

    @jakarta.persistence.Column(length = org.hibernate.Length.LONG32)
    private byte[] content;

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

    public String getName() {
        return name;
    }

    public void setName(String value) {
        this.name = value;
    }

    public byte[] getContent() {
        return content;
    }

    public void setContent(byte[] value) {
        this.content = value;
    }
}
