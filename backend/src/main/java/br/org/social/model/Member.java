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
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Org org;

    @ManyToOne
    private OrgPosition position;

    private String name;

    @Column(unique = true)
    private String email;

    @Column(unique = true)
    private String login;

    private String hash, role;
    private boolean passwordSetupRequired;
    private String setupTokenHash;
    private Instant setupTokenExpiresAt;

    protected Member() {}

    public Member(Org o, String e, String h) {
        this(o, e, e, h, "ADMIN");
    }

    public Member(Org o, String e, String h, String r) {
        this(o, e, e, h, r);
    }

    public Member(Org o, String l, String e, String h, String r) {
        org = o;
        login = l;
        email = e;
        hash = h;
        role = r;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long value) {
        this.id = value;
    }

    public Org getOrg() {
        return org;
    }

    public void setOrg(Org value) {
        this.org = value;
    }

    public OrgPosition getPosition() {
        return position;
    }

    public void setPosition(OrgPosition value) {
        this.position = value;
    }

    public String getName() {
        return name;
    }

    public void setName(String value) {
        this.name = value;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String value) {
        this.email = value;
    }

    public String getLogin() {
        return login;
    }

    public void setLogin(String value) {
        this.login = value;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String value) {
        this.hash = value;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String value) {
        this.role = value;
    }

    public boolean getPasswordSetupRequired() {
        return passwordSetupRequired;
    }

    public void setPasswordSetupRequired(boolean value) {
        this.passwordSetupRequired = value;
    }

    public String getSetupTokenHash() {
        return setupTokenHash;
    }

    public void setSetupTokenHash(String value) {
        this.setupTokenHash = value;
    }

    public Instant getSetupTokenExpiresAt() {
        return setupTokenExpiresAt;
    }

    public void setSetupTokenExpiresAt(Instant value) {
        this.setupTokenExpiresAt = value;
    }
}
