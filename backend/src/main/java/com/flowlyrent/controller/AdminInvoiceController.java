package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.Invoice;
import com.flowlyrent.model.InvoiceLine;
import com.flowlyrent.model.enums.InvoiceLineType;
import com.flowlyrent.model.enums.InvoiceStatus;
import com.flowlyrent.repository.InvoiceRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin/invoices")
@RequiredArgsConstructor
@Tag(name = "Factures")
public class AdminInvoiceController {

    private final InvoiceRepository invoiceRepo;
    private final SecurityUtils securityUtils;

    @GetMapping
    public List<Invoice> getAll(@RequestParam(required = false) String status) {
        Long userId = securityUtils.getCurrentUserId();
        if (status != null && !status.isBlank()) {
            return invoiceRepo.findByUserIdAndStatusOrderByInvoiceYearDescInvoiceSeqDesc(
                userId, InvoiceStatus.valueOf(status));
        }
        return invoiceRepo.findByUserIdOrderByInvoiceYearDescInvoiceSeqDesc(userId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getOne(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        return invoiceRepo.findByIdAndUserId(id, userId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Invoice> create(@RequestBody InvoiceRequest req) {
        AppUser user = securityUtils.getCurrentUser();
        LocalDate issueDate = req.issueDate != null ? LocalDate.parse(req.issueDate) : LocalDate.now();
        int year = issueDate.getYear();
        int seq = invoiceRepo.findMaxSeqByUserAndYear(user.getId(), year) + 1;

        Invoice invoice = new Invoice();
        invoice.setUser(user);
        invoice.setInvoiceYear(year);
        invoice.setInvoiceSeq(seq);
        invoice.setInvoiceNumber(year + "-" + String.format("%03d", seq));
        applyFields(invoice, req, issueDate);

        return ResponseEntity.ok(invoiceRepo.save(invoice));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Invoice> update(@PathVariable Long id, @RequestBody InvoiceRequest req) {
        Long userId = securityUtils.getCurrentUserId();
        Invoice invoice = invoiceRepo.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new IllegalArgumentException("Facture introuvable"));

        LocalDate issueDate = req.issueDate != null ? LocalDate.parse(req.issueDate) : invoice.getIssueDate();
        invoice.getLines().clear();
        applyFields(invoice, req, issueDate);

        return ResponseEntity.ok(invoiceRepo.save(invoice));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Invoice> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long userId = securityUtils.getCurrentUserId();
        Invoice invoice = invoiceRepo.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new IllegalArgumentException("Facture introuvable"));
        invoice.setStatus(InvoiceStatus.valueOf(body.get("status")));
        return ResponseEntity.ok(invoiceRepo.save(invoice));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = securityUtils.getCurrentUserId();
        Invoice invoice = invoiceRepo.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new IllegalArgumentException("Facture introuvable"));
        invoiceRepo.delete(invoice);
        return ResponseEntity.noContent().build();
    }

    private void applyFields(Invoice invoice, InvoiceRequest req, LocalDate issueDate) {
        invoice.setIssueDate(issueDate);
        invoice.setDueDate(req.dueDate != null && !req.dueDate.isBlank() ? LocalDate.parse(req.dueDate) : null);
        invoice.setBeds24BookingId(req.beds24BookingId);
        invoice.setBeds24PropertyId(req.beds24PropertyId);
        invoice.setGuestName(req.guestName);
        invoice.setGuestEmail(req.guestEmail);
        invoice.setGuestAddress(req.guestAddress);
        invoice.setNotes(req.notes);

        if (req.lines != null) {
            int order = 0;
            for (InvoiceLineRequest lr : req.lines) {
                InvoiceLine line = new InvoiceLine();
                line.setInvoice(invoice);
                line.setDescription(lr.description);
                line.setQuantity(lr.quantity != null ? lr.quantity : BigDecimal.ONE);
                line.setUnitPrice(lr.unitPrice != null ? lr.unitPrice : BigDecimal.ZERO);
                line.setVatRate(lr.vatRate != null ? lr.vatRate : BigDecimal.ZERO);
                line.setLineType(lr.lineType != null ? InvoiceLineType.valueOf(lr.lineType) : InvoiceLineType.CUSTOM);
                line.setSortOrder(order++);
                invoice.getLines().add(line);
            }
        }
    }

    @Data
    public static class InvoiceRequest {
        String beds24BookingId;
        String beds24PropertyId;
        String guestName;
        String guestEmail;
        String guestAddress;
        String issueDate;
        String dueDate;
        String notes;
        List<InvoiceLineRequest> lines;
    }

    @Data
    public static class InvoiceLineRequest {
        Long id;
        String description;
        BigDecimal quantity;
        BigDecimal unitPrice;
        BigDecimal vatRate;
        String lineType;
    }
}
