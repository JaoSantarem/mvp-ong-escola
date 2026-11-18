package br.org.social.model;

import jakarta.persistence.*;

@Entity
public class LedgerPersonLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Long orgId;
    public String kind;
    public Long recordId;
    public String personType;
    public Long personId;
    public String name;
}
