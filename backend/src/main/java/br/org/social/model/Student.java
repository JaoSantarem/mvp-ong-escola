package br.org.social.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.LocalDate;

@com.fasterxml.jackson.annotation.JsonAutoDetect(
    getterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE,
    isGetterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE
)
@Entity
public class Student {

    private Boolean active;

    public boolean isActive() {
        return !Boolean.FALSE.equals(active);
    }

    public void setActive(boolean value) {
        active = value;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Org org;

    @Column(nullable = false)
    private String name;

    private LocalDate birthDate;
    private String responsibleName;
    private boolean imageConsent;

    protected Student() {}

    public Student(Org o, String n, LocalDate b, String r, boolean c) {
        org = o;
        name = n;
        birthDate = b;
        responsibleName = r;
        imageConsent = c;
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

    public String getName() {
        return name;
    }

    public void setName(String value) {
        this.name = value;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate value) {
        this.birthDate = value;
    }

    public String getResponsibleName() {
        return responsibleName;
    }

    public void setResponsibleName(String value) {
        this.responsibleName = value;
    }

    public boolean getImageConsent() {
        return imageConsent;
    }

    public void setImageConsent(boolean value) {
        this.imageConsent = value;
    }
}
