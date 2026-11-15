package br.org.social.repository;

import br.org.social.model.Member;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
    public Optional<Member> findByEmail(String e);
    public Optional<Member> findByLogin(String login);
    public Optional<Member> findByEmailOrLogin(String email, String login);
}
