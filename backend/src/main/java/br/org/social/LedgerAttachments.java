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

interface LedgerAttachments extends JpaRepository<LedgerAttachment, Long> {
    List<LedgerAttachment> findByOrgId(Long id);
    Optional<LedgerAttachment> findByIdAndOrgId(Long id, Long org);
}
