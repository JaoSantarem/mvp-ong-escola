package br.org.social.repository;

import br.org.social.model.AttendanceRecord;

public interface AttendanceRepository
    extends org.springframework.data.jpa.repository.JpaRepository<AttendanceRecord, Long>
{
    public java.util.List<AttendanceRecord> findByMeetingIdAndOrgId(Long meetingId, Long org);
    public java.util.Optional<AttendanceRecord> findByMeetingIdAndStudentIdAndOrgId(
        Long meetingId,
        Long studentId,
        Long org
    );
}
