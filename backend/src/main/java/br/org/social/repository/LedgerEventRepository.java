package br.org.social.repository;

import br.org.social.model.LedgerEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerEventRepository extends JpaRepository<LedgerEvent, Long> {
    List<LedgerEvent> findByOrgIdOrderById(Long orgId);
    List<LedgerEvent> findByOrgIdAndKindAndRecordIdOrderById(
        Long orgId,
        String kind,
        Long recordId
    );
}
