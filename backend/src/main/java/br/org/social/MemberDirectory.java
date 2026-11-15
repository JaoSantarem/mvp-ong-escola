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

interface MemberDirectory extends JpaRepository<Member, Long> {
    List<Member> findByOrgId(Long org);
    Optional<Member> findByIdAndOrgId(Long id, Long org);
}
