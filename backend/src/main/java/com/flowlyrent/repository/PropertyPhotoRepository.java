package com.flowlyrent.repository;

import com.flowlyrent.model.PropertyPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface PropertyPhotoRepository extends JpaRepository<PropertyPhoto, Long> {

    List<PropertyPhoto> findByPropertyConfigIdOrderByUploadedAtAsc(Long propertyConfigId);

    @Modifying
    @Transactional
    @Query("DELETE FROM PropertyPhoto p WHERE p.propertyConfig.id = :configId")
    void deleteByPropertyConfigId(Long configId);
}
