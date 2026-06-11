package com.flowlyrent.controller;

import com.flowlyrent.model.FaqItem;
import com.flowlyrent.repository.FaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FaqController {

    private final FaqRepository faqRepository;

    @GetMapping("/public/faq")
    public List<FaqItem> getPublic() {
        return faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc();
    }

    @GetMapping("/superadmin/faq")
    public List<FaqItem> getAll() {
        return faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc();
    }

    @PostMapping("/superadmin/faq")
    public ResponseEntity<FaqItem> create(@RequestBody Map<String, Object> body) {
        FaqItem item = new FaqItem();
        item.setQuestion(body.getOrDefault("question", "").toString().trim());
        item.setAnswer(body.getOrDefault("answer", "").toString().trim());
        if (item.getQuestion().isBlank() || item.getAnswer().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        int maxOrder = faqRepository.findAllByOrderByDisplayOrderAscCreatedAtAsc()
                .stream().mapToInt(FaqItem::getDisplayOrder).max().orElse(-1);
        item.setDisplayOrder(maxOrder + 1);
        return ResponseEntity.ok(faqRepository.save(item));
    }

    @PutMapping("/superadmin/faq/{id}")
    public ResponseEntity<FaqItem> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return faqRepository.findById(id).map(item -> {
            if (body.containsKey("question")) item.setQuestion(body.get("question").toString().trim());
            if (body.containsKey("answer"))   item.setAnswer(body.get("answer").toString().trim());
            if (body.containsKey("displayOrder")) {
                item.setDisplayOrder(Integer.parseInt(body.get("displayOrder").toString()));
            }
            return ResponseEntity.ok(faqRepository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/superadmin/faq/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!faqRepository.existsById(id)) return ResponseEntity.notFound().build();
        faqRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
