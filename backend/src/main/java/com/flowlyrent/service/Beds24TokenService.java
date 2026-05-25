package com.flowlyrent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.dto.Beds24AuthDTO;
import com.flowlyrent.model.Beds24Account;
import com.flowlyrent.repository.Beds24AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class Beds24TokenService {

    private static final String BEDS24_API = "https://beds24.com/api/v2";

    private final Beds24AccountRepository beds24AccountRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void connectWithSetupToken(Beds24Account account, String inviteCode) throws Exception {
        log.info("[Beds24] connexion avec code invitation");
        String body = getWithHeader(BEDS24_API + "/authentication/setup", "code", inviteCode);
        Beds24AuthDTO auth = objectMapper.readValue(body, Beds24AuthDTO.class);

        if (auth.getRefreshToken() == null) {
            throw new RuntimeException("Code Beds24 invalide : " + (auth.getError() != null ? auth.getError() : "réponse inattendue"));
        }
        saveTokens(account, auth.getRefreshToken(), auth.getToken(), auth.getExpiresIn());
        log.info("[Beds24] compte connecté pour user {}", account.getAppUser().getId());
    }

    @Transactional
    public String getValidToken(Beds24Account account) throws Exception {
        if (isTokenValid(account)) return account.getAccessToken();

        if (account.getRefreshToken() == null || account.getRefreshToken().isBlank()) {
            throw new RuntimeException("Refresh token manquant — reconnectez votre compte Beds24.");
        }

        String body = getWithHeader(BEDS24_API + "/authentication/token", "refreshToken", account.getRefreshToken());
        Beds24AuthDTO auth = objectMapper.readValue(body, Beds24AuthDTO.class);

        if (auth.getToken() == null) {
            account.setConnected(false);
            beds24AccountRepository.save(account);
            throw new RuntimeException("Session Beds24 expirée — reconnectez votre compte Beds24.");
        }

        account.setAccessToken(auth.getToken());
        account.setTokenExpiresAt(LocalDateTime.now().plusSeconds(auth.getExpiresIn() != null ? auth.getExpiresIn() : 3600));
        beds24AccountRepository.save(account);
        log.debug("[Beds24] token rafraîchi pour user {}", account.getAppUser().getId());
        return auth.getToken();
    }

    private void saveTokens(Beds24Account account, String refreshToken, String accessToken, Integer expiresIn) {
        account.setRefreshToken(refreshToken);
        account.setAccessToken(accessToken);
        account.setTokenExpiresAt(LocalDateTime.now().plusSeconds(expiresIn != null ? expiresIn : 3600));
        account.setConnected(true);
        beds24AccountRepository.save(account);
    }

    private boolean isTokenValid(Beds24Account account) {
        return account.getAccessToken() != null
                && account.getTokenExpiresAt() != null
                && LocalDateTime.now().isBefore(account.getTokenExpiresAt().minusMinutes(5));
    }

    private String getWithHeader(String url, String headerName, String headerValue) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .header(headerName, headerValue)
                .GET()
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Beds24 HTTP " + response.statusCode() + " : " + response.body());
        }
        return response.body();
    }
}
