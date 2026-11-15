package br.org.social;

import jakarta.persistence.*;
import java.time.*;

interface Enrollments
    extends org.springframework.data.jpa.repository.JpaRepository<Enrollment, Long>
{
    java.util.List<Enrollment> findByWorkshopIdAndOrgId(Long workshopId, Long org);
    boolean existsByWorkshopIdAndStudentIdAndOrgId(Long w, Long s, Long org);
}
