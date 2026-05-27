package com.flowlyrent.service;

import com.flowlyrent.dto.ReportResult;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@Slf4j
public class ExportService {

    // -------------------------------------------------------------------------
    // CSV
    // -------------------------------------------------------------------------

    public byte[] toCsv(ReportResult report) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintWriter pw = new PrintWriter(new OutputStreamWriter(baos, StandardCharsets.UTF_8));

        // BOM for Excel compatibility
        pw.print('﻿');
        pw.println(escapeCsv(report.getHeaders()));
        for (List<Object> row : report.getRows()) {
            pw.println(escapeCsv(row.stream().map(o -> o != null ? o.toString() : "").toList()));
        }
        pw.flush();
        return baos.toByteArray();
    }

    private String escapeCsv(List<String> values) {
        return String.join(";", values.stream()
                .map(v -> "\"" + v.replace("\"", "\"\"") + "\"")
                .toList());
    }

    // -------------------------------------------------------------------------
    // Excel (XLSX)
    // -------------------------------------------------------------------------

    public byte[] toExcel(ReportResult report) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(truncate(report.getTitle(), 31));

            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            org.apache.poi.ss.usermodel.Font headerFont = wb.createFont();
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            CellStyle altStyle = wb.createCellStyle();
            altStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            altStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Header row
            Row headerRow = sheet.createRow(0);
            List<String> headers = report.getHeaders();
            for (int i = 0; i < headers.size(); i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowNum = 1;
            for (List<Object> rowData : report.getRows()) {
                Row row = sheet.createRow(rowNum);
                CellStyle rowStyle = rowNum % 2 == 0 ? altStyle : null;
                for (int i = 0; i < rowData.size(); i++) {
                    Cell cell = row.createCell(i);
                    Object val = rowData.get(i);
                    setCellValue(cell, val);
                    if (rowStyle != null) cell.setCellStyle(rowStyle);
                }
                rowNum++;
            }

            // Summary row
            if (report.getSummary() != null && !report.getSummary().isEmpty()) {
                rowNum++;
                Row sumRow = sheet.createRow(rowNum);
                CellStyle boldStyle = wb.createCellStyle();
                org.apache.poi.ss.usermodel.Font bold = wb.createFont();
                bold.setBold(true);
                boldStyle.setFont(bold);

                int col = 0;
                for (var e : report.getSummary().entrySet()) {
                    Cell k = sumRow.createCell(col++);
                    k.setCellValue(e.getKey());
                    k.setCellStyle(boldStyle);
                    Cell v = sumRow.createCell(col++);
                    setCellValue(v, e.getValue());
                }
            }

            for (int i = 0; i < headers.size(); i++) sheet.autoSizeColumn(i);

            wb.write(baos);
            return baos.toByteArray();
        }
    }

    private void setCellValue(Cell cell, Object val) {
        if (val == null) {
            cell.setCellValue("");
        } else if (val instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else {
            cell.setCellValue(val.toString());
        }
    }

    private String truncate(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : s;
    }

    // -------------------------------------------------------------------------
    // PDF
    // -------------------------------------------------------------------------

    public byte[] toPdf(ReportResult report) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 20, 20, 30, 30);
        PdfWriter.getInstance(doc, baos);
        doc.open();

        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.DARK_GRAY);
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
        Font cellFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
        Font summaryFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);

        // Title
        Paragraph title = new Paragraph(report.getTitle(), titleFont);
        title.setSpacingAfter(4);
        doc.add(title);

        Paragraph generated = new Paragraph("Généré le : " + report.getGeneratedAt().toString().replace("T", " ").substring(0, 19),
                FontFactory.getFont(FontFactory.HELVETICA, 7, Color.GRAY));
        generated.setSpacingAfter(12);
        doc.add(generated);

        // Table
        List<String> headers = report.getHeaders();
        PdfPTable table = new PdfPTable(headers.size());
        table.setWidthPercentage(100);

        // Header cells
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
            cell.setBackgroundColor(new Color(31, 73, 125));
            cell.setPadding(5);
            cell.setBorderColor(Color.WHITE);
            table.addCell(cell);
        }

        // Data cells
        int rowIdx = 0;
        for (List<Object> rowData : report.getRows()) {
            Color bg = rowIdx % 2 == 0 ? Color.WHITE : new Color(235, 241, 250);
            for (Object val : rowData) {
                PdfPCell cell = new PdfPCell(new Phrase(val != null ? val.toString() : "", cellFont));
                cell.setBackgroundColor(bg);
                cell.setPadding(4);
                table.addCell(cell);
            }
            rowIdx++;
        }
        doc.add(table);

        // Summary
        if (report.getSummary() != null && !report.getSummary().isEmpty()) {
            Paragraph sep = new Paragraph(" ");
            sep.setSpacingBefore(10);
            doc.add(sep);

            StringBuilder sb = new StringBuilder("Résumé : ");
            report.getSummary().forEach((k, v) -> sb.append(k).append(" = ").append(v).append("  "));
            doc.add(new Paragraph(sb.toString(), summaryFont));
        }

        doc.close();
        return baos.toByteArray();
    }
}
