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
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Org org;

    @ManyToOne(optional = false)
    private Workshop workshop;

    @ManyToOne(optional = false)
    private Student student;

    protected Enrollment() {}

    public Enrollment(Org o, Workshop w, Student s) {
        org = o;
        workshop = w;
        student = s;
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

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student value) {
        this.student = value;
    }
}
