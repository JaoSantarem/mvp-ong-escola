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
class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @ManyToOne
    Org org;

    @ManyToOne
    OrgPosition position;

    String name;

    @Column(unique = true)
    String email;

    @Column(unique = true)
    String login;

    String hash, role;
    boolean passwordSetupRequired;
    String setupTokenHash;
    Instant setupTokenExpiresAt;

    protected Member() {}

    Member(Org o, String e, String h) {
        this(o, e, e, h, "ADMIN");
    }

    Member(Org o, String e, String h, String r) {
        this(o, e, e, h, r);
    }

    Member(Org o, String l, String e, String h, String r) {
        org = o;
        login = l;
        email = e;
        hash = h;
        role = r;
    }
}
