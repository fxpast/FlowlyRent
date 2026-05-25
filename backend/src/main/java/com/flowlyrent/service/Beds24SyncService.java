package com.flowlyrent.service;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowlyrent.dto.*;
import com.flowlyrent.model.*;
import com.flowlyrent.model.enums.TaskStatus;
import com.flowlyrent.model.enums.TaskType;
import com.flowlyrent.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class Beds24SyncService {

    private static final String BEDS24_API = "https://beds24.com/api/v2";

    private final Beds24AccountRepository beds24AccountRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyRoomRepository propertyRoomRepository;
    private final BookingRepository bookingRepository;
    private final HousekeepingTaskRepository housekeepingTaskRepository;
    private final ObjectMapper objectMapper;

    // -------------------------------------------------------------------------
    // Connexion initiale (code d'invitation → refreshToken + accessToken)
    // Beds24 API v2 : GET /authentication/setup avec header "code: <invite_code>"
    // -------------------------------------------------------------------------

    @Transactional
    public void connectWithSetupToken(Beds24Account account, String inviteCode) throws Exception {
        log.info("[Beds24] GET {}/authentication/setup (code: {}...)", BEDS24_API, inviteCode.length() > 8 ? inviteCode.substring(0, 8) : "***");

        String responseBody;
        try {
            responseBody = getWithHeader(BEDS24_API + "/authentication/setup", "code", inviteCode);
        } catch (RuntimeException e) {
            log.error("[Beds24] Erreur setup : {}", e.getMessage());
            throw new RuntimeException("Code invalide ou expiré. Générez un nouveau code dans Beds24 : Settings → Apps & Integrations → API.");
        }

        log.info("[Beds24] Réponse setup : {}", responseBody);
        Beds24AuthDTO auth = objectMapper.readValue(responseBody, Beds24AuthDTO.class);

        if (auth.getRefreshToken() == null) {
            String msg = auth.getError() != null ? auth.getError() : "Réponse inattendue";
            throw new RuntimeException("Code Beds24 invalide : " + msg);
        }

        saveTokens(account, auth.getRefreshToken(), auth.getToken(), auth.getExpiresIn());
        syncAll(account);
    }

    private void saveTokens(Beds24Account account, String refreshToken, String accessToken, Integer expiresIn) {
        account.setRefreshToken(refreshToken);
        if (accessToken != null) {
            account.setAccessToken(accessToken);
            account.setTokenExpiresAt(expiryFrom(expiresIn));
        }
        account.setConnected(true);
        beds24AccountRepository.save(account);
    }

    private void syncAll(Beds24Account account) throws Exception {
        syncUserProperties(account);
        syncUserRooms(account);
        syncUserBookings(account);
    }

    // -------------------------------------------------------------------------
    // Rafraîchissement du token
    // -------------------------------------------------------------------------

    @Transactional
    public String getValidToken(Beds24Account account) throws Exception {
        if (isTokenValid(account)) return account.getAccessToken();

        if (account.getRefreshToken() == null || account.getRefreshToken().isBlank()) {
            throw new RuntimeException("Refresh token manquant — reconnectez votre compte Beds24.");
        }

        String responseBody = getWithHeader(BEDS24_API + "/authentication/token", "refreshToken", account.getRefreshToken());
        Beds24AuthDTO auth = objectMapper.readValue(responseBody, Beds24AuthDTO.class);

        if (auth.getToken() == null) {
            account.setConnected(false);
            beds24AccountRepository.save(account);
            throw new RuntimeException("Session Beds24 expirée — reconnectez votre compte Beds24.");
        }

        account.setAccessToken(auth.getToken());
        account.setTokenExpiresAt(expiryFrom(auth.getExpiresIn()));
        beds24AccountRepository.save(account);
        return auth.getToken();
    }

    private boolean isTokenValid(Beds24Account account) {
        return account.getAccessToken() != null
                && account.getTokenExpiresAt() != null
                && LocalDateTime.now().isBefore(account.getTokenExpiresAt().minusMinutes(5));
    }

    private LocalDateTime expiryFrom(Integer expiresIn) {
        return LocalDateTime.now().plusSeconds(expiresIn != null ? expiresIn : 3600);
    }

    // -------------------------------------------------------------------------
    // Sync planifié (toutes les 2h)
    // -------------------------------------------------------------------------

    @Scheduled(cron = "${sync.ical.cron:0 0 */2 * * *}")
    public void scheduledSync() {
        log.info("Synchronisation Beds24 planifiée — {} comptes actifs",
                beds24AccountRepository.findByConnectedTrue().size());
        beds24AccountRepository.findByConnectedTrue().forEach(account -> {
            try {
                syncUserProperties(account);
                syncUserRooms(account);
                syncUserBookings(account);
            } catch (Exception e) {
                log.error("Erreur sync Beds24 user {} : {}", account.getAppUser().getId(), e.getMessage());
            }
        });
    }

    // -------------------------------------------------------------------------
    // Sync des propriétés
    // -------------------------------------------------------------------------

    @Transactional
    public int syncUserProperties(Beds24Account account) throws Exception {
        String token = getValidToken(account);
        List<Beds24PropertyDTO> beds24Props = fetchAll("/properties", token, Beds24PropertyDTO.class);

        AppUser user = account.getAppUser();
        int synced = 0;

        for (Beds24PropertyDTO dto : beds24Props) {
            if (dto.getId() == null) continue;
            String beds24Id = String.valueOf(dto.getId());

            Property property = propertyRepository.findByAppUserAndBeds24PropId(user, beds24Id)
                    .orElseGet(Property::new);

            property.setAppUser(user);
            property.setBeds24PropId(beds24Id);
            if (dto.getName() != null)         property.setName(dto.getName());
            if (dto.getCity() != null)         property.setCity(dto.getCity());
            if (dto.getCountry() != null)      property.setCountry(dto.getCountry());
            if (dto.getAddress() != null)      property.setAddress(dto.getAddress());
            if (dto.getState() != null)        property.setAddress(
                    (dto.getAddress() != null ? dto.getAddress() + ", " : "") + dto.getState());
            if (dto.getPropertyType() != null) property.setPropertyType(dto.getPropertyType());
            if (dto.getLatitude() != null)     property.setLatitude(dto.getLatitude());
            if (dto.getLongitude() != null)    property.setLongitude(dto.getLongitude());
            if (dto.getCheckInStart() != null) property.setCheckInTime(dto.getCheckInStart());
            if (dto.getCheckOutEnd() != null)  property.setCheckOutTime(dto.getCheckOutEnd());
            property.setActive(true);

            propertyRepository.save(property);
            synced++;
        }

        log.info("Beds24 sync propriétés user {} : {} propriétés", user.getId(), synced);
        return synced;
    }

    // -------------------------------------------------------------------------
    // Sync des chambres/unités
    // -------------------------------------------------------------------------

    @Transactional
    public int syncUserRooms(Beds24Account account) throws Exception {
        String token = getValidToken(account);
        AppUser user = account.getAppUser();

        List<Property> properties = propertyRepository.findByAppUser(user);
        int synced = 0;

        for (Property property : properties) {
            if (property.getBeds24PropId() == null) continue;
            try {
                String endpoint = "/properties/" + property.getBeds24PropId() + "/rooms";
                List<Beds24RoomDTO> rooms = fetchAll(endpoint, token, Beds24RoomDTO.class);

                for (Beds24RoomDTO dto : rooms) {
                    if (dto.getId() == null) continue;
                    String beds24RoomId = String.valueOf(dto.getId());

                    PropertyRoom room = propertyRoomRepository
                            .findByPropertyAndBeds24RoomId(property, beds24RoomId)
                            .orElseGet(PropertyRoom::new);

                    room.setProperty(property);
                    room.setBeds24RoomId(beds24RoomId);
                    if (dto.getName() != null)      room.setName(dto.getName());
                    if (dto.getDescription() != null) room.setDescription(dto.getDescription());
                    if (dto.getMaxPeople() != null) room.setMaxGuests(dto.getMaxPeople());
                    if (dto.getQty() != null)       room.setQty(dto.getQty());
                    if (dto.getRoomType() != null)  room.setRoomType(dto.getRoomType());
                    if (dto.getBedType() != null)   room.setBedType(dto.getBedType());
                    room.setActive(dto.getActive() == null || dto.getActive());

                    propertyRoomRepository.save(room);
                    synced++;
                }
            } catch (Exception e) {
                log.warn("Impossible de récupérer les chambres pour la propriété {} : {}",
                        property.getBeds24PropId(), e.getMessage());
            }
        }

        log.info("Beds24 sync chambres user {} : {} chambres", user.getId(), synced);
        return synced;
    }

    // -------------------------------------------------------------------------
    // Sync des réservations
    // -------------------------------------------------------------------------

    @Transactional
    public int syncUserBookings(Beds24Account account) throws Exception {
        String token = getValidToken(account);
        AppUser user = account.getAppUser();

        String endpoint = "/bookings";
        if (account.getLastSync() != null) {
            String modifiedFrom = account.getLastSync()
                    .minusHours(1)
                    .atZone(ZoneOffset.UTC)
                    .format(DateTimeFormatter.ISO_INSTANT);
            endpoint += "?modifiedFrom=" + modifiedFrom;
        } else {
            endpoint += "?arrivalFrom=" + LocalDate.now().minusMonths(6);
        }

        List<Beds24BookingDTO> bookings = fetchAll(endpoint, token, Beds24BookingDTO.class);

        int imported = 0;
        for (Beds24BookingDTO dto : bookings) {
            if (processBooking(dto, user)) imported++;
        }

        account.setLastSync(LocalDateTime.now());
        account.setLastSyncStatus("OK — " + imported + " réservations");
        beds24AccountRepository.save(account);

        log.info("Beds24 sync réservations user {} : {} importées/mises à jour", user.getId(), imported);
        return imported;
    }

    private boolean processBooking(Beds24BookingDTO dto, AppUser user) {
        try {
            if (dto.getId() == null || dto.getPropertyId() == null) return false;

            Property property = propertyRepository
                    .findByAppUserAndBeds24PropId(user, String.valueOf(dto.getPropertyId()))
                    .orElse(null);
            if (property == null) return false;

            LocalDate checkIn  = dto.getArrival();
            LocalDate checkOut = dto.getDeparture();
            if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) return false;

            String beds24Key = "beds24-" + dto.getId();
            boolean isCancelled = dto.getStatus() != null &&
                    (dto.getStatus().equalsIgnoreCase("cancelled") || dto.getStatus().equalsIgnoreCase("canceled"));

            Booking booking = bookingRepository.findByApiReference(beds24Key)
                    .orElseGet(Booking::new);

            if (isCancelled) {
                if (booking.getId() != null) {
                    booking.setStatus("cancelled");
                    bookingRepository.save(booking);
                }
                return booking.getId() != null;
            }

            booking.setProperty(property);

            // ID + référence
            booking.setApiReference("beds24-" + dto.getId());  // clé de déduplication FlowlyRent
            if (booking.getReference() == null) {
                booking.setReference(dto.getReference() != null && !dto.getReference().isBlank()
                        ? dto.getReference() : "B24-" + dto.getId());
            }

            // IDs Beds24
            booking.setMasterId(dto.getMasterId());
            booking.setRoomId(dto.getRoomId());
            booking.setUnitId(dto.getUnitId());
            booking.setRoomQty(dto.getRoomQty());
            booking.setOfferId(dto.getOfferId());

            // Statut brut (chaîne Beds24)
            booking.setStatus(dto.getStatus() != null ? dto.getStatus().toLowerCase() : "confirmed");
            booking.setSubStatus(dto.getSubStatus());
            booking.setStatusCode(dto.getStatusCode());

            // Dates
            booking.setArrival(checkIn);
            booking.setDeparture(checkOut);
            booking.setArrivalTime(dto.getArrivalTime());
            if (dto.getBookingTime()  != null) booking.setBookingTime(dto.getBookingTime().toLocalDateTime());
            if (dto.getModifiedTime() != null) booking.setModifiedTime(dto.getModifiedTime().toLocalDateTime());
            if (dto.getCancelTime()   != null) booking.setCancelTime(dto.getCancelTime().toLocalDateTime());

            // Voyageurs
            booking.setNumAdult(dto.getNumAdult() != null ? dto.getNumAdult() : 1);
            booking.setNumChild(dto.getNumChild());
            booking.setTitle(dto.getTitle());
            booking.setFirstName(dto.getFirstName());
            booking.setLastName(dto.getLastName());
            booking.setEmail(dto.getEmail());
            booking.setPhone(dto.getPhone());
            booking.setMobile(dto.getMobile());
            booking.setFax(dto.getFax());
            booking.setCompany(dto.getCompany());
            booking.setAddress(dto.getAddress());
            booking.setCity(dto.getCity());
            booking.setState(dto.getState());
            booking.setPostcode(dto.getPostcode());
            booking.setCountry(dto.getCountry());
            booking.setCountry2(dto.getCountry2());
            booking.setLang(dto.getLang());

            // Canal
            booking.setChannel(dto.getChannel());
            booking.setReferer(dto.getReferer());
            booking.setRefererEditable(dto.getRefererEditable());

            // Financier
            booking.setPrice(dto.getPrice() != null ? dto.getPrice() : BigDecimal.ZERO);
            booking.setDeposit(dto.getDeposit());
            booking.setTax(dto.getTax());
            booking.setCommission(dto.getCommission());
            booking.setRateDescription(dto.getRateDescription());

            // Notes
            booking.setComments(dto.getComments());
            booking.setNotes(dto.getNotes());
            booking.setMessage(dto.getMessage());
            booking.setGroupNote(dto.getGroupNote());

            // Champs personnalisés
            booking.setCustom1(dto.getCustom1());
            booking.setCustom2(dto.getCustom2());
            booking.setCustom3(dto.getCustom3());
            booking.setCustom4(dto.getCustom4());
            booking.setCustom5(dto.getCustom5());
            booking.setCustom6(dto.getCustom6());
            booking.setCustom7(dto.getCustom7());
            booking.setCustom8(dto.getCustom8());
            booking.setCustom9(dto.getCustom9());
            booking.setCustom10(dto.getCustom10());

            // Indicateurs
            booking.setFlagColor(dto.getFlagColor());
            booking.setFlagText(dto.getFlagText());
            booking.setVoucher(dto.getVoucher());

            // API
            booking.setInvoiceeId(dto.getInvoiceeId());
            booking.setApiSourceId(dto.getApiSourceId());
            booking.setApiSource(dto.getApiSource());
            booking.setStripeToken(dto.getStripeToken());
            booking.setApiMessage(dto.getApiMessage());

            boolean isNew = booking.getId() == null;
            bookingRepository.save(booking);

            // Tâche ménage auto sur la date de départ pour toute nouvelle réservation confirmée
            if (isNew && "confirmed".equalsIgnoreCase(dto.getStatus())) {
                generateCheckoutTask(booking);
            }

            return true;
        } catch (Exception e) {
            log.warn("Réservation Beds24 {} ignorée : {}", dto.getId(), e.getMessage());
            return false;
        }
    }

    private void generateCheckoutTask(Booking booking) {
        if (housekeepingTaskRepository.findByBooking(booking).isPresent()) return;

        HousekeepingTask task = new HousekeepingTask();
        task.setProperty(booking.getProperty());
        task.setBooking(booking);
        task.setType(TaskType.CHECKOUT_CLEANING);
        task.setScheduledDate(booking.getDeparture());
        task.setStatus(TaskStatus.PENDING);
        housekeepingTaskRepository.save(task);
    }

    // -------------------------------------------------------------------------
    // HTTP + parsing avec gestion du wrapper {"success":true,"data":[...]}
    // -------------------------------------------------------------------------

    private <T> List<T> fetchAll(String endpoint, String token, Class<T> itemType) throws Exception {
        List<T> result = new ArrayList<>();
        String url = endpoint.startsWith("http") ? endpoint : BEDS24_API + endpoint;

        while (url != null) {
            String body = get(url, token);
            JavaType responseType = objectMapper.getTypeFactory()
                    .constructParametricType(Beds24ApiResponse.class, itemType);
            Beds24ApiResponse<T> response = objectMapper.readValue(body, responseType);

            if (!response.isSuccess() || response.getData() == null) break;
            result.addAll(response.getData());

            Beds24ApiResponse.Pages pages = response.getPages();
            url = (pages != null && pages.isNextPageExists() && pages.getNextPageLink() != null)
                    ? pages.getNextPageLink() : null;
        }
        return result;
    }

    private String get(String url, String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .GET();
        if (token != null) builder.header("token", token);
        return send(builder.build());
    }

    private String getWithHeader(String url, String headerName, String headerValue) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .header(headerName, headerValue)
                .GET()
                .build();
        return send(request);
    }

    private String post(String url, String token, String jsonBody) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody));
        if (token != null) builder.header("token", token);
        return send(builder.build());
    }

    private String send(HttpRequest request) throws Exception {
        HttpResponse<String> response = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build()
                .send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("HTTP " + response.statusCode() + " : " + response.body());
        }
        return response.body();
    }

}
