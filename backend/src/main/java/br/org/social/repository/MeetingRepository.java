package br.org.social.repository;

import br.org.social.model.ClassMeeting;

public interface MeetingRepository
    extends org.springframework.data.jpa.repository.JpaRepository<ClassMeeting, Long>
{
    public java.util.List<ClassMeeting> findByWorkshopIdAndOrgId(Long workshopId, Long org);
    public java.util.Optional<ClassMeeting> findByIdAndOrgId(Long id, Long org);
}
