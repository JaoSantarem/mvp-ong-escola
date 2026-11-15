package br.org.social.repository;

import br.org.social.model.LedgerAttachment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerAttachmentRepository extends JpaRepository<LedgerAttachment, Long> {
    public List<LedgerAttachment> findByOrgId(Long id);
    public Optional<LedgerAttachment> findByIdAndOrgId(Long id, Long org);
}
