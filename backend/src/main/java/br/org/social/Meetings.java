package br.org.social;

import jakarta.persistence.*;
import java.time.*;

interface Meetings
    extends org.springframework.data.jpa.repository.JpaRepository<ClassMeeting, Long>
{
    java.util.List<ClassMeeting> findByWorkshopIdAndOrgId(Long workshopId, Long org);
    java.util.Optional<ClassMeeting> findByIdAndOrgId(Long id, Long org);
}
