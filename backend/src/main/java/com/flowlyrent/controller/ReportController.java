package com.flowlyrent.controller;

import com.flowlyrent.config.SecurityUtils;
import com.flowlyrent.dto.ReportResult;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import com.flowlyrent.service.Beds24ReportService;
import com.flowlyrent.service.ExportService;
import com.flowlyrent.service.HousekeepingReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/admin/reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Rapports")
public class ReportController {

    private final SecurityUtils securityUtils;
    private final HousekeepingReportService hkService;
    private final Beds24ReportService b24Service;
    private final ExportService exportService;
    private final Beds24AccountRepository accountRepo;

    // =========================================================================
    // Ménage (données locales)
    // =========================================================================

    @GetMapping("/hk/month-by-staff")
    public ResponseEntity<ReportResult> hkMonthByStaff(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(hkService.monthByStaff(userId, from, to));
    }

    @GetMapping("/hk/annual-by-property")
    public ResponseEntity<ReportResult> hkAnnualByProperty(@RequestParam int year) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(hkService.annualByProperty(userId, year));
    }

    @GetMapping("/hk/annual-detail")
    public ResponseEntity<ReportResult> hkAnnualDetail(@RequestParam int year) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(hkService.annualDetail(userId, year));
    }

    @GetMapping("/hk/by-staff")
    public ResponseEntity<ReportResult> hkByStaff(
            @RequestParam Long staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(hkService.byStaff(userId, staffId, from, to));
    }

    @GetMapping("/hk/by-property")
    public ResponseEntity<ReportResult> hkByProperty(
            @RequestParam String beds24PropertyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        Long userId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(hkService.byProperty(userId, beds24PropertyId, from, to));
    }

    // =========================================================================
    // Beds24 (données live)
    // =========================================================================

    @GetMapping("/b24/ca-annual")
    public ResponseEntity<?> b24CaAnnual(@RequestParam int year) {
        try {
            return ResponseEntity.ok(b24Service.caAnnual(requireAccount(), year));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/b24/ca-annual-by-property")
    public ResponseEntity<?> b24CaAnnualByProperty(@RequestParam int year) {
        try {
            return ResponseEntity.ok(b24Service.caAnnualByProperty(requireAccount(), year));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/b24/ca-by-property")
    public ResponseEntity<?> b24CaByProperty(
            @RequestParam String propId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        try {
            return ResponseEntity.ok(b24Service.caByProperty(requireAccount(), propId, from, to));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/b24/stats-platform")
    public ResponseEntity<?> b24StatsPlatform(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        try {
            return ResponseEntity.ok(b24Service.statsByPlatform(requireAccount(), from, to));
        } catch (Exception e) {
            return error(e);
        }
    }

    @GetMapping("/b24/occupancy")
    public ResponseEntity<?> b24Occupancy(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        try {
            return ResponseEntity.ok(b24Service.occupancy(requireAccount(), from, to));
        } catch (Exception e) {
            return error(e);
        }
    }

    // =========================================================================
    // Export (PDF / Excel / CSV)
    // =========================================================================

    @GetMapping("/hk/month-by-staff/export")
    public ResponseEntity<byte[]> exportHkMonthByStaff(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = hkService.monthByStaff(securityUtils.getCurrentUserId(), from, to);
        return buildExportResponse(report, format);
    }

    @GetMapping("/hk/annual-by-property/export")
    public ResponseEntity<byte[]> exportHkAnnualByProperty(
            @RequestParam int year,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = hkService.annualByProperty(securityUtils.getCurrentUserId(), year);
        return buildExportResponse(report, format);
    }

    @GetMapping("/hk/annual-detail/export")
    public ResponseEntity<byte[]> exportHkAnnualDetail(
            @RequestParam int year,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = hkService.annualDetail(securityUtils.getCurrentUserId(), year);
        return buildExportResponse(report, format);
    }

    @GetMapping("/hk/by-staff/export")
    public ResponseEntity<byte[]> exportHkByStaff(
            @RequestParam Long staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = hkService.byStaff(securityUtils.getCurrentUserId(), staffId, from, to);
        return buildExportResponse(report, format);
    }

    @GetMapping("/hk/by-property/export")
    public ResponseEntity<byte[]> exportHkByProperty(
            @RequestParam String beds24PropertyId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = hkService.byProperty(securityUtils.getCurrentUserId(), beds24PropertyId, from, to);
        return buildExportResponse(report, format);
    }

    @GetMapping("/b24/ca-annual/export")
    public ResponseEntity<byte[]> exportB24CaAnnual(
            @RequestParam int year,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = b24Service.caAnnual(requireAccount(), year);
        return buildExportResponse(report, format);
    }

    @GetMapping("/b24/ca-annual-by-property/export")
    public ResponseEntity<byte[]> exportB24CaAnnualByProperty(
            @RequestParam int year,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = b24Service.caAnnualByProperty(requireAccount(), year);
        return buildExportResponse(report, format);
    }

    @GetMapping("/b24/ca-by-property/export")
    public ResponseEntity<byte[]> exportB24CaByProperty(
            @RequestParam String propId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = b24Service.caByProperty(requireAccount(), propId, from, to);
        return buildExportResponse(report, format);
    }

    @GetMapping("/b24/stats-platform/export")
    public ResponseEntity<byte[]> exportB24StatsPlatform(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = b24Service.statsByPlatform(requireAccount(), from, to);
        return buildExportResponse(report, format);
    }

    @GetMapping("/b24/occupancy/export")
    public ResponseEntity<byte[]> exportB24Occupancy(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "csv") String format) throws Exception {
        ReportResult report = b24Service.occupancy(requireAccount(), from, to);
        return buildExportResponse(report, format);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private ResponseEntity<byte[]> buildExportResponse(ReportResult report, String format) throws Exception {
        byte[] data;
        String contentType;
        String extension;

        switch (format.toLowerCase()) {
            case "pdf" -> {
                data = exportService.toPdf(report);
                contentType = "application/pdf";
                extension = ".pdf";
            }
            case "excel", "xlsx" -> {
                data = exportService.toExcel(report);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                extension = ".xlsx";
            }
            default -> {
                data = exportService.toCsv(report);
                contentType = "text/csv;charset=UTF-8";
                extension = ".csv";
            }
        }

        String filename = report.getType().toLowerCase().replace("_", "-") + extension;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return ResponseEntity.ok().headers(headers).body(data);
    }

    private Beds24Account requireAccount() {
        Long userId = securityUtils.getCurrentUserId();
        return accountRepo.findByAppUserId(userId)
                .filter(Beds24Account::isConnected)
                .orElseThrow(() -> new IllegalStateException("Compte Beds24 non connecté"));
    }

    private ResponseEntity<java.util.Map<String, String>> error(Exception e) {
        log.warn("[Report] Erreur : {}", e.getMessage());
        return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
    }
}
