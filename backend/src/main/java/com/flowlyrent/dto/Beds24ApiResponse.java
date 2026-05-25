package com.flowlyrent.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Beds24ApiResponse<T> {
    private boolean success;
    private String type;
    private int count;
    private List<T> data;
    private Pages pages;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Pages {
        private boolean nextPageExists;
        private String nextPageLink;
    }
}
