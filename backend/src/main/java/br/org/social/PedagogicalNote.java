package br.org.social;

import jakarta.persistence.*;
import java.time.*;

@Entity
class PedagogicalNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    Org org;

    @ManyToOne(optional = false)
    ClassMeeting meeting;

    String author;

    @Column(length = 5000)
    String text;

    protected PedagogicalNote() {}

    PedagogicalNote(Org o, ClassMeeting m, String a, String t) {
        org = o;
        meeting = m;
        author = a;
        text = t;
    }
}
