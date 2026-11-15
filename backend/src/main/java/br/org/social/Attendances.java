package br.org.social;

import jakarta.persistence.*;
import java.time.*;

interface Attendances
    extends org.springframework.data.jpa.repository.JpaRepository<AttendanceRecord, Long>
{
    java.util.List<AttendanceRecord> findByMeetingIdAndOrgId(Long meetingId, Long org);
    java.util.Optional<AttendanceRecord> findByMeetingIdAndStudentIdAndOrgId(
        Long meetingId,
        Long studentId,
        Long org
    );
}
