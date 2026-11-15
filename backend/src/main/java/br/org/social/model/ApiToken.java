package br.org.social.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.Instant;

@com.fasterxml.jackson.annotation.JsonAutoDetect(
    getterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE,
    isGetterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE
)
@Entity
public class ApiToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Member member;

    @Column(unique = true, nullable = false, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    protected ApiToken() {}

    public ApiToken(Member member, String tokenHash, Instant expiresAt) {
        this.setMember(member);
        this.setTokenHash(tokenHash);
        this.setExpiresAt(expiresAt);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long value) {
        this.id = value;
    }

    public Member getMember() {
        return member;
    }

    public void setMember(Member value) {
        this.member = value;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public void setTokenHash(String value) {
        this.tokenHash = value;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant value) {
        this.expiresAt = value;
    }
}
