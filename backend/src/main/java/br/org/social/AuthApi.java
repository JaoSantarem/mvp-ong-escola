package br.org.social;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
class AuthApi {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthApi.class);
    private final Members members;
    private final ApiTokens tokens;
    private final PasswordEncoder passwordEncoder;

    AuthApi(Members members, ApiTokens tokens, PasswordEncoder passwordEncoder) {
        this.members = members;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
    }

    record LoginIn(String identifier, String password) {}
    record SetupCheckIn(String identifier, String setupToken) {}
    record SetPasswordIn(String identifier, String setupToken, String password, String confirmation) {}

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @PostMapping("/password-setup/check")
    ResponseEntity<?> checkPasswordSetup(@RequestBody SetupCheckIn request) {
        Member member = findMember(request.identifier());
        if (member == null || !member.passwordSetupRequired || request.setupToken() == null
                || member.setupTokenHash == null || member.setupTokenExpiresAt == null
                || member.setupTokenExpiresAt.isBefore(Instant.now())
                || !java.security.MessageDigest.isEqual(
                    TokenSecurity.hash(request.setupToken()).getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                    member.setupTokenHash.getBytes(java.nio.charset.StandardCharsets.US_ASCII))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Convite inválido ou expirado. Solicite um novo link ao administrador."));
        }
        return ResponseEntity.ok(Map.of("passwordSetupRequired", true));
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/password-setup")
    ResponseEntity<?> setInitialPassword(@RequestBody SetPasswordIn request) {
        if (request.password() == null || request.password().length() < 10) {
            return ResponseEntity.badRequest().body(Map.of("error", "A senha deve ter pelo menos 10 caracteres."));
        }
        if (!request.password().equals(request.confirmation())) {
            return ResponseEntity.badRequest().body(Map.of("error", "As senhas não coincidem."));
        }
        Member member = findMember(request.identifier());
        if (member == null || !member.passwordSetupRequired || request.setupToken() == null
                || member.setupTokenHash == null || member.setupTokenExpiresAt == null
                || member.setupTokenExpiresAt.isBefore(Instant.now())
                || !java.security.MessageDigest.isEqual(
                    TokenSecurity.hash(request.setupToken()).getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                    member.setupTokenHash.getBytes(java.nio.charset.StandardCharsets.US_ASCII))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Convite inválido ou expirado. Solicite um novo link ao administrador."));
        }
        member.hash = passwordEncoder.encode(request.password());
        member.passwordSetupRequired = false;
        member.setupTokenHash = null;
        member.setupTokenExpiresAt = null;
        members.save(member);
        log.info("initial_password_set memberId={} organizationId={}", member.id, member.org.id);
        return ResponseEntity.noContent().build();
    }

    private Member findMember(String identifier) {
        if (identifier == null || identifier.isBlank()) return null;
        return members.findByEmailOrLogin(identifier.trim(), identifier.trim()).orElse(null);
    }

    @io.swagger.v3.oas.annotations.security.SecurityRequirements
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/login")
    ResponseEntity<?> login(@RequestBody LoginIn request) {
        if (request.identifier() == null || request.identifier().isBlank()
                || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Informe login/e-mail e senha."));
        }

        Member member = members.findByEmailOrLogin(request.identifier().trim(), request.identifier().trim())
                .orElse(null);
        if (member == null || !passwordEncoder.matches(request.password(), member.hash)) {
            log.warn("login_rejected reason=invalid_credentials");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Login/e-mail ou senha incorretos."));
        }

        Instant now = Instant.now();
        tokens.deleteByExpiresAtBefore(now);
        String rawToken = TokenSecurity.newToken();
        Instant expiresAt = now.plus(Duration.ofHours(12));
        tokens.save(new ApiToken(member, TokenSecurity.hash(rawToken), expiresAt));

        String login = member.login == null ? member.email : member.login;
        log.info("login_succeeded memberId={} organizationId={}", member.id, member.org.id);
        return ResponseEntity.ok(Map.of(
                "accessToken", rawToken,
                "tokenType", "Bearer",
                "expiresAt", expiresAt.toString(),
                "profile", Map.of(
                        "organization", member.org.name,
                        "login", login,
                        "email", member.email,
                        "role", member.role
                )
        ));
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String header) {
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7).trim();
            if (!token.isEmpty()) tokens.deleteByTokenHash(TokenSecurity.hash(token));
        }
        return ResponseEntity.noContent().build();
    }
}
