package br.org.social.repository;

import br.org.social.model.LedgerPersonLink;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerPersonLinkRepository extends JpaRepository<LedgerPersonLink, Long> {
    List<LedgerPersonLink> findByOrgId(Long orgId);
}
