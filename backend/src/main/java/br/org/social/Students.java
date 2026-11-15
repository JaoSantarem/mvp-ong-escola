package br.org.social;

import jakarta.persistence.*;
import java.time.*;

interface Students extends org.springframework.data.jpa.repository.JpaRepository<Student, Long> {
    java.util.List<Student> findByOrgId(Long id);
    java.util.Optional<Student> findByIdAndOrgId(Long id, Long org);
}
