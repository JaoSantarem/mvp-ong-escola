package br.org.social.repository;

import br.org.social.model.Member;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberDirectoryRepository extends JpaRepository<Member, Long> {
    public List<Member> findByOrgId(Long org);
    public Optional<Member> findByIdAndOrgId(Long id, Long org);
}
