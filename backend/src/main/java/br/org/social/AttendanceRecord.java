package br.org.social;

import jakarta.persistence.*;
import java.time.*;

@Entity
class AttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    Org org;

    @ManyToOne(optional = false)
    ClassMeeting meeting;

    @ManyToOne(optional = false)
    Student student;

    boolean present;

    protected AttendanceRecord() {}

    AttendanceRecord(Org o, ClassMeeting m, Student s, boolean p) {
        org = o;
        meeting = m;
        student = s;
        present = p;
    }
}
