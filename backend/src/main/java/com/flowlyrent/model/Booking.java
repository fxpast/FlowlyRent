package com.flowlyrent.model;

import com.flowlyrent.model.enums.BookingSource;
import com.flowlyrent.model.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Miroir exact des 72 colonnes de la table booking Beds24.
 * propertyId est mappé comme FK vers notre table properties.
 * Les helpers @Transient assurent la compatibilité avec le reste de FlowlyRent.
 */
@Entity
@Table(name = "bookings")
@Data
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // propertyId = FK vers notre table properties (remplace l'int Beds24)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "propertyId")
    private Property property;

    private Long masterId;
    private Long roomId;
    private Long unitId;
    private Integer roomQty;
    private Long offerId;

    // Statut brut Beds24 : "confirmed", "cancelled", "closed", "new", "request"
    private String status;
    private String subStatus;
    private Integer statusCode;

    private LocalDate arrival;
    private LocalDate departure;

    private Integer numAdult;
    private Integer numChild;

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
    private String guests;      // noms des voyageurs supplémentaires
    private String country;
    private String country2;
    private String lang;

    private String arrivalTime;
    private String voucher;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(columnDefinition = "TEXT", name = "groupNote")
    private String groupNote;

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

    @Column(name = "flagColor")   private String flagColor;
    @Column(name = "flagText")    private String flagText;

    private String channel;
    private String referer;
    @Column(name = "refererEditable") private String refererEditable;

    private String reference;     // code de réservation / confirmation

    @Column(name = "apiSourceId") private Integer apiSourceId;
    @Column(name = "apiSource")   private String apiSource;
    @Column(name = "apiReference") private String apiReference;

    @Column(name = "allowChannelUpdate") private String allowChannelUpdate;
    @Column(name = "allowAutoAction")    private String allowAutoAction;
    @Column(name = "allowReview")        private String allowReview;
    @Column(name = "allowCancellation")  private String allowCancellation;

    @Column(name = "invoiceeId") private Integer invoiceeId;

    @Column(name = "bookingTime")  private LocalDateTime bookingTime;
    @Column(name = "modifiedTime") private LocalDateTime modifiedTime;
    @Column(name = "cancelTime")   private LocalDateTime cancelTime;

    @Column(name = "infoItems")   private String infoItems;

    @Column(columnDefinition = "TEXT", name = "invoiceItems")
    private String invoiceItems;

    @Column(precision = 10, scale = 2) private BigDecimal price;
    @Column(precision = 10, scale = 2) private BigDecimal deposit;
    @Column(precision = 10, scale = 2) private BigDecimal tax;
    @Column(precision = 10, scale = 2) private BigDecimal commission;

    @Column(columnDefinition = "TEXT", name = "rateDescription")
    private String rateDescription;

    @Column(name = "stripeToken") private String stripeToken;

    @Column(columnDefinition = "TEXT", name = "apiMessage")
    private String apiMessage;

    // -------------------------------------------------------------------------
    // Helpers @Transient — compatibilité FlowlyRent
    // -------------------------------------------------------------------------

    @Transient
    public BookingStatus getBookingStatus() {
        if (status == null) return BookingStatus.PENDING;
        return switch (status.toLowerCase()) {
            case "cancelled", "canceled" -> BookingStatus.CANCELLED;
            case "closed", "completed"   -> BookingStatus.COMPLETED;
            case "confirmed"             -> BookingStatus.CONFIRMED;
            default                      -> BookingStatus.PENDING;
        };
    }

    @Transient
    public BookingSource getBookingSource() {
        String val = channel != null ? channel : (referer != null ? referer : "");
        String lower = val.toLowerCase();
        if (lower.contains("airbnb"))   return BookingSource.AIRBNB;
        if (lower.contains("booking"))  return BookingSource.BOOKING_COM;
        if (lower.contains("abritel") || lower.contains("homeaway") || lower.contains("vrbo"))
            return BookingSource.ABRITEL;
        if (lower.isBlank())            return BookingSource.DIRECT;
        return BookingSource.BEDS24;
    }

    @Transient public LocalDate  getCheckIn()          { return arrival; }
    @Transient public LocalDate  getCheckOut()         { return departure; }
    @Transient public String     getConfirmationCode() { return reference; }
    @Transient public LocalDateTime getCreatedAt()     { return bookingTime; }
    @Transient public BigDecimal getTotalAmount()      { return price; }
    @Transient public Integer    getGuestCount()       { return numAdult; }
    @Transient public String     getExternalId()       { return apiReference; }

    // Setters alias pour le service
    @Transient public void setCheckIn(LocalDate d)           { this.arrival   = d; }
    @Transient public void setCheckOut(LocalDate d)          { this.departure = d; }
    @Transient public void setConfirmationCode(String c)     { this.reference = c; }
    @Transient public void setTotalAmount(BigDecimal a)      { this.price = a; }
    @Transient public void setGuestCount(Integer n)          { this.numAdult = n; }
    @Transient public void setExternalId(String s)           { this.apiReference = s; }

    public void applyStatus(BookingStatus bs) {
        if (bs == null) { this.status = null; return; }
        this.status = switch (bs) {
            case CONFIRMED  -> "confirmed";
            case CANCELLED  -> "cancelled";
            case COMPLETED  -> "closed";
            default         -> "new";
        };
    }

    public void applySource(BookingSource src) {
        if (src == null) return;
        this.channel = switch (src) {
            case AIRBNB       -> "airbnb";
            case BOOKING_COM  -> "booking";
            case ABRITEL      -> "abritel";
            case DIRECT       -> "direct";
            default           -> "beds24";
        };
    }

    public long getNightsCount() {
        if (arrival == null || departure == null) return 0;
        return ChronoUnit.DAYS.between(arrival, departure);
    }

    public String getGuestFullName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}
