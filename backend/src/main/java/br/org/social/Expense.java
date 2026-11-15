package br.org.social;

import jakarta.persistence.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.http.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.*;
import org.springframework.security.crypto.password.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Entity
class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne
    Org org;

    @ManyToOne
    Project project;

    @ManyToOne
    Workshop workshop;

    String description,
        category,
        documentName,
        documentKey,
        status = "PENDING",
        approvedBy;
    BigDecimal amount;
    LocalDate expenseDate;

    protected Expense() {}

    Expense(
        Org o,
        Project p,
        Workshop w,
        String d,
        String c,
        BigDecimal a,
        LocalDate dt,
        String doc
    ) {
        org = o;
        project = p;
        workshop = w;
        description = d;
        category = c;
        amount = a;
        expenseDate = dt;
        documentName = doc;
    }
}
