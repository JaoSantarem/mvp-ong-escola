package br.org.social.repository;

import br.org.social.model.Workshop;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkshopRepository extends JpaRepository<Workshop, Long> {
    public List<Workshop> findByOrgId(Long id);
    public Optional<Workshop> findByIdAndOrgId(Long id, Long org);
}
