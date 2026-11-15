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

interface OrgPositions extends JpaRepository<OrgPosition, Long> {
    List<OrgPosition> findByOrgId(Long org);
    Optional<OrgPosition> findByIdAndOrgId(Long id, Long org);
    Optional<OrgPosition> findByOrgIdAndNameIgnoreCase(Long org, String name);
}
