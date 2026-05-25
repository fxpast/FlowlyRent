package com.flowlyrent.service;

import com.flowlyrent.model.Booking;
import com.flowlyrent.model.Payment;
import com.flowlyrent.model.enums.PaymentStatus;
import com.flowlyrent.repository.BookingRepository;
import com.flowlyrent.repository.PaymentRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final EmailService emailService;
    private final SubscriptionService subscriptionService;

    @Value("${stripe.secret-key}")
    private String stripeSecretKey;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    @Transactional
    public Map<String, Object> createCheckoutSession(Long bookingId, String successUrl, String cancelUrl) throws Exception {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + bookingId));

        long amountCents = booking.getTotalAmount().multiply(java.math.BigDecimal.valueOf(100)).longValue();

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl != null ? successUrl : "http://localhost:4200/admin/payments?success=true")
                .setCancelUrl(cancelUrl != null ? cancelUrl : "http://localhost:4200/admin/payments?cancelled=true")
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency("eur")
                                .setUnitAmount(amountCents)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName("Réservation " + booking.getConfirmationCode())
                                        .setDescription(booking.getProperty().getName() + " - " +
                                                booking.getCheckIn() + " au " + booking.getCheckOut())
                                        .build())
                                .build())
                        .build())
                .putMetadata("bookingId", bookingId.toString())
                .putMetadata("confirmationCode", booking.getConfirmationCode())
                .setCustomerEmail(booking.getEmail())
                .build();

        Session session = Session.create(params);

        Payment payment = paymentRepository.findByBookingId(bookingId).orElse(new Payment());
        payment.setBooking(booking);
        payment.setAmount(booking.getTotalAmount());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setStripeCheckoutSessionId(session.getId());
        paymentRepository.save(payment);

        Map<String, Object> result = new HashMap<>();
        result.put("sessionId", session.getId());
        result.put("url", session.getUrl());
        return result;
    }

    @Transactional
    public Map<String, Object> createPaymentIntent(Long bookingId) throws Exception {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Réservation introuvable: " + bookingId));

        long amountCents = booking.getTotalAmount().multiply(java.math.BigDecimal.valueOf(100)).longValue();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountCents)
                .setCurrency("eur")
                .setReceiptEmail(booking.getEmail())
                .putMetadata("bookingId", bookingId.toString())
                .setDescription("Réservation " + booking.getConfirmationCode())
                .build();

        PaymentIntent intent = PaymentIntent.create(params);

        Payment payment = paymentRepository.findByBookingId(bookingId).orElse(new Payment());
        payment.setBooking(booking);
        payment.setAmount(booking.getTotalAmount());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setStripePaymentIntentId(intent.getId());
        paymentRepository.save(payment);

        Map<String, Object> result = new HashMap<>();
        result.put("clientSecret", intent.getClientSecret());
        result.put("paymentIntentId", intent.getId());
        return result;
    }

    @Transactional
    public void handleWebhook(String payload, String sigHeader) throws Exception {
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (SignatureVerificationException e) {
            throw new IllegalArgumentException("Signature Stripe invalide");
        }

        switch (event.getType()) {
            case "checkout.session.completed" -> {
                Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
                if (session != null) {
                    if ("subscription".equals(session.getMode())) {
                        subscriptionService.handleSubscriptionEvent(event);
                    } else {
                        paymentRepository.findByStripeCheckoutSessionId(session.getId()).ifPresent(p -> {
                            p.setStatus(PaymentStatus.COMPLETED);
                            p.setPaidAt(LocalDateTime.now());
                            paymentRepository.save(p);
                            try { emailService.sendPaymentReceipt(p.getBooking(), p.getAmount()); } catch (Exception ignored) {}
                        });
                    }
                }
            }
            case "customer.subscription.updated", "customer.subscription.deleted", "invoice.payment_failed" ->
                subscriptionService.handleSubscriptionEvent(event);
            case "payment_intent.succeeded" -> {
                PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer().getObject().orElse(null);
                if (intent != null) {
                    paymentRepository.findByStripePaymentIntentId(intent.getId()).ifPresent(p -> {
                        p.setStatus(PaymentStatus.COMPLETED);
                        p.setStripeChargeId(intent.getLatestCharge());
                        p.setPaidAt(LocalDateTime.now());
                        paymentRepository.save(p);
                        BigDecimal amount = p.getAmount() != null ? p.getAmount()
                                : BigDecimal.valueOf(intent.getAmount()).divide(BigDecimal.valueOf(100));
                        try { emailService.sendPaymentReceipt(p.getBooking(), amount); } catch (Exception ignored) {}
                    });
                }
            }
            case "payment_intent.payment_failed" -> {
                PaymentIntent intent = (PaymentIntent) event.getDataObjectDeserializer().getObject().orElse(null);
                if (intent != null) {
                    paymentRepository.findByStripePaymentIntentId(intent.getId()).ifPresent(p -> {
                        p.setStatus(PaymentStatus.FAILED);
                        paymentRepository.save(p);
                    });
                }
            }
            default -> log.debug("Événement Stripe ignoré: {}", event.getType());
        }
    }

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }
}
