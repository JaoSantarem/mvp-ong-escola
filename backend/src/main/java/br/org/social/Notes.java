package br.org.social;

import jakarta.persistence.*;
import java.time.*;

interface Notes
    extends org.springframework.data.jpa.repository.JpaRepository<PedagogicalNote, Long>
{
    java.util.List<PedagogicalNote> findByMeetingIdAndOrgId(Long meetingId, Long org);
}
