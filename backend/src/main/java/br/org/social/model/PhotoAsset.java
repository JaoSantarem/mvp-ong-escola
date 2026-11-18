package br.org.social.model;

import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(indexes = @Index(name = "photo_owner_idx", columnList = "orgId,ownerType,ownerId"))
public class PhotoAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Long orgId;

    @Column(nullable = false, length = 20)
    public String ownerType;

    public Long ownerId;

    @Column(nullable = false, length = 80)
    public String storageName;

    @Column(length = 255)
    public String fileName;

    @Column(length = 50)
    public String contentType;

    @Column(length = 500)
    public String caption;

    public LocalDate photoDate;
    public Instant uploadedAt;
}
