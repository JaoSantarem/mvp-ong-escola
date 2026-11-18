package br.org.social.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@com.fasterxml.jackson.annotation.JsonAutoDetect(
    getterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE,
    isGetterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE
)
@Entity
public class Instructor {

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

    private String name, area, contact;

    protected Instructor() {}

    public Instructor(Org o, String n, String a, String c) {
        org = o;
        name = n;
        area = a;
        contact = c;
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

    public String getArea() {
        return area;
    }

    public void setArea(String value) {
        this.area = value;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String value) {
        this.contact = value;
    }
}
