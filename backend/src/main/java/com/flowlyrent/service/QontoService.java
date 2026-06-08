package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.ExpenseRule;
import com.flowlyrent.model.QontoAccount;
import com.flowlyrent.model.QontoTransaction;
import com.flowlyrent.repository.AppUserRepository;
import com.flowlyrent.repository.ExpenseRuleRepository;
import com.flowlyrent.repository.QontoAccountRepository;
import com.flowlyrent.repository.QontoTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class QontoService {

    private static final String BASE_URL = "https://thirdparty.qonto.com/v2";

    private final QontoAccountRepository qontoAccountRepository;
    private final QontoTransactionRepository transactionRepository;
    private final ExpenseRuleRepository expenseRuleRepository;
    private final AppUserRepository appUserRepository;
    private final ObjectMapper objectMapper;

    // ─── Connect ─────────────────────────────────────────────────────────────

    public Map<String, Object> connect(AppUser user, String login, String secretKey) {
        try {
            Map<String, Object> orgData = apiGet("/organization", login, secretKey);
            @SuppressWarnings("unchecked")
            Map<String, Object> org = (Map<String, Object>) orgData.get("organization");
            if (org == null) {
                return Map.of("error", "Réponse inattendue de l'API Qonto");
            }

            QontoAccount account = qontoAccountRepository.findByAppUserId(user.getId())
                    .orElseGet(() -> { QontoAccount a = new QontoAccount(); a.setAppUser(user); return a; });
            account.setLogin(login);
            account.setSecretKey(secretKey);
            account.setConnected(true);
            qontoAccountRepository.save(account);

            return Map.of("status", "Connecté", "connected", true,
                    "legalName", org.getOrDefault("legal_name", ""));
        } catch (Exception e) {
            log.error("Erreur connexion Qonto: {}", e.getMessage());
            return Map.of("error", "Identifiants invalides ou API Qonto inaccessible: " + e.getMessage());
        }
    }

    public void disconnect(Long userId) {
        qontoAccountRepository.findByAppUserId(userId).ifPresent(a -> {
            a.setConnected(false);
            a.setSecretKey(null);
            qontoAccountRepository.save(a);
        });
    }

    // ─── Sync ─────────────────────────────────────────────────────────────────

    public Map<String, Object> syncTransactions(Long userId) {
        QontoAccount account = qontoAccountRepository.findByAppUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Compte Qonto non connecté"));
        if (!account.isConnected()) throw new IllegalStateException("Compte Qonto non connecté");

        AppUser user = appUserRepository.findById(userId).orElseThrow();
        account.setAppUser(user);

        try {
            Map<String, Object> orgData = apiGet("/organization", account.getLogin(), account.getSecretKey());
            @SuppressWarnings("unchecked")
            Map<String, Object> org = (Map<String, Object>) orgData.get("organization");
            if (org == null) throw new IllegalStateException("Organisation Qonto introuvable");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> bankAccounts = (List<Map<String, Object>>) org.get("bank_accounts");
            if (bankAccounts == null || bankAccounts.isEmpty()) {
                throw new IllegalStateException("Aucun compte bancaire trouvé dans Qonto");
            }

            LocalDate fromDate = account.getLastSync() != null
                    ? account.getLastSync().toLocalDate().minusDays(1)
                    : LocalDate.now().minusMonths(6);

            List<ExpenseRule> rules = expenseRuleRepository.findByUserIdAndActiveTrue(userId);
            int total = 0;

            for (Map<String, Object> ba : bankAccounts) {
                String iban = (String) ba.get("iban");
                if (iban == null) continue;
                total += fetchAndSave(user, account, iban, fromDate, rules);
            }

            recategorizeAll(userId, rules);

            account.setLastSync(LocalDateTime.now());
            account.setLastSyncStatus("OK — " + total + " transactions");
            qontoAccountRepository.save(account);

            return Map.of("status", "OK", "synced", total, "lastSync", account.getLastSync().toString());

        } catch (Exception e) {
            log.error("Sync Qonto erreur pour user {}: {}", userId, e.getMessage());
            account.setLastSyncStatus("ERREUR: " + e.getMessage());
            qontoAccountRepository.save(account);
            throw new RuntimeException(e.getMessage());
        }
    }

    private int fetchAndSave(AppUser user, QontoAccount account, String iban,
                              LocalDate fromDate, List<ExpenseRule> rules) throws Exception {
        int page = 1;
        int saved = 0;
        String fromStr = fromDate + "T00:00:00.000Z";

        while (true) {
            String path = "/transactions?iban=" + iban
                    + "&settled_at_from=" + fromStr
                    + "&current_page=" + page
                    + "&per_page=100"
                    + "&sorted_by=settled_at:desc";

            Map<String, Object> data = apiGet(path, account.getLogin(), account.getSecretKey());

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> transactions = (List<Map<String, Object>>) data.get("transactions");
            if (transactions == null || transactions.isEmpty()) break;

            for (Map<String, Object> dto : transactions) {
                String qontoId = (String) dto.get("transaction_id");
                if (qontoId == null) continue;

                QontoTransaction tx = transactionRepository.findByUserIdAndQontoId(user.getId(), qontoId)
                        .orElseGet(() -> { QontoTransaction t = new QontoTransaction(); t.setUser(user); t.setQontoId(qontoId); return t; });

                tx.setLabel((String) dto.get("label"));
                tx.setCounterpartyName((String) dto.get("counterparty_name"));
                tx.setStatus((String) dto.get("status"));
                tx.setBankAccountIban(iban);

                String side = (String) dto.get("side");
                tx.setSide(side != null ? side.toUpperCase() : "DEBIT");

                String currency = (String) dto.get("currency");
                tx.setCurrency(currency != null ? currency : "EUR");

                Object amt = dto.get("amount");
                if (amt != null) tx.setAmount(new BigDecimal(amt.toString()));

                String settledAt = (String) dto.get("settled_at");
                if (settledAt != null && settledAt.length() >= 10) {
                    tx.setSettledAt(LocalDate.parse(settledAt.substring(0, 10)));
                }
                String emittedAt = (String) dto.get("emitted_at");
                if (emittedAt != null && emittedAt.length() >= 10) {
                    tx.setEmittedAt(LocalDate.parse(emittedAt.substring(0, 10)));
                }

                categorize(tx, rules);
                transactionRepository.save(tx);
                saved++;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> meta = (Map<String, Object>) data.get("meta");
            if (meta == null || meta.get("next_page") == null) break;
            page = ((Number) meta.get("next_page")).intValue();
        }

        return saved;
    }

    // ─── Categorization ───────────────────────────────────────────────────────

    public void recategorizeAll(Long userId, List<ExpenseRule> rules) {
        List<QontoTransaction> txs = transactionRepository.findByUserIdOrderBySettledAtDescEmittedAtDesc(userId);
        for (QontoTransaction tx : txs) {
            categorize(tx, rules);
            transactionRepository.save(tx);
        }
    }

    public void categorize(QontoTransaction tx, List<ExpenseRule> rules) {
        String label = tx.getLabel() != null ? tx.getLabel().toLowerCase() : "";
        String counterparty = tx.getCounterpartyName() != null ? tx.getCounterpartyName().toLowerCase() : "";

        for (ExpenseRule rule : rules) {
            boolean matchLabel = rule.getKeywords().stream().anyMatch(k -> label.contains(k.toLowerCase()));
            boolean matchAlt = rule.getAltKeywords().stream().anyMatch(k -> counterparty.contains(k.toLowerCase()));

            if (matchLabel || matchAlt) {
                tx.setCategory(rule.getCategory());
                tx.setRuleLabel(rule.getLabel());
                tx.setExpenseRuleId(rule.getId());
                tx.setBeds24PropertyId(rule.getBeds24PropertyId());
                return;
            }
        }

        tx.setCategory(null);
        tx.setRuleLabel(null);
        tx.setExpenseRuleId(null);
        tx.setBeds24PropertyId(null);
    }

    // ─── Scheduled sync ───────────────────────────────────────────────────────

    @Scheduled(cron = "0 30 */2 * * *")
    public void scheduledSync() {
        List<Long> userIds = qontoAccountRepository.findUserIdsWithConnectedAccounts();
        for (Long userId : userIds) {
            try {
                syncTransactions(userId);
                log.info("Sync Qonto OK user {}", userId);
            } catch (Exception e) {
                log.warn("Sync Qonto KO user {}: {}", userId, e.getMessage());
            }
        }
    }

    // ─── HTTP client ──────────────────────────────────────────────────────────

    private Map<String, Object> apiGet(String path, String login, String secretKey) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .header("Authorization", login + ":" + secretKey)
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 401 || response.statusCode() == 403) {
            throw new IllegalStateException("Authentification Qonto refusée (vérifiez login / clé secrète)");
        }
        if (response.statusCode() != 200) {
            throw new IllegalStateException("API Qonto erreur " + response.statusCode());
        }

        return objectMapper.readValue(response.body(), new TypeReference<>() {});
    }
}
