package br.org.social;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

interface Incomes extends JpaRepository<Income, Long> {
    List<Income> findByOrgIdOrderByReceivedDateDescIdDesc(Long id);
}
