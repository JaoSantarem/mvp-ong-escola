package br.org.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Entity
class LedgerExtra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    Long orgId;
    String kind;
    Long recordId;

    @Column(length = 5000)
    String observation;
}
