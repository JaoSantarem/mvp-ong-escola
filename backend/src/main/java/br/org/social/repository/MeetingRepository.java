package br.org.social.repository;

import br.org.social.model.ClassMeeting;

public interface MeetingRepository
    extends org.springframework.data.jpa.repository.JpaRepository<ClassMeeting, Long>
{
    public java.util.List<ClassMeeting> findByWorkshopIdAndOrgId(Long workshopId, Long org);
    public java.util.Optional<ClassMeeting> findByIdAndOrgId(Long id, Long org);

    @org.springframework.data.jpa.repository.Lock(
        jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
    )
    @org.springframework.data.jpa.repository.Query(
        "select m from ClassMeeting m where m.id = :id and m.org.id = :org"
    )
    java.util.Optional<ClassMeeting> lockByIdAndOrgId(
        @org.springframework.data.repository.query.Param("id") Long id,
        @org.springframework.data.repository.query.Param("org") Long org
    );
}
