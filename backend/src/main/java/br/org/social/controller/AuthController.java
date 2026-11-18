package br.org.social.controller;

import br.org.social.model.ApiToken;
import br.org.social.model.Member;
import br.org.social.repository.ApiTokenRepository;
import br.org.social.repository.MemberRepository;
import br.org.social.security.TokenSecurity;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(
        AuthController.class
    );
    private final MemberRepository members;
    private final ApiTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;

    public AuthController(
        MemberRepository members,
        ApiTokenRepository tokens,
        PasswordEncoder passwordEncoder
    ) {
        this.members = members;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
    }

    public record LoginIn(String identifier, String password) {}

    public record SetupCheckIn(String identifier, String setupToken) {}

    public record SetPasswordIn(
        String identifier,
        String setupToken,
        String password,
        String confirmation
    ) {}

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @PostMapping("/password-setup/check")
    public ResponseEntity<?> checkPasswordSetup(@RequestBody SetupCheckIn request) {
        Member member = findMember(request.identifier());
        if (
            member == null ||
            !member.getPasswordSetupRequired() ||
            request.setupToken() == null ||
            member.getSetupTokenHash() == null ||
            member.getSetupTokenExpiresAt() == null ||
            member.getSetupTokenExpiresAt().isBefore(Instant.now()) ||
            !java.security.MessageDigest.isEqual(
                TokenSecurity.hash(request.setupToken()).getBytes(
                    java.nio.charset.StandardCharsets.US_ASCII
                ),
                member.getSetupTokenHash().getBytes(java.nio.charset.StandardCharsets.US_ASCII)
            )
        ) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                Map.of(
                    "error",
                    "Convite inválido ou expirado. Solicite um novo link ao administrador."
                )
            );
        }
        return ResponseEntity.ok(Map.of("passwordSetupRequired", true));
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/password-setup")
    public ResponseEntity<?> setInitialPassword(@RequestBody SetPasswordIn request) {
        if (request.password() == null || request.password().length() < 10) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "A senha deve ter pelo menos 10 caracteres.")
            );
        }
        if (!request.password().equals(request.confirmation())) {
            return ResponseEntity.badRequest().body(Map.of("error", "As senhas não coincidem."));
        }
        Member member = findMember(request.identifier());
        if (
            member == null ||
            !member.getPasswordSetupRequired() ||
            request.setupToken() == null ||
            member.getSetupTokenHash() == null ||
            member.getSetupTokenExpiresAt() == null ||
            member.getSetupTokenExpiresAt().isBefore(Instant.now()) ||
            !java.security.MessageDigest.isEqual(
                TokenSecurity.hash(request.setupToken()).getBytes(
                    java.nio.charset.StandardCharsets.US_ASCII
                ),
                member.getSetupTokenHash().getBytes(java.nio.charset.StandardCharsets.US_ASCII)
            )
        ) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                Map.of(
                    "error",
                    "Convite inválido ou expirado. Solicite um novo link ao administrador."
                )
            );
        }
        member.setHash(passwordEncoder.encode(request.password()));
        member.setPasswordSetupRequired(false);
        member.setSetupTokenHash(null);
        member.setSetupTokenExpiresAt(null);
        members.save(member);
        log.info(
            "initial_password_set memberId={} organizationId={}",
            member.getId(),
            member.getOrg().getId()
        );
        return ResponseEntity.noContent().build();
    }

    private Member findMember(String identifier) {
        if (identifier == null || identifier.isBlank()) return null;
        return members.findByEmailOrLogin(identifier.trim(), identifier.trim()).orElse(null);
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginIn request) {
        if (
            request.identifier() == null ||
            request.identifier().isBlank() ||
            request.password() == null ||
            request.password().isBlank()
        ) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "Informe login/e-mail e senha.")
            );
        }

        Member member = members
            .findByEmailOrLogin(request.identifier().trim(), request.identifier().trim())
            .orElse(null);
        if (member == null || !passwordEncoder.matches(request.password(), member.getHash())) {
            log.warn("login_rejected reason=invalid_credentials");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                Map.of("error", "Login/e-mail ou senha incorretos.")
            );
        }

        Instant now = Instant.now();
        tokens.deleteByExpiresAtBefore(now);
        String rawToken = TokenSecurity.newToken();
        Instant expiresAt = now.plus(Duration.ofHours(12));
        tokens.save(new ApiToken(member, TokenSecurity.hash(rawToken), expiresAt));

        String login = member.getLogin() == null ? member.getEmail() : member.getLogin();
        log.info(
            "login_succeeded memberId={} organizationId={}",
            member.getId(),
            member.getOrg().getId()
        );
        return ResponseEntity.ok(
            Map.of(
                "accessToken",
                rawToken,
                "tokenType",
                "Bearer",
                "expiresAt",
                expiresAt.toString(),
                "profile",
                Map.of(
                    "organization",
                    member.getOrg().getName(),
                    "login",
                    login,
                    "email",
                    member.getEmail(),
                    "role",
                    member.getRole()
                )
            )
        );
    }

    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @RequestHeader(value = "Authorization", required = false) String header
    ) {
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            if (!token.isEmpty()) tokens.deleteByTokenHash(TokenSecurity.hash(token));
        }
        return ResponseEntity.noContent().build();
    }
}
