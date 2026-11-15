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
class WorkshopInstructor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne(optional = false)
    Org org;

    @ManyToOne(optional = false)
    Workshop workshop;

    @ManyToOne(optional = false)
    Instructor instructor;

    protected WorkshopInstructor() {}

    WorkshopInstructor(Org o, Workshop w, Instructor i) {
        org = o;
        workshop = w;
        instructor = i;
    }
}
