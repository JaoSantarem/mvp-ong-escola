package br.org.social;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Entity
class Instructor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    Org org;

    String name, area, contact;

    protected Instructor() {}

    Instructor(Org o, String n, String a, String c) {
        org = o;
        name = n;
        area = a;
        contact = c;
    }
}
