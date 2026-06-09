# FlowlyRent — Architecture

## Structure des répertoires

```
FlowlyRent/
├── backend/                          # Spring Boot
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/com/flowlyrent/
│       ├── FlowlyRentApplication.java
│       ├── config/
│       │   ├── SecurityConfig.java        # JWT + routes publiques/admin/housekeeper
│       │   ├── JwtTokenProvider.java      # Génération / validation JWT
│       │   ├── JwtAuthenticationFilter.java  # Filter Bearer token
│       │   ├── SecurityUtils.java         # getCurrentUser(), getCurrentUserId()
│       │   ├── AdminBootstrap.java        # Auto-création compte ADMIN au démarrage (env vars)
│       │   ├── CloudinaryConfig.java      # Bean Cloudinary (cloud_name, api_key, api_secret)
│       │   ├── WebConfig.java             # CORS (localhost:4200)
│       │   └── WebSocketConfig.java       # STOMP /ws endpoint
│       ├── model/
│       │   ├── AppUser.java          # Utilisateur SaaS (implements UserDetails)
│       │   ├── Beds24Account.java    # Compte Beds24 lié à un AppUser (1:1)
│       │   ├── Property.java         # Logement (lié à AppUser)
│       │   ├── PropertyRoom.java     # Chambre/unité Beds24 dans un logement
│       │   ├── PropertyConfig.java   # Config par propriété — accessCode, previousAccessCode, cleaningHours, shortName
│       │   ├── PropertyInventoryItem.java # Équipement inventaire — label, category, quantity, sortOrder
│       │   ├── BookingTimeOverride.java   # Override horaires check-in/check-out par réservation Beds24
│       │   ├── MessageTemplate.java  # Modèle de message — contentFr, contentEn, type, beds24PropertyId
│       │   ├── HousekeepingTask.java  # Tâche ménage — housekeeper FK, report, hasIncident, linenDeducted
│       │   ├── HousekeeperProfile.java # Prestataire ménage — linkedUser (AppUser HOUSEKEEPER)
│       │   ├── HousekeepingStaff.java  # Personnel interne ménage (distinct des prestataires externes)
│       │   ├── TaskPhoto.java         # Photo tâche — url (Cloudinary) + publicId + data (legacy base64)
│       │   ├── LinenItem.java         # Article de linge par logement — label, category, quantity, defaultPerCleaning
│       │   ├── LinenMovement.java     # Mouvement de stock linge — direction (CLEAN_IN/TO_LAUNDRY), quantity, date
│       │   ├── TaskLinenUsage.java    # Sets de linge utilisés par tâche — lien ManyToOne tâche + article + quantité
│       │   ├── AdminNotification.java # Notification superadmin → users — subject, content, targetUsers (ManyToMany)
│       │   ├── AdminNotificationRead.java # Suivi lectures — notification + user (contrainte unique)
│       │   ├── AnalyticsEvent.java    # Événement analytics (PAGE_VIEW, LOGIN, CLICK)
│       │   ├── Feedback.java          # Feedback utilisateur (catégorie + message + statut)
│       │   ├── ExpenseRule.java       # Règle catégorisation transactions Qonto (keywords → catégorie)
│       │   └── enums/
│       │       ├── SubscriptionPlan.java  # FREE, STARTER, PRO, AGENCE
│       │       ├── UserRole.java          # USER, ADMIN, HOUSEKEEPER
│       │       ├── AnalyticsEventType.java # PAGE_VIEW, LOGIN, CLICK
│       │       ├── BookingStatus.java     # PENDING, CONFIRMED, CANCELLED, COMPLETED
│       │       ├── BookingSource.java     # DIRECT, AIRBNB, BOOKING_COM, ABRITEL, BEDS24
│       │       ├── Platform.java          # BOOKING_COM, AIRBNB, ABRITEL, BEDS24
│       │       ├── SyncType.java          # ICAL, BEDS24
│       │       ├── BlockType.java         # OWNER_STAY, MAINTENANCE, CLEANING, OTHER
│       │       ├── TaskType.java          # CHECKIN_PREP, CHECKOUT_CLEANING, CLEANING, MAINTENANCE, INSPECTION
│       │       ├── TaskStatus.java        # PENDING, IN_PROGRESS, DONE, SKIPPED
│       │       ├── PaymentStatus.java     # PENDING, COMPLETED, REFUNDED, FAILED, CANCELLED
│       │       ├── SenderType.java        # GUEST, HOST
│       │       ├── LinenCategory.java     # SHEETS, PILLOWCASES, TOWELS, BATH_TOWELS, DUVET_COVERS, OTHER
│       │       └── MovementDirection.java # CLEAN_IN (stock propre entrant), TO_LAUNDRY (sortie en laverie)
│       ├── repository/               # Spring Data JPA (un par entité)
│       ├── service/
│       │   ├── Beds24SyncService.java # Sync Beds24 API v2 (propriétés, chambres, réservations)
│       │   ├── BookingService.java    # CRUD + arrivées/départs par semaine (scopé par user)
│       │   ├── CloudinaryService.java # Upload base64 → Cloudinary + suppression par publicId
│       │   ├── ICalSyncService.java   # Sync iCal automatique (cron toutes les 2h)
│       │   ├── MessageService.java    # Messagerie + push WebSocket
│       │   ├── PaymentService.java    # Stripe Checkout + webhooks
│       │   ├── AnalyticsService.java  # Enregistrement events + calcul KPIs superadmin
│       │   ├── LinenService.java      # Déduction stock linge à la fin d'une tâche (idempotent via linenDeducted)
│       │   └── SyncResult.java        # DTO résultat de sync
│       ├── controller/
│       │   ├── AuthController.java                  # /auth/register, /auth/login
│       │   ├── UserSettingsController.java          # /user/profile, /user/beds24/**, /user/password, /user/feedback
│       │   ├── AdminBookingController.java          # /admin/bookings/**
│       │   ├── AdminMessageController.java          # /admin/messages/**
│       │   ├── AdminMessageTemplateController.java  # /admin/message-templates/** (CRUD modèles FR+EN)
│       │   ├── AdminPaymentController.java          # /admin/payments/**
│       │   ├── AdminPropertyController.java         # /admin/properties (pass-through Beds24)
│       │   ├── AdminPropertyConfigController.java   # /admin/property-configs/** (accessCode, shortName, cleaningHours)
│       │   ├── AdminPropertyInventoryController.java # /admin/property-inventory/** (équipements par logement)
│       │   ├── AdminBookingTimeOverrideController.java # /admin/booking-time-overrides/** (horaires custom)
│       │   ├── AdminHousekeeperController.java      # /admin/housekeepers/** (CRUD + activate/deactivate portal)
│       │   ├── AdminHousekeepingController.java     # /admin/housekeeping/** (tâches + photos + linen usages)
│       │   ├── AdminLinenController.java            # /admin/linen/** (articles + mouvements de stock par logement)
│       │   ├── AdminNotificationController.java     # /admin/notifications/** (liste, unread-count, mark-read)
│       │   ├── AdminAvailabilityController.java     # /admin/availability/** (calendrier + blocages)
│       │   ├── HousekeeperPortalController.java     # /housekeeper/** (espace prestataire — ROLE_HOUSEKEEPER)
│       │   ├── SyncController.java                  # /sync/channels/** (iCal uniquement)
│       │   ├── PublicBookingController.java         # /public/{slug}/** + /public/**
│       │   ├── StripeWebhookController.java         # /webhooks/stripe
│       │   ├── AnalyticsController.java             # /analytics/track (public — visiteurs anonymes)
│       │   ├── FeedbackController.java              # /user/feedback (POST)
│       │   ├── SuperAdminController.java            # /superadmin/stats, /users, /feedbacks (ROLE_ADMIN)
│       │   └── SuperAdminNotificationController.java # /superadmin/notifications/** (envoi + historique)
│       └── dto/
│           ├── Beds24ApiResponse.java   # Wrapper {"success":true,"data":[...],"pages":{}}
│           ├── Beds24AuthDTO.java       # token, refreshToken, expiresIn
│           ├── Beds24PropertyDTO.java   # Propriété Beds24
│           ├── Beds24RoomDTO.java       # Chambre/unité Beds24
│           ├── Beds24BookingDTO.java    # Réservation Beds24 (champs complets)
│           ├── SuperAdminStatsDTO.java  # KPIs dashboard superadmin
│           └── ...                     # BookingRequest, BookingResponse, GuestDTO, etc.
│
├── frontend/                         # Angular 17
│   ├── angular.json
│   ├── package.json
│   ├── proxy.conf.json               # /api → http://localhost:8080
│   ├── nginx.conf                    # Config Nginx pour Docker
│   ├── Dockerfile
│   └── src/
│       ├── main.ts
│       ├── index.html
│       ├── styles.scss               # Global styles + Angular Material theme + styles dialog photos
│       ├── environments/
│       │   ├── environment.ts        # apiUrl, wsUrl, stripePublishableKey
│       │   └── environment.prod.ts
│       └── app/
│           ├── app.component.ts      # Root (juste <router-outlet>)
│           ├── app.config.ts         # provideRouter, provideAnimations, authInterceptor
│           ├── app.routes.ts         # Routes racines : /public et /admin
│           ├── core/
│           │   ├── models/           # booking.model.ts, message.model.ts, payment.model.ts
│           │   ├── services/
│           │   │   ├── auth.service.ts               # Login JWT, localStorage — role USER/ADMIN/HOUSEKEEPER
│           │   │   ├── booking.service.ts            # Appels API + getPropertyNames() (merge shortName) + getPropertiesWithDisplayNames()
│           │   │   ├── message.service.ts            # Appels API + WebSocket STOMP
│           │   │   ├── message-template.service.ts   # CRUD modèles + apply() (variables nom, dates, code, horaires, code_precedent)
│           │   │   ├── property-config.service.ts    # Config propriété — accessCode, shortName, cleaningHours
│           │   │   ├── property-inventory.service.ts # Inventaire équipements par propriété
│           │   │   ├── booking-time-override.service.ts # Override horaires check-in/check-out
│           │   │   ├── payment.service.ts            # Appels API paiements Stripe
│           │   │   ├── sync.service.ts               # Appels API synchronisation iCal
│           │   │   ├── public.service.ts             # Appels API site public
│           │   │   ├── analytics.service.ts          # Auto-tracking PAGE_VIEW (tous visiteurs, auth ou non)
│           │   │   ├── user.service.ts               # Profil, Beds24, mot de passe
│           │   │   ├── housekeeper.service.ts        # Admin — CRUD prestataires + activate/deactivate portal
│           │   │   └── housekeeper-portal.service.ts # Portail — me, tasks, status, report, photos
│           │   ├── guards/
│           │   │   ├── auth.guard.ts        # Redirige selon rôle : USER→/admin, ADMIN→/superadmin, HOUSEKEEPER→/housekeeper
│           │   │   ├── superadmin.guard.ts  # Vérifie isAdmin() — protège /superadmin/**
│           │   │   └── housekeeper.guard.ts # Vérifie isHousekeeper() — protège /housekeeper/**
│           │   └── interceptors/
│           │       └── auth.interceptor.ts  # Bearer token sur /admin, /sync, /user, /superadmin, /analytics, /housekeeper
│           ├── admin/
│           │   ├── admin.routes.ts
│           │   ├── layout/admin-layout.component.ts  # Sidenav + toolbar — badge messages + badge notifications (polling 60s)
│           │   ├── login/login.component.ts
│           │   ├── dashboard/dashboard.component.ts
│           │   ├── arrivals/arrivals.component.ts
│           │   ├── departures/departures.component.ts
│           │   ├── bookings/bookings.component.ts
│           │   ├── booking-form/booking-form.component.ts
│           │   ├── booking-detail-dialog/booking-detail-dialog.component.ts
│           │   ├── messages/messages.component.ts
│           │   ├── payments/payments.component.ts
│           │   ├── sync/sync.component.ts
│           │   ├── housekeeping/housekeeping.component.ts
│           │   ├── linen/linen.component.ts
│           │   ├── notifications/notifications.component.ts
│           │   ├── properties/properties.component.ts
│           │   ├── calendar/calendar.component.ts
│           │   ├── settings/settings.component.ts
│           │   └── feedback/feedback.component.ts
│           ├── superadmin/
│           │   ├── superadmin-layout.component.ts
│           │   ├── dashboard/superadmin-dashboard.component.ts
│           │   ├── users/superadmin-users.component.ts
│           │   ├── feedbacks/superadmin-feedbacks.component.ts
│           │   └── notifications/superadmin-notifications.component.ts
│           ├── housekeeper/
│           │   ├── layout/housekeeper-layout.component.ts
│           │   └── tasks/housekeeper-tasks.component.ts
│           └── public/
│               ├── home/home.component.ts
│               ├── property-detail/property-detail.component.ts
│               └── booking/booking.component.ts
│
├── database/
│   └── init.sql
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Schéma base de données (tables auto-créées par Hibernate)

| Table | Entité | Description |
|-------|--------|-------------|
| `users` | AppUser | Comptes SaaS — email, password BCrypt, plan, publicSiteSlug |
| `beds24_accounts` | Beds24Account | Tokens Beds24 par user (refreshToken + accessToken court-vécu) |
| `properties` | Property | Logements — liés à un user, beds24PropId pour la synchro |
| `property_rooms` | PropertyRoom | Chambres/unités Beds24 dans un logement |
| `property_images` | — | @ElementCollection sur Property |
| `guests` | Guest | Voyageurs — email, phone, mobile, country |
| `bookings` | Booking | Réservations — externalId ("beds24-{id}"), source, statut, montants détaillés |
| `payments` | Payment | Paiements Stripe — OneToOne sur Booking |
| `messages` | Message | Messages hôte ↔ voyageur |
| `channels` | Channel | Canaux iCal (legacy — Beds24 géré via beds24_accounts) |
| `availability_blocks` | AvailabilityBlock | Blocages manuels de dates (entretien, séjour proprio, etc.) |
| `housekeeping_tasks` | HousekeepingTask | Tâches ménage — housekeeper_id FK, reportComment, hasIncident, incidentDescription |
| `housekeeper_profiles` | HousekeeperProfile | Prestataires — nom, téléphone, linked_user_id (AppUser HOUSEKEEPER, nullable) |
| `task_photos` | TaskPhoto | Photos tâche — `url` VARCHAR(500) Cloudinary + `public_id` VARCHAR(200) + `data` LONGTEXT (legacy base64) |
| `analytics_events` | AnalyticsEvent | Événements PAGE_VIEW / LOGIN / CLICK — userId NULL pour visiteurs anonymes |
| `feedbacks` | Feedback | Feedbacks utilisateurs — catégorie, message, statut (NEW/IN_PROGRESS/DONE/REJECTED) |
| `property_configs` | PropertyConfig | Config par propriété — `accessCode`, `previousAccessCode`, `cleaningHours`, `shortName` |
| `property_inventory_items` | PropertyInventoryItem | Inventaire équipements — label, category (BEDS/APPLIANCES/TECH/…), quantity, sortOrder |
| `booking_time_overrides` | BookingTimeOverride | Override horaires — `beds24BookingId`, `checkinTime`, `checkoutTime`, `note` |
| `message_templates` | MessageTemplate | Modèles messages — `contentFr`, `contentEn`, type (CHECKIN/CHECKOUT/CUSTOM), beds24PropertyId |
| `housekeeping_staff` | HousekeepingStaff | Personnel interne ménage — firstName, lastName, phone, hourlyRate, hireDate |
| `expense_rules` | ExpenseRule | Règles catégorisation Qonto — keywords, category |
| `linen_items` | LinenItem | Articles de linge par logement — label, category (SHEETS/TOWELS/…), quantity, defaultPerCleaning |
| `linen_movements` | LinenMovement | Mouvements de stock — direction (CLEAN_IN/TO_LAUNDRY), quantity, date, housekeepingTaskId |
| `task_linen_usages` | TaskLinenUsage | Sets de linge par tâche — task_id FK, linen_item_id FK, quantity |
| `admin_notifications` | AdminNotification | Notifications superadmin → users — subject, content, sentByEmail, sentAt |
| `admin_notification_reads` | AdminNotificationRead | Suivi lectures — notification_id + user_id (unique) |
| `admin_notification_targets` | — | Table jointure ManyToMany AdminNotification ↔ AppUser (vide = envoi à tous) |

---

## Stockage des photos (Cloudinary)

Cloud name : `dlixzbkue`

### Flux upload
1. La prestataire prend une photo sur mobile → le frontend lit le fichier en base64 (`FileReader`)
2. Le base64 est envoyé au backend via `POST /housekeeper/tasks/{id}/photos`
3. Le backend uploade vers Cloudinary via `CloudinaryService.uploadBase64()` dans le dossier `flowlyrent/tasks/{taskId}/`
4. Cloudinary retourne `secure_url` et `public_id` → stockés dans `task_photos.url` et `task_photos.public_id`
5. Le champ `data` (LONGTEXT) reste null pour les nouveaux uploads

### Fallback base64
Si l'upload Cloudinary échoue, la photo est sauvegardée en base64 dans le champ `data`. L'affichage utilise `url ?? data` partout.

### Suppression
`CloudinaryService.delete(publicId)` est appelé avant `photoRepo.deleteById()`.

### Affichage côté admin
Bouton `photo_library` sur chaque carte de tâche → `MatDialog` affichant rapport + photos groupées (Avant / Après / Incident).

> Les dialogs utilisent `MatDialog` et non `position:fixed` inline — `mat-sidenav-container` applique des transforms CSS qui cassent `position:fixed`.

---

## Synchronisation Beds24

La sync est **au niveau du compte utilisateur** (pas par canal).

### Flux d'authentification
1. L'utilisateur saisit son setup token Beds24 dans l'admin
2. `POST /user/beds24/connect-token` → `Beds24SyncService.connectAccount()` appelle Beds24 `/authentication/setup`
3. **Le mot de passe n'est jamais stocké** — seul le `refreshToken` est conservé
4. Le token d'accès (court-vécu, 24h) est auto-rafraîchi avant chaque appel API

### Sync automatique
- Toutes les 2h via `@Scheduled` dans `Beds24SyncService.scheduledSync()`
- Sync incrémentale : `?modifiedFrom=` ISO UTC pour capturer créations + modifications + annulations
- Première sync : `?arrivalFrom=` à 6 mois en arrière

### Données synchronisées
- **Propriétés** via `/properties` → entités `Property`
- **Chambres** via `/properties/{id}/rooms` → entités `PropertyRoom`
- **Réservations** via `/bookings` → entités `Booking` + `Guest`
- **Tâche ménage** créée automatiquement à la date de départ pour chaque nouvelle réservation confirmée

### Synchronisation iCal (legacy)

| Plateforme | Où trouver l'URL iCal |
|------------|----------------------|
| Booking.com | Extranet → Calendrier → Exporter le calendrier |
| Airbnb | Calendrier → Disponibilités → Exporter le calendrier |
| Abritel | Calendrier → Synchroniser → Exporter iCal |

---

## Code PHP de référence

Le dossier **`C:\FlowlyRent\php_code\`** contient l'application PHP legacy (gitignored — ne jamais committer).

| Fichier | Contenu |
|---------|---------|
| `functions.php` | ~80 Ko — toutes les fonctions Beds24 API (référence principale) |
| `formulaire_newBooking.php` | Création de réservation directe |
| `formulaire_UpdateBook.php` | Modification de réservation |
| `calendrier_reservations.php` | Logique calendrier des réservations |
| `formulaire_menage.php` | Gestion des tâches ménage |
| `formulaire_message.php` | Messagerie hôte ↔ voyageur |
| `statistiques_plateformes.php` | Statistiques et revenus par plateforme |
| `beds24.php` | Appels directs API Beds24 |
| `strategie_minStay.php` | Gestion durée minimum de séjour |

Consulter ces fichiers quand un comportement est incertain (formules, mapping Beds24, logique métier).
