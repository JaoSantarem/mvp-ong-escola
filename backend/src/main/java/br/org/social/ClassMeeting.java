package br.org.social;

import jakarta.persistence.*;
import java.time.*;

@Entity
class ClassMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    Org org;

    @ManyToOne(optional = false)
    Workshop workshop;

    @Column(nullable = false)
    LocalDate meetingDate;

    java.time.LocalTime startTime, endTime;
    Boolean customRoster;
    String topic;

    protected ClassMeeting() {}

    ClassMeeting(Org o, Workshop w, LocalDate d, String t) {
        org = o;
        workshop = w;
        meetingDate = d;
        topic = t;
    }
}
