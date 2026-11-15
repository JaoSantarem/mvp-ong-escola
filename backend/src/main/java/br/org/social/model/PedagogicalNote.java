package br.org.social.model;

import jakarta.persistence.Column;
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
public class PedagogicalNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Org org;

    @ManyToOne(optional = false)
    private ClassMeeting meeting;

    private String author;

    @Column(length = 5000)
    private String text;

    protected PedagogicalNote() {}

    public PedagogicalNote(Org o, ClassMeeting m, String a, String t) {
        org = o;
        meeting = m;
        author = a;
        text = t;
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

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String value) {
        this.author = value;
    }

    public String getText() {
        return text;
    }

    public void setText(String value) {
        this.text = value;
    }
}
