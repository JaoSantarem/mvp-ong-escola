package br.org.social.repository;

import br.org.social.model.Instructor;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorRepository extends JpaRepository<Instructor, Long> {
    public List<Instructor> findByOrgId(Long org);
    public Optional<Instructor> findByIdAndOrgId(Long id, Long org);
}
