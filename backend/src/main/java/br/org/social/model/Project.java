package br.org.social.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.math.BigDecimal;

@com.fasterxml.jackson.annotation.JsonAutoDetect(
    getterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE,
    isGetterVisibility = com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility.NONE
)
@Entity
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Org org;

    private String name, funder;
    private BigDecimal budget;

    protected Project() {}

    public Project(Org o, String n, String f, BigDecimal b) {
        org = o;
        name = n;
        funder = f;
        budget = b;
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

    public String getName() {
        return name;
    }

    public void setName(String value) {
        this.name = value;
    }

    public String getFunder() {
        return funder;
    }

    public void setFunder(String value) {
        this.funder = value;
    }

    public BigDecimal getBudget() {
        return budget;
    }

    public void setBudget(BigDecimal value) {
        this.budget = value;
    }
}
