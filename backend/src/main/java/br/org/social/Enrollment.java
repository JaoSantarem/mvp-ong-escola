package br.org.social;

import jakarta.persistence.*;
import java.time.*;

@Entity
class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    Org org;

    @ManyToOne(optional = false)
    Workshop workshop;

    @ManyToOne(optional = false)
    Student student;

    protected Enrollment() {}

    Enrollment(Org o, Workshop w, Student s) {
        org = o;
        workshop = w;
        student = s;
    }
}
