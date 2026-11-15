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
public class ClassMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Org org;

    @ManyToOne(optional = false)
    private Workshop workshop;

    @Column(nullable = false)
    private LocalDate meetingDate;

    private java.time.LocalTime startTime, endTime;
    private Boolean customRoster;
    private String topic;

    protected ClassMeeting() {}

    public ClassMeeting(Org o, Workshop w, LocalDate d, String t) {
        org = o;
        workshop = w;
        meetingDate = d;
        topic = t;
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

    public LocalDate getMeetingDate() {
        return meetingDate;
    }

    public void setMeetingDate(LocalDate value) {
        this.meetingDate = value;
    }

    public java.time.LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(java.time.LocalTime value) {
        this.startTime = value;
    }

    public java.time.LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(java.time.LocalTime value) {
        this.endTime = value;
    }

    public Boolean getCustomRoster() {
        return customRoster;
    }

    public void setCustomRoster(Boolean value) {
        this.customRoster = value;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String value) {
        this.topic = value;
    }
}
