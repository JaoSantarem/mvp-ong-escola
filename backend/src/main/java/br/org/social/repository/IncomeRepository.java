package br.org.social.repository;

import br.org.social.model.Income;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeRepository extends JpaRepository<Income, Long> {
    @org.springframework.data.jpa.repository.Lock(
        jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
    )
    @org.springframework.data.jpa.repository.Query(
        "select e from Income e where e.id = :id and e.org.id = :org"
    )
    java.util.Optional<Income> lockEntry(Long id, Long org);

    public List<Income> findByOrgIdOrderByReceivedDateDescIdDesc(Long id);
}
