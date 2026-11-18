package br.org.social.repository;

import br.org.social.model.LedgerAttachment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerAttachmentRepository extends JpaRepository<LedgerAttachment, Long> {
    interface Metadata {
        Long getId();
        String getKind();
        Long getRecordId();
        String getName();
        Long getEventId();
    }

    @org.springframework.data.jpa.repository.Query(
        "select f.id as id, f.kind as kind, f.recordId as recordId, f.name as name, f.eventId as eventId from LedgerAttachment f where f.orgId=:id order by f.id"
    )
    List<Metadata> listMetadata(Long id);

    public Optional<LedgerAttachment> findByIdAndOrgId(Long id, Long org);
}
