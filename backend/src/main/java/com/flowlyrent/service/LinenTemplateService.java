package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.LinenItem;
import com.flowlyrent.model.LinenTemplate;
import com.flowlyrent.model.LinenTemplateItem;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.LinenItemRepository;
import com.flowlyrent.repository.LinenTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LinenTemplateService {

    private final LinenTemplateRepository templateRepo;
    private final LinenItemRepository itemRepo;
    private final AppUserRepository userRepo;

    // ─── CRUD ──────────────────────────────────────────────────────────────────

    public List<LinenTemplate> list(Long userId) {
        return templateRepo.findByUserIdOrderByNameAsc(userId);
    }

    public LinenTemplate create(Long userId, LinenTemplate form) {
        AppUser user = userRepo.findById(userId).orElseThrow();
        LinenTemplate template = new LinenTemplate();
        template.setUser(user);
        applyForm(template, form);
        return templateRepo.save(template);
    }

    public LinenTemplate update(Long userId, Long id, LinenTemplate form) {
        LinenTemplate template = templateRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle introuvable."));
        applyForm(template, form);
        return templateRepo.save(template);
    }

    public void delete(Long userId, Long id) {
        LinenTemplate template = templateRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle introuvable."));
        templateRepo.delete(template);
    }

    private void applyForm(LinenTemplate template, LinenTemplate form) {
        template.setName(form.getName());
        template.getItems().clear();
        int sortOrder = 0;
        for (LinenTemplateItem item : form.getItems()) {
            LinenTemplateItem ti = new LinenTemplateItem();
            ti.setTemplate(template);
            ti.setLabel(item.getLabel());
            ti.setCategory(item.getCategory());
            ti.setTotalQuantity(item.getTotalQuantity());
            ti.setMinThreshold(item.getMinThreshold());
            ti.setDefaultPerCleaning(item.getDefaultPerCleaning());
            ti.setSortOrder(sortOrder++);
            template.getItems().add(ti);
        }
    }

    // ─── Attribution à des logements ────────────────────────────────────────────

    public int apply(Long userId, Long templateId, List<String> beds24PropertyIds, Map<String, String> propertyNames) {
        LinenTemplate template = templateRepo.findByIdAndUserId(templateId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Modèle introuvable."));
        AppUser user = userRepo.findById(userId).orElseThrow();

        int count = 0;
        for (String propId : beds24PropertyIds) {
            String propertyName = propertyNames.get(propId);
            for (LinenTemplateItem ti : template.getItems()) {
                LinenItem item = itemRepo.findByUserIdAndBeds24PropertyIdAndLabel(userId, propId, ti.getLabel())
                        .orElseGet(() -> {
                            LinenItem li = new LinenItem();
                            li.setUser(user);
                            li.setBeds24PropertyId(propId);
                            return li;
                        });
                item.setPropertyName(propertyName != null ? propertyName : item.getPropertyName());
                item.setLabel(ti.getLabel());
                item.setCategory(ti.getCategory());
                item.setTotalQuantity(ti.getTotalQuantity());
                item.setMinThreshold(ti.getMinThreshold());
                item.setDefaultPerCleaning(ti.getDefaultPerCleaning());
                item.setSortOrder(ti.getSortOrder());
                itemRepo.save(item);
                count++;
            }
        }
        return count;
    }
}
