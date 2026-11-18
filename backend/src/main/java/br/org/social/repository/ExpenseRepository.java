package br.org.social.repository;

import br.org.social.model.Expense;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    @org.springframework.data.jpa.repository.Lock(
        jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
    )
    @org.springframework.data.jpa.repository.Query(
        "select e from Expense e where e.id = :id and e.org.id = :org"
    )
    java.util.Optional<Expense> lockEntry(Long id, Long org);

    public List<Expense> findByOrgId(Long id);
    public Optional<Expense> findByIdAndOrgId(Long id, Long org);
}
