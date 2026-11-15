package br.org.social.repository;

import br.org.social.model.PedagogicalNote;

public interface PedagogicalNoteRepository
    extends org.springframework.data.jpa.repository.JpaRepository<PedagogicalNote, Long>
{
    public java.util.List<PedagogicalNote> findByMeetingIdAndOrgId(Long meetingId, Long org);
}
