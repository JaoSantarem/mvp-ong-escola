package br.org.social.repository;

import br.org.social.model.Income;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncomeRepository extends JpaRepository<Income, Long> {
    public List<Income> findByOrgIdOrderByReceivedDateDescIdDesc(Long id);
}
