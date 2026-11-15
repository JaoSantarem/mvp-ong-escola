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
public class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Org org;

    @ManyToOne(optional = false)
    private ClassMeeting meeting;

    @ManyToOne(optional = false)
    private Student student;

    private boolean present;

    protected AttendanceRecord() {}

    public AttendanceRecord(Org o, ClassMeeting m, Student s, boolean p) {
        org = o;
        meeting = m;
        student = s;
        present = p;
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

    public ClassMeeting getMeeting() {
        return meeting;
    }

    public void setMeeting(ClassMeeting value) {
        this.meeting = value;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student value) {
        this.student = value;
    }

    public boolean getPresent() {
        return present;
    }

    public void setPresent(boolean value) {
        this.present = value;
    }
}
