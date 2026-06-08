package com.flowlyrent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.ExpenseRule;
import com.flowlyrent.model.QontoAccount;
import com.flowlyrent.repository.ExpenseRuleRepository;
import com.flowlyrent.repository.QontoAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.util.stream.Stream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/**
 * Accès live à l'API Qonto v2 — aucune donnée de transaction n'est stockée en base.
 * Les transactions sont récupérées, catégorisées en mémoire, puis retournées directement.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class QontoService {

    private static final String BASE_URL = "https://thirdparty.qonto.com/v2";

    private final QontoAccountRepository qontoAccountRepository;
    private final ExpenseRuleRepository expenseRuleRepository;
    private final ObjectMapper objectMapper;

    // ─── Connect / Disconnect ─────────────────────────────────────────────────

    public Map<String, Object> connect(AppUser user, String login, String secretKey) {
        try {
            Map<String, Object> orgData = apiGet("/organization", login, secretKey);
            @SuppressWarnings("unchecked")
            Map<String, Object> org = (Map<String, Object>) orgData.get("organization");
            if (org == null) return Map.of("error", "Réponse inattendue de l'API Qonto");

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
            a.setLogin(null);
            a.setSecretKey(null);
            qontoAccountRepository.save(a);
        });
    }

    // ─── Live fetch transactions ───────────────────────────────────────────────

    public List<Map<String, Object>> fetchTransactions(Long userId, LocalDate from, LocalDate to) {
        QontoAccount account = getAccount(userId);
        List<Map<String, Object>> ibans = getIbans(account);
        List<ExpenseRule> rules = expenseRuleRepository.findByUserIdAndActiveTrue(userId);
        List<Map<String, Object>> result = new ArrayList<>();

        String fromStr = from + "T00:00:00.000Z";
        String toStr = to + "T23:59:59.000Z";

        for (Map<String, Object> ba : ibans) {
            String iban = (String) ba.get("iban");
            if (iban == null) continue;

            int page = 1;
            while (true) {
                try {
                    String path = "/transactions?iban=" + iban
                            + "&settled_at_from=" + fromStr
                            + "&settled_at_to=" + toStr
                            + "&current_page=" + page
                            + "&per_page=100"
                            + "&sorted_by=settled_at:desc";

                    Map<String, Object> data = apiGet(path, account.getLogin(), account.getSecretKey());

                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> transactions = (List<Map<String, Object>>) data.get("transactions");
                    if (transactions == null || transactions.isEmpty()) break;

                    for (Map<String, Object> tx : transactions) {
                        Map<String, Object> enriched = new LinkedHashMap<>(tx);
                        enriched.put("bankAccountIban", iban);
                        categorize(enriched, rules);
                        result.add(enriched);
                    }

                    @SuppressWarnings("unchecked")
                    Map<String, Object> meta = (Map<String, Object>) data.get("meta");
                    if (meta == null || meta.get("next_page") == null) break;
                    page = ((Number) meta.get("next_page")).intValue();
                } catch (Exception e) {
                    log.error("Erreur fetch transactions Qonto iban={}: {}", iban, e.getMessage());
                    break;
                }
            }
        }

        result.sort((a, b) -> {
            String dA = a.getOrDefault("settled_at", "").toString();
            String dB = b.getOrDefault("settled_at", "").toString();
            return dB.compareTo(dA);
        });

        return result;
    }

    // ─── Live summary ─────────────────────────────────────────────────────────

    public Map<String, Object> fetchSummary(Long userId, Integer year, Integer month) {
        LocalDate from, to;
        if (year != null && month != null) {
            YearMonth ym = YearMonth.of(year, month);
            from = ym.atDay(1);
            to = ym.atEndOfMonth();
        } else if (year != null) {
            from = LocalDate.of(year, 1, 1);
            to = LocalDate.of(year, 12, 31);
        } else {
            from = LocalDate.now().withDayOfMonth(1).minusMonths(11);
            to = LocalDate.now();
        }

        List<Map<String, Object>> txs = fetchTransactions(userId, from, to);

        Map<String, BigDecimal> byCategory = new LinkedHashMap<>();
        Map<String, BigDecimal> byMonth = new LinkedHashMap<>();
        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;
        int uncategorized = 0;

        for (Map<String, Object> tx : txs) {
            Object amtObj = tx.get("amount");
            if (amtObj == null) continue;
            BigDecimal amount = new BigDecimal(amtObj.toString());
            String side = tx.getOrDefault("side", "debit").toString().toUpperCase();

            if ("DEBIT".equals(side)) {
                totalDebits = totalDebits.add(amount);
            } else {
                totalCredits = totalCredits.add(amount);
            }

            String cat = tx.get("category") != null ? tx.get("category").toString() : null;
            if (cat == null) { uncategorized++; cat = "NON_CATEGORISE"; }
            byCategory.merge(cat, amount, BigDecimal::add);

            String settledAt = tx.getOrDefault("settled_at", "").toString();
            if (settledAt.length() >= 7 && "DEBIT".equals(side)) {
                String monthKey = settledAt.substring(0, 7);
                byMonth.merge(monthKey, amount, BigDecimal::add);
            }
        }

        return Map.of(
                "from", from.toString(),
                "to", to.toString(),
                "totalDebits", totalDebits,
                "totalCredits", totalCredits,
                "transactionCount", txs.size(),
                "uncategorized", uncategorized,
                "byCategory", byCategory,
                "byMonth", byMonth
        );
    }

    // ─── Categorization (in-memory) ───────────────────────────────────────────

    private void categorize(Map<String, Object> tx, List<ExpenseRule> rules) {
        String fullText = Stream.of("label", "counterparty_name", "reference", "note")
                .map(f -> tx.get(f) != null ? tx.get(f).toString() : "")
                .collect(java.util.stream.Collectors.joining(" "))
                .toLowerCase();

        for (ExpenseRule rule : rules) {
            boolean match = Stream.concat(rule.getKeywords().stream(), rule.getAltKeywords().stream())
                    .anyMatch(k -> fullText.contains(k.toLowerCase()));
            if (match) {
                tx.put("category", rule.getLabel());
                tx.put("ruleLabel", rule.getLabel());
                tx.put("expenseRuleId", rule.getId());
                tx.put("beds24PropertyId", rule.getBeds24PropertyId());
                return;
            }
        }
        tx.put("category", null);
        tx.put("ruleLabel", null);
        tx.put("expenseRuleId", null);
        tx.put("beds24PropertyId", null);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private QontoAccount getAccount(Long userId) {
        QontoAccount account = qontoAccountRepository.findByAppUserId(userId)
                .orElseThrow(() -> new IllegalStateException("Compte Qonto non connecté"));
        if (!account.isConnected() || account.getSecretKey() == null) {
            throw new IllegalStateException("Compte Qonto non connecté");
        }
        return account;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getIbans(QontoAccount account) {
        try {
            Map<String, Object> orgData = apiGet("/organization", account.getLogin(), account.getSecretKey());
            Map<String, Object> org = (Map<String, Object>) orgData.get("organization");
            if (org == null) return List.of();
            List<Map<String, Object>> accounts = (List<Map<String, Object>>) org.get("bank_accounts");
            return accounts != null ? accounts : List.of();
        } catch (Exception e) {
            log.error("Impossible de récupérer les comptes Qonto: {}", e.getMessage());
            return List.of();
        }
    }

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
