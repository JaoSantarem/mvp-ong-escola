package br.org.social;

import java.time.*;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
class DemoAccessApi {

    private final Members members;
    private final Orgs orgs;
    private final ApiTokens tokens;
    private final PasswordEncoder encoder;
    private final boolean enabled;

    DemoAccessApi(
        Members m,
        Orgs o,
        ApiTokens t,
        PasswordEncoder e,
        @Value("${app.demo.enabled:false}") boolean enabled
    ) {
        members = m;
        orgs = o;
        tokens = t;
        encoder = e;
        this.enabled = enabled;
    }

    @PostMapping("/api/auth/demo")
    @Transactional
    public synchronized Map<String, Object> enter() {
        if (!enabled) return Map.of("enabled", false);
        Member member = members.findByLogin("demo-local").orElseGet(() -> {
            Org org = orgs.save(new Org("ONG Demonstração", "ONG"));
            Member m = new Member(
                org,
                "demo-local",
                "demo-local@example.invalid",
                encoder.encode(TokenSecurity.newToken()),
                "ADMIN"
            );
            m.name = "Usuário de teste";
            return members.save(m);
        });
        Instant now = Instant.now();
        tokens.deleteByExpiresAtBefore(now);
        String raw = TokenSecurity.newToken();
        tokens.save(new ApiToken(member, TokenSecurity.hash(raw), now.plus(Duration.ofHours(12))));
        return Map.of("enabled", true, "accessToken", raw);
    }
}
