package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.Beds24Account;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Proxy HTTP vers l'API Beds24 v2.
 * Aucune persistance — toutes les données transitent en mémoire.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class Beds24ApiClient {

    private static final String BASE = "https://beds24.com/api/v2";

    private final Beds24TokenService tokenService;
    private final ObjectMapper objectMapper;

    // -------------------------------------------------------------------------
    // Token helper
    // -------------------------------------------------------------------------

    public String tokenFor(Beds24Account account) throws Exception {
        return tokenService.getValidToken(account);
    }

    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    public List<Map<String, Object>> getProperties(String token, Map<String, String> params) throws Exception {
        return fetchAll("/properties", token, params);
    }

    // -------------------------------------------------------------------------
    // Bookings
    // -------------------------------------------------------------------------

    public List<Map<String, Object>> getBookings(String token, Map<String, String> params) throws Exception {
        return fetchAll("/bookings", token, params);
    }

    public List<Map<String, Object>> getBookingsAllStatuses(String token, Map<String, String> params) throws Exception {
        List<String> statuses = List.of("confirmed", "request", "new", "black", "inquiry", "cancelled");
        String baseUrl = buildUrl(BASE + "/bookings", params);
        String statusQuery = statuses.stream()
                .map(s -> "status=" + URLEncoder.encode(s, StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        String url = baseUrl.contains("?") ? baseUrl + "&" + statusQuery : baseUrl + "?" + statusQuery;
        return fetchAllFromUrl(url, token);
    }

    public List<Map<String, Object>> saveBookings(String token, List<Map<String, Object>> payload) throws Exception {
        String body = objectMapper.writeValueAsString(payload);
        log.info("[Beds24] saveBookings payload: {}", body);
        String response = post(BASE + "/bookings", token, body);
        log.info("[Beds24] saveBookings response: {}", response);
        List<Map<String, Object>> results = objectMapper.readValue(response, new TypeReference<>() {});
        for (Map<String, Object> r : results) {
            if (Boolean.FALSE.equals(r.get("success"))) {
                Object errors = r.get("errors");
                throw new RuntimeException("Beds24 booking error: " + (errors != null ? errors : response));
            }
        }
        return results;
    }

    public Map<String, Object> deleteBookings(String token, List<Long> ids) throws Exception {
        String idsParam = ids.stream().map(String::valueOf).collect(Collectors.joining(","));
        String response = delete(BASE + "/bookings?ids=" + idsParam, token);
        return objectMapper.readValue(response, new TypeReference<>() {});
    }

    // -------------------------------------------------------------------------
    // Messages
    // -------------------------------------------------------------------------

    public List<Map<String, Object>> getMessages(String token, Map<String, String> params) throws Exception {
        return fetchAll("/bookings/messages", token, params);
    }

    public List<Map<String, Object>> sendMessages(String token, List<Map<String, Object>> payload) throws Exception {
        String body = objectMapper.writeValueAsString(payload);
        String response = post(BASE + "/bookings/messages", token, body);
        return objectMapper.readValue(response, new TypeReference<>() {});
    }

    public Map<String, Object> patchMessages(String token, Map<String, Object> payload) throws Exception {
        String body = objectMapper.writeValueAsString(payload);
        String response = patch(BASE + "/bookings/messages", token, body);
        return objectMapper.readValue(response, new TypeReference<>() {});
    }

    // -------------------------------------------------------------------------
    // Inventory — disponibilités et calendrier
    // -------------------------------------------------------------------------

    public List<Map<String, Object>> getAvailability(String token, Map<String, String> params) throws Exception {
        return fetchAll("/inventory/rooms/availability", token, params);
    }

    public List<Map<String, Object>> getCalendar(String token, Map<String, String> params) throws Exception {
        return fetchAll("/inventory/rooms/calendar", token, params);
    }

    public List<Map<String, Object>> updateCalendar(String token, List<Map<String, Object>> payload) throws Exception {
        String body = objectMapper.writeValueAsString(payload);
        String response = post(BASE + "/inventory/rooms/calendar", token, body);
        return objectMapper.readValue(response, new TypeReference<>() {});
    }

    public List<Map<String, Object>> getOffers(String token, Map<String, String> params) throws Exception {
        return fetchAll("/inventory/rooms/offers", token, params);
    }

    // -------------------------------------------------------------------------
    // Pagination automatique
    // -------------------------------------------------------------------------

    private List<Map<String, Object>> fetchAll(String endpoint, String token, Map<String, String> params) throws Exception {
        return fetchAllFromUrl(buildUrl(BASE + endpoint, params), token);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> fetchAllFromUrl(String initialUrl, String token) throws Exception {
        List<Map<String, Object>> result = new ArrayList<>();
        String url = initialUrl;

        while (url != null) {
            String body = get(url, token);
            Map<String, Object> wrapper = objectMapper.readValue(body, new TypeReference<>() {});

            Boolean success = (Boolean) wrapper.get("success");
            if (Boolean.FALSE.equals(success)) {
                log.warn("[Beds24] réponse non-success : {}", wrapper.get("errors"));
                break;
            }

            List<Map<String, Object>> data = (List<Map<String, Object>>) wrapper.get("data");
            if (data != null) result.addAll(data);

            Map<String, Object> pages = (Map<String, Object>) wrapper.get("pages");
            url = null;
            if (pages != null && Boolean.TRUE.equals(pages.get("nextPageExists"))) {
                url = (String) pages.get("nextPageLink");
            }
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // HTTP utilities
    // -------------------------------------------------------------------------

    private String get(String url, String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .header("token", token)
                .GET()
                .build();
        return send(request);
    }

    private String post(String url, String token, String jsonBody) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("token", token)
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        return send(request);
    }

    private String patch(String url, String token, String jsonBody) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("token", token)
                .method("PATCH", HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();
        return send(request);
    }

    private String delete(String url, String token) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .header("token", token)
                .DELETE()
                .build();
        return send(request);
    }

    private String send(HttpRequest request) throws Exception {
        HttpResponse<String> response = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build()
                .send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Beds24 HTTP " + response.statusCode() + " : " + response.body());
        }
        return response.body();
    }

    private String buildUrl(String base, Map<String, String> params) {
        if (params == null || params.isEmpty()) return base;
        String query = params.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isBlank())
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" +
                          URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        return query.isEmpty() ? base : base + "?" + query;
    }
}
