package br.org.social.repository;

import br.org.social.model.ApiToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApiTokenRepository extends JpaRepository<ApiToken, Long> {
    public Optional<ApiToken> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);
    public void deleteByExpiresAtBefore(Instant now);
    public void deleteByTokenHash(String tokenHash);
}
