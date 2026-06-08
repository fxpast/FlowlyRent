package com.flowlyrent.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Pont entre Spring (injection @Value) et le JPA AttributeConverter
 * qui ne peut pas recevoir d'injection Spring directement.
 */
@Component
public class EncryptionKeyHolder {

    private static String key;

    @Value("${app.encryption.key:}")
    public void setKey(String k) {
        EncryptionKeyHolder.key = k.isBlank() ? null : k;
    }

    public static String getKey() {
        return key;
    }
}
