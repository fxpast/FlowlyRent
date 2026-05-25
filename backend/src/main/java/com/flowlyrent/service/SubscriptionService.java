package com.flowlyrent.service;

import com.flowlyrent.model.AppUser;
import com.flowlyrent.model.enums.SubscriptionPlan;
import com.flowlyrent.repository.AppUserRepository;
import com.stripe.Stripe;
import com.stripe.model.Customer;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.model.checkout.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final AppUserRepository userRepository;

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${stripe.price.starter:}")
    private String priceStarter;

    @Value("${stripe.price.pro:}")
    private String pricePro;

    @Value("${stripe.price.agence:}")
    private String priceAgence;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public Map<String, Object> getSubscriptionInfo(AppUser user) {
        Map<String, Object> info = new HashMap<>();
        info.put("plan", user.getPlan().name());
        info.put("stripeSubscriptionId", user.getStripeSubscriptionId());
        info.put("planExpiresAt", user.getPlanExpiresAt());
        info.put("maxProperties", getMaxProperties(user.getPlan()));
        return info;
    }

    @Transactional
    public Map<String, Object> createCheckoutSession(AppUser user, String planName, String successUrl, String cancelUrl) throws Exception {
        SubscriptionPlan plan = SubscriptionPlan.valueOf(planName.toUpperCase());
        String priceId = getPriceId(plan);
        if (priceId == null || priceId.isBlank()) {
            throw new IllegalArgumentException("Plan non disponible ou non configuré : " + planName);
        }

        String customerId = user.getStripeCustomerId();
        if (customerId == null || customerId.isBlank()) {
            Customer customer = Customer.create(CustomerCreateParams.builder()
                    .setEmail(user.getEmail())
                    .setName(user.getFullName().trim())
                    .putMetadata("userId", user.getId().toString())
                    .build());
            customerId = customer.getId();
            user.setStripeCustomerId(customerId);
            userRepository.save(user);
        }

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setCustomer(customerId)
                .setSuccessUrl(successUrl != null ? successUrl : "http://localhost:4200/admin/settings?subscription=success")
                .setCancelUrl(cancelUrl != null ? cancelUrl : "http://localhost:4200/admin/settings?subscription=cancelled")
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setPrice(priceId)
                        .setQuantity(1L)
                        .build())
                .putMetadata("userId", user.getId().toString())
                .putMetadata("plan", plan.name())
                .build();

        Session session = Session.create(params);
        return Map.of("url", session.getUrl(), "sessionId", session.getId());
    }

    @Transactional
    public void cancelSubscription(AppUser user) throws Exception {
        if (user.getStripeSubscriptionId() == null) return;

        Subscription sub = Subscription.retrieve(user.getStripeSubscriptionId());
        sub.cancel();

        user.setPlan(SubscriptionPlan.FREE);
        user.setStripeSubscriptionId(null);
        user.setPlanExpiresAt(null);
        userRepository.save(user);
        log.info("Abonnement annulé pour {}", user.getEmail());
    }

    @Transactional
    public void handleSubscriptionEvent(Event event) {
        switch (event.getType()) {
            case "checkout.session.completed" -> {
                Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                if (session != null && "subscription".equals(session.getMode())) {
                    String userId = session.getMetadata().get("userId");
                    String planName = session.getMetadata().get("plan");
                    if (userId != null && planName != null) {
                        userRepository.findById(Long.parseLong(userId)).ifPresent(user -> {
                            user.setPlan(SubscriptionPlan.valueOf(planName));
                            user.setStripeSubscriptionId(session.getSubscription());
                            userRepository.save(user);
                            log.info("Abonnement {} activé pour {}", planName, user.getEmail());
                        });
                    }
                }
            }
            case "customer.subscription.updated" -> {
                Subscription sub = (Subscription) event.getDataObjectDeserializer().getObject().orElse(null);
                if (sub != null) updatePlanFromSubscription(sub);
            }
            case "customer.subscription.deleted" -> {
                Subscription sub = (Subscription) event.getDataObjectDeserializer().getObject().orElse(null);
                if (sub != null) {
                    userRepository.findByStripeCustomerId(sub.getCustomer()).ifPresent(user -> {
                        user.setPlan(SubscriptionPlan.FREE);
                        user.setStripeSubscriptionId(null);
                        user.setPlanExpiresAt(null);
                        userRepository.save(user);
                        log.info("Abonnement supprimé pour {}, plan → FREE", user.getEmail());
                    });
                }
            }
            case "invoice.payment_failed" -> log.warn("Échec paiement abonnement : {}", event.getId());
        }
    }

    public int getMaxProperties(SubscriptionPlan plan) {
        return switch (plan) {
            case FREE -> 1;
            case STARTER -> 3;
            case PRO, AGENCE -> Integer.MAX_VALUE;
        };
    }

    private void updatePlanFromSubscription(Subscription sub) {
        userRepository.findByStripeCustomerId(sub.getCustomer()).ifPresent(user -> {
            String priceId = sub.getItems().getData().get(0).getPrice().getId();
            SubscriptionPlan plan = getPlanFromPriceId(priceId);
            if (plan != null) {
                user.setPlan(plan);
                user.setStripeSubscriptionId(sub.getId());
                if (sub.getCurrentPeriodEnd() != null) {
                    user.setPlanExpiresAt(LocalDateTime.ofEpochSecond(sub.getCurrentPeriodEnd(), 0, ZoneOffset.UTC));
                }
                userRepository.save(user);
                log.info("Plan mis à jour : {} → {}", user.getEmail(), plan);
            }
        });
    }

    private String getPriceId(SubscriptionPlan plan) {
        return switch (plan) {
            case STARTER -> priceStarter;
            case PRO -> pricePro;
            case AGENCE -> priceAgence;
            case FREE -> null;
        };
    }

    private SubscriptionPlan getPlanFromPriceId(String priceId) {
        if (priceId == null) return null;
        if (priceId.equals(priceStarter)) return SubscriptionPlan.STARTER;
        if (priceId.equals(pricePro)) return SubscriptionPlan.PRO;
        if (priceId.equals(priceAgence)) return SubscriptionPlan.AGENCE;
        return null;
    }
}
