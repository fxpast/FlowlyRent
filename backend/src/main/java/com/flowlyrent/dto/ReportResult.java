package com.flowlyrent.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class ReportResult {

    private String type;
    private String title;
    private Map<String, String> params;
    private List<String> headers;
    private List<List<Object>> rows;
    private Map<String, Object> summary;
    private LocalDateTime generatedAt;
}
