package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.LinenItem;
import com.flowlyrent.model.LinenMovement;
import com.flowlyrent.model.enums.LinenCategory;
import com.flowlyrent.model.enums.MovementDirection;
import com.flowlyrent.repository.LinenItemRepository;
import com.flowlyrent.repository.LinenMovementRepository;
import com.flowlyrent.repository.TaskLinenUsageRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/linen")
@RequiredArgsConstructor
@Tag(name = "Blanchisserie")
public class AdminLinenController {

    private final LinenItemRepository itemRepo;
    private final LinenMovementRepository movementRepo;
    private final TaskLinenUsageRepository usageRepo;
    private final SecurityUtils securityUtils;

    // ─── Articles ───────────────────────────────────────────────────────────

    @GetMapping("/items")
    public List<Map<String, Object>> getItems(@RequestParam String beds24PropertyId) {
        Long userId = securityUtils.getCurrentUserId();
        return itemRepo.findByUserIdAndBeds24PropertyIdOrderBySortOrderAscLabelAsc(userId, beds24PropertyId)
                .stream().map(this::itemToMap).collect(Collectors.toList());
    }

    @PostMapping("/items")
    public ResponseEntity<Map<String, Object>> createItem(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        LinenItem item = new LinenItem();
        item.setUser(user);
        applyItemBody(item, body);
        return ResponseEntity.ok(itemToMap(itemRepo.save(item)));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<Map<String, Object>> updateItem(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long userId = securityUtils.getCurrentUserId();
        LinenItem item = itemRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Article introuvable"));
        applyItemBody(item, body);
        return ResponseEntity.ok(itemToMap(itemRepo.save(item)));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        LinenItem item = itemRepo.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Article introuvable"));
        usageRepo.deleteByLinenItemId(id);
        movementRepo.deleteByLinenItemId(id);
        itemRepo.delete(item);
        return ResponseEntity.noContent().build();
    }

    // ─── Mouvements ─────────────────────────────────────────────────────────

    @GetMapping("/movements")
    public List<Map<String, Object>> getMovements(@RequestParam String beds24PropertyId) {
        Long userId = securityUtils.getCurrentUserId();
        return movementRepo.findByPropertyAndUser(beds24PropertyId, userId)
                .stream().map(this::movementToMap).collect(Collectors.toList());
    }

    @PostMapping("/movements")
    public ResponseEntity<Map<String, Object>> createMovement(@RequestBody Map<String, Object> body) {
        AppUser user = securityUtils.getCurrentUser();
        Long itemId = Long.parseLong(body.get("linenItemId").toString());
        LinenItem item = itemRepo.findByIdAndUserId(itemId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Article introuvable"));
        LinenMovement mv = new LinenMovement();
        mv.setUser(user);
        mv.setLinenItem(item);
        mv.setDirection(MovementDirection.valueOf(body.get("direction").toString()));
        mv.setQuantity(Integer.parseInt(body.get("quantity").toString()));
        mv.setMovementDate(LocalDate.parse(body.get("movementDate").toString()));
        if (body.get("notes") != null) mv.setNotes(body.get("notes").toString());
        if (body.get("housekeepingTaskId") != null)
            mv.setHousekeepingTaskId(Long.parseLong(body.get("housekeepingTaskId").toString()));
        return ResponseEntity.ok(movementToMap(movementRepo.save(mv)));
    }

    @DeleteMapping("/movements/{id}")
    public ResponseEntity<Void> deleteMovement(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        LinenMovement mv = movementRepo.findByIdAndUser_Id(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Mouvement introuvable"));
        movementRepo.delete(mv);
        return ResponseEntity.noContent().build();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private void applyItemBody(LinenItem item, Map<String, Object> body) {
        if (body.containsKey("beds24PropertyId") && body.get("beds24PropertyId") != null)
            item.setBeds24PropertyId(body.get("beds24PropertyId").toString());
        if (body.containsKey("propertyName"))
            item.setPropertyName(body.get("propertyName") != null ? body.get("propertyName").toString() : null);
        if (body.containsKey("label"))
            item.setLabel(body.get("label").toString());
        if (body.containsKey("category"))
            item.setCategory(LinenCategory.valueOf(body.get("category").toString()));
        if (body.containsKey("totalQuantity"))
            item.setTotalQuantity(Integer.parseInt(body.get("totalQuantity").toString()));
        if (body.containsKey("minThreshold"))
            item.setMinThreshold(body.get("minThreshold") != null ? Integer.parseInt(body.get("minThreshold").toString()) : null);
        if (body.containsKey("sortOrder"))
            item.setSortOrder(body.get("sortOrder") != null ? Integer.parseInt(body.get("sortOrder").toString()) : 0);
        if (body.containsKey("defaultPerCleaning"))
            item.setDefaultPerCleaning(body.get("defaultPerCleaning") != null ? Integer.parseInt(body.get("defaultPerCleaning").toString()) : null);
    }

    private Map<String, Object> itemToMap(LinenItem item) {
        long toL   = movementRepo.sumByItemAndDirection(item.getId(), MovementDirection.TO_LAUNDRY);
        long fromL = movementRepo.sumByItemAndDirection(item.getId(), MovementDirection.FROM_LAUNDRY);
        long atLaundry  = Math.max(0, toL - fromL);
        long atProperty = Math.max(0, item.getTotalQuantity() - atLaundry);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",               item.getId());
        m.put("beds24PropertyId", item.getBeds24PropertyId());
        m.put("propertyName",     item.getPropertyName());
        m.put("label",            item.getLabel());
        m.put("category",         item.getCategory());
        m.put("totalQuantity",    item.getTotalQuantity());
        m.put("minThreshold",     item.getMinThreshold());
        m.put("sortOrder",        item.getSortOrder());
        m.put("defaultPerCleaning", item.getDefaultPerCleaning());
        m.put("atLaundry",        atLaundry);
        m.put("atProperty",       atProperty);
        return m;
    }

    private Map<String, Object> movementToMap(LinenMovement mv) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            mv.getId());
        m.put("direction",     mv.getDirection());
        m.put("quantity",      mv.getQuantity());
        m.put("movementDate",  mv.getMovementDate());
        m.put("notes",         mv.getNotes());
        m.put("createdAt",     mv.getCreatedAt());
        LinenItem li = mv.getLinenItem();
        if (li != null) {
            Map<String, Object> liMap = new LinkedHashMap<>();
            liMap.put("id",       li.getId());
            liMap.put("label",    li.getLabel());
            liMap.put("category", li.getCategory());
            m.put("linenItem", liMap);
        }
        return m;
    }
}
