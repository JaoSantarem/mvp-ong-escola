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
public class WorkshopInstructor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Org org;

    @ManyToOne(optional = false)
    private Workshop workshop;

    @ManyToOne(optional = false)
    private Instructor instructor;

    protected WorkshopInstructor() {}

    public WorkshopInstructor(Org o, Workshop w, Instructor i) {
        org = o;
        workshop = w;
        instructor = i;
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

    public Workshop getWorkshop() {
        return workshop;
    }

    public void setWorkshop(Workshop value) {
        this.workshop = value;
    }

    public Instructor getInstructor() {
        return instructor;
    }

    public void setInstructor(Instructor value) {
        this.instructor = value;
    }
}
