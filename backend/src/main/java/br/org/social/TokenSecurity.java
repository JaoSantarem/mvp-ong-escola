package br.org.social;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.persistence.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Entity
class ApiToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @ManyToOne(optional = false) Member member;
    @Column(unique = true, nullable = false, length = 64) String tokenHash;
    @Column(nullable = false) Instant expiresAt;

    protected ApiToken() {}
    ApiToken(Member member, String tokenHash, Instant expiresAt) {
        this.member = member;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }
}

interface ApiTokens extends JpaRepository<ApiToken, Long> {
    Optional<ApiToken> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);
    void deleteByExpiresAtBefore(Instant now);
    void deleteByTokenHash(String tokenHash);
}

final class TokenSecurity {
    private TokenSecurity() {}

    static String newToken() {
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}

class BearerTokenFilter extends OncePerRequestFilter {
    private final ApiTokens tokens;

    BearerTokenFilter(ApiTokens tokens) { this.tokens = tokens; }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/api/auth/login") || path.startsWith("/api/auth/password-setup") || path.equals("/api/health")
                || path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String rawToken = header.substring(7).trim();
        Optional<ApiToken> found = rawToken.isEmpty()
                ? Optional.empty()
                : tokens.findByTokenHashAndExpiresAtAfter(TokenSecurity.hash(rawToken), Instant.now());
        if (found.isEmpty()) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"error\":\"Token inválido ou expirado. Faça login novamente.\"}");
            return;
        }

        Member member = found.get().member;
        String username = member.login == null ? member.email : member.login;
        UserDetails principal = User.withUsername(username).password("").roles(member.role).build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        SecurityContextHolder.setContext(context);
        chain.doFilter(request, response);
    }
}
