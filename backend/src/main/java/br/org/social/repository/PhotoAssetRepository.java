package br.org.social.repository;

import br.org.social.model.PhotoAsset;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoAssetRepository extends JpaRepository<PhotoAsset, Long> {
    List<PhotoAsset> findByOrgIdAndOwnerTypeAndOwnerIdOrderByPhotoDateDescIdDesc(
        Long orgId,
        String ownerType,
        Long ownerId
    );
    List<PhotoAsset> findByOrgIdAndOwnerTypeOrderByIdDesc(Long orgId, String ownerType);
    Optional<PhotoAsset> findByIdAndOrgId(Long id, Long orgId);
}
