package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.PropertyInventoryItem;
import com.flowlyrent.repository.PropertyInventoryItemRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/property-inventory")
@RequiredArgsConstructor
@Tag(name = "Inventaire logements")
public class AdminPropertyInventoryController {

    private final PropertyInventoryItemRepository repo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<PropertyInventoryItem> getItems(@RequestParam String beds24PropertyId) {
        return repo.findByUserIdAndBeds24PropertyIdOrderByCategoryAscSortOrderAscIdAsc(
                securityUtils.getCurrentUserId(), beds24PropertyId);
    }

    @PostMapping
    public ResponseEntity<PropertyInventoryItem> create(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        PropertyInventoryItem item = new PropertyInventoryItem();
        item.setUser(user);
        item.setBeds24PropertyId(body.get("beds24PropertyId").toString());
        item.setCategory(body.getOrDefault("category", "OTHER").toString());
        item.setLabel(body.get("label").toString());
        if (body.containsKey("details"))   item.setDetails(body.get("details") != null ? body.get("details").toString() : null);
        if (body.containsKey("quantity"))  item.setQuantity(Integer.parseInt(body.get("quantity").toString()));
        if (body.containsKey("sortOrder")) item.setSortOrder(Integer.parseInt(body.get("sortOrder").toString()));
        return ResponseEntity.ok(repo.save(item));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PropertyInventoryItem> update(@PathVariable Long id,
                                                         @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        return repo.findById(id)
                .filter(i -> i.getUser().getId().equals(userId))
                .map(item -> {
                    if (body.containsKey("category"))  item.setCategory(body.get("category").toString());
                    if (body.containsKey("label"))     item.setLabel(body.get("label").toString());
                    if (body.containsKey("details"))   item.setDetails(body.get("details") != null ? body.get("details").toString() : null);
                    if (body.containsKey("quantity"))  item.setQuantity(Integer.parseInt(body.get("quantity").toString()));
                    if (body.containsKey("sortOrder")) item.setSortOrder(Integer.parseInt(body.get("sortOrder").toString()));
                    return ResponseEntity.ok(repo.save(item));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        return repo.findById(id)
                .filter(i -> i.getUser().getId().equals(userId))
                .map(item -> { repo.delete(item); return ResponseEntity.noContent().<Void>build(); })
                .orElse(ResponseEntity.notFound().build());
    }
}
