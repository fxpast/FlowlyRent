package com.flowlyrent.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Beds24BookingDTO {

    // Identifiants
    private Long id;
    private Long masterId;
    private Long propertyId;
    private Long roomId;
    private Long unitId;
    private Long offerId;
    private String reference;
    private String apiReference;
    private Integer apiSourceId;
    private String apiSource;

    // Dates — format "yyyy-MM-dd" dans l'API
    private LocalDate arrival;
    private LocalDate departure;
    private String arrivalTime;

    // Statut
    private String status;      // confirmed, cancelled, closed, new, request
    private String subStatus;
    private Integer statusCode;

    // Voyageurs
    private Integer numAdult;
    private Integer numChild;
    private Integer roomQty;

    // Coordonnées client
    private String title;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String mobile;
    private String fax;
    private String company;
    private String address;
    private String city;
    private String state;
    private String postcode;
    private String country;
    private String country2;
    private String lang;

    // Canal — "airbnb"/"booking"/"direct" (channel) + "Airbnb"/"Booking.com" (referer)
    private String channel;
    private String referer;
    private String refererEditable;

    // Financier
    private BigDecimal price;
    private BigDecimal deposit;
    private BigDecimal tax;
    private BigDecimal commission;
    private String rateDescription;

    // Notes
    private String comments;
    private String notes;
    private String message;
    private String groupNote;

    // Champs personnalisés
    private String custom1;
    private String custom2;
    private String custom3;
    private String custom4;
    private String custom5;
    private String custom6;
    private String custom7;
    private String custom8;
    private String custom9;
    private String custom10;

    // Indicateurs
    private String flagColor;
    private String flagText;
    private String voucher;

    // Facture
    private Integer invoiceeId;

    // Stripe (token Beds24, distinct du nôtre)
    private String stripeToken;

    // Message interne API
    private String apiMessage;

    // Horodatages — format ISO avec timezone "Z" : "2026-05-23T11:33:17Z"
    private ZonedDateTime bookingTime;
    private ZonedDateTime modifiedTime;
    private ZonedDateTime cancelTime;
}
