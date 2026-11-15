package br.org.social.repository;

import br.org.social.model.Enrollment;

public interface EnrollmentRepository
    extends org.springframework.data.jpa.repository.JpaRepository<Enrollment, Long>
{
    public java.util.List<Enrollment> findByWorkshopIdAndOrgId(Long workshopId, Long org);
    public boolean existsByWorkshopIdAndStudentIdAndOrgId(Long w, Long s, Long org);
}
