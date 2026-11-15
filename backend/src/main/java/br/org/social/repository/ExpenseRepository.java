package br.org.social.repository;

import br.org.social.model.Expense;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    public List<Expense> findByOrgId(Long id);
    public Optional<Expense> findByIdAndOrgId(Long id, Long org);
}
