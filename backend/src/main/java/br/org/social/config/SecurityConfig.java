package br.org.social.config;

import br.org.social.repository.ApiTokenRepository;
import br.org.social.security.BearerTokenFilter;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(
        SecurityConfig.class
    );

    @Bean
    public PasswordEncoder encoder() {
        return new BCryptPasswordEncoder();
    }

    @org.springframework.core.annotation.Order(2)
    @Bean
    public SecurityFilterChain filter(
        HttpSecurity h,
        ApiTokenRepository tokens,
        @org.springframework.beans.factory.annotation.Value(
            "${app.cors.allowed-origins:http://localhost:5173,https://mvp-ong-escola.onrender.com}"
        ) String allowedOrigins
    ) throws Exception {
        return h
            .csrf(c -> c.disable())
            .cors(c ->
                c.configurationSource(r -> {
                    var x = new org.springframework.web.cors.CorsConfiguration();
                    x.setAllowedOrigins(
                        Arrays.stream(allowedOrigins.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList()
                    );
                    x.setAllowedMethods(
                        List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    );
                    x.setAllowedHeaders(List.of("*"));
                    return x;
                })
            )
            .sessionManagement(s ->
                s.sessionCreationPolicy(
                    org.springframework.security.config.http.SessionCreationPolicy.STATELESS
                )
            )
            .requestCache(c -> c.disable())
            .authorizeHttpRequests(a ->
                a
                    .requestMatchers(
                        "/error",
                        "/api/setup",
                        "/api/auth/login",
                        "/api/auth/demo",
                        "/api/auth/password-setup/**",
                        "/api/health",
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**"
                    )
                    .permitAll()
                    .anyRequest()
                    .authenticated()
            )
            .httpBasic(b -> b.disable())
            .formLogin(f -> f.disable())
            .exceptionHandling(e ->
                e.authenticationEntryPoint((request, response, exception) -> {
                    log.warn(
                        "auth_rejected method={} path={} bearerHeaderPresent={}",
                        request.getMethod(),
                        request.getRequestURI(),
                        request.getHeader("Authorization") != null
                    );
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response
                        .getWriter()
                        .write(
                            "{\"error\":\"Sessão inválida ou expirada. Faça login novamente.\"}"
                        );
                })
            )
            .addFilterBefore(
                new BearerTokenFilter(tokens),
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class
            )
            .build();
    }
}
