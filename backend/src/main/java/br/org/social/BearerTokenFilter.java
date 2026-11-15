package br.org.social;

import jakarta.persistence.*;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.filter.OncePerRequestFilter;

class BearerTokenFilter extends OncePerRequestFilter {

    private final ApiTokens tokens;

    BearerTokenFilter(ApiTokens tokens) {
        this.tokens = tokens;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return (
            path.equals("/api/setup") ||
            path.equals("/api/auth/demo") ||
            path.equals("/api/auth/login") ||
            path.startsWith("/api/auth/password-setup") ||
            path.equals("/api/health") ||
            path.startsWith("/swagger-ui") ||
            path.startsWith("/v3/api-docs")
        );
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain chain
    ) throws ServletException, IOException {
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
            response
                .getWriter()
                .write("{\"error\":\"Token inválido ou expirado. Faça login novamente.\"}");
            return;
        }

        Member member = found.get().member;
        String username = member.login == null ? member.email : member.login;
        UserDetails principal = User.withUsername(username).password("").roles(member.role).build();
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
        SecurityContextHolder.setContext(context);
        chain.doFilter(request, response);
    }
}
