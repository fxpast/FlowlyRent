package com.flowlyrent.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public Map<?, ?> uploadBase64(String base64Data, String folder) throws IOException {
        return cloudinary.uploader().upload(base64Data, ObjectUtils.asMap(
            "folder",        folder,
            "resource_type", "image"
        ));
    }

    public void delete(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
        } catch (Exception e) {
            log.warn("Cloudinary delete failed for publicId={}: {}", publicId, e.getMessage());
        }
    }
}
