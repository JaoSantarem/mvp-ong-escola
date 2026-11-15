package br.org.social;

import jakarta.persistence.*;
import java.time.*;

@Entity
class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    Org org;

    @Column(nullable = false)
    String name;

    LocalDate birthDate;
    String responsibleName;
    boolean imageConsent;

    protected Student() {}

    Student(Org o, String n, LocalDate b, String r, boolean c) {
        org = o;
        name = n;
        birthDate = b;
        responsibleName = r;
        imageConsent = c;
    }
}
