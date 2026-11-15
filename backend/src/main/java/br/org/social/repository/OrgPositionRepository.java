package br.org.social.repository;

import br.org.social.model.OrgPosition;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrgPositionRepository extends JpaRepository<OrgPosition, Long> {
    public List<OrgPosition> findByOrgId(Long org);
    public Optional<OrgPosition> findByIdAndOrgId(Long id, Long org);
    public Optional<OrgPosition> findByOrgIdAndNameIgnoreCase(Long org, String name);
}
