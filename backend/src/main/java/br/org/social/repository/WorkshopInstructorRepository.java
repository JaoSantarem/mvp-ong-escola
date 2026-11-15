package br.org.social.repository;

import br.org.social.model.WorkshopInstructor;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkshopInstructorRepository extends JpaRepository<WorkshopInstructor, Long> {
    public List<WorkshopInstructor> findByWorkshopIdAndOrgId(Long workshop, Long org);
    public boolean existsByWorkshopIdAndInstructorIdAndOrgId(
        Long workshop,
        Long instructor,
        Long org
    );
}
