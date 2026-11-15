package br.org.social.repository;

import br.org.social.model.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    public List<Project> findByOrgId(Long id);
    public Optional<Project> findByIdAndOrgId(Long id, Long org);
}
