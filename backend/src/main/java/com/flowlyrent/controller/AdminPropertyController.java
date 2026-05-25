package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.Property;
import com.flowlyrent.repository.PropertyRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/properties")
@RequiredArgsConstructor
@Tag(name = "Propriétés admin")
public class AdminPropertyController {

    private final PropertyRepository propertyRepository;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Property> getMyProperties() {
        return propertyRepository.findByAppUser(securityUtils.getCurrentUser());
    }
}
