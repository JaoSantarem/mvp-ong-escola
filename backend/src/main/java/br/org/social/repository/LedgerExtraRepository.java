package br.org.social.repository;

import br.org.social.model.LedgerExtra;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerExtraRepository extends JpaRepository<LedgerExtra, Long> {
    public List<LedgerExtra> findByOrgId(Long id);
}
