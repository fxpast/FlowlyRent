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
│       │   ├── WebConfig.java             # CORS
│       │   └── WebSocketConfig.java       # STOMP /ws endpoint
│       ├── model/
│       │   ├── AppUser.java              # Utilisateur SaaS (implements UserDetails)
│       │   ├── Beds24Account.java        # Compte Beds24 lié à un AppUser (1:1)
│       │   ├── PropertyConfig.java       # Config par propriété — accessCode, shortName, cleaningHours, roomId
│       │   ├── PropertyInventoryItem.java # Équipement inventaire — label, category, quantity, sortOrder
│       │   ├── BookingTimeOverride.java   # Override horaires check-in/check-out par réservation Beds24
│       │   ├── MessageTemplate.java      # Modèle de message — contentFr, contentEn, type, beds24PropertyId
│       │   ├── HousekeepingTask.java     # Tâche ménage — housekeeper FK, staff FK, report, hasIncident
│       │   ├── HousekeeperProfile.java   # Prestataire externe — linkedUser (AppUser HOUSEKEEPER)
│       │   ├── HousekeepingStaff.java    # Personnel interne ménage
│       │   ├── TaskPhoto.java            # Photo tâche — url Cloudinary + publicId + data (legacy base64)
│       │   ├── TaskLinenUsage.java       # Sets de linge par tâche
│       │   ├── LinenItem.java            # Article de linge par logement
│       │   ├── LinenMovement.java        # Mouvement de stock linge — CLEAN_IN / TO_LAUNDRY
│       │   ├── LinenTemplate.java        # Modèle de dotation linge (sets par logement)
│       │   ├── LinenTemplateItem.java    # Ligne d'un modèle linge — article + quantité
│       │   ├── KeyBox.java               # Boîte à clé — label, code, modèle
│       │   ├── LocalProperty.java        # Logement mode iCal (créé manuellement)
│       │   ├── IcalBooking.java          # Réservation iCal — icalUid, source, status ("direct-*" = résa directe)
│       │   ├── PropertyIcalSource.java   # Source iCal par logement — nom + URL + lastSync
│       │   ├── PropertyBundle.java       # Groupe de logements liés (ex : logements d'une même villa)
│       │   ├── PropertyPricingConfig.java # Config prix Beds24 par logement — base, min, max
│       │   ├── PricingZone.java          # Zone géographique de prix dynamique
│       │   ├── PricingZonePeriod.java    # Période saisonnière d'une zone (mois/jour début → fin + %)
│       │   ├── PricingEventImpactConfig.java # Impact des événements locaux sur les prix (4 niveaux)
│       │   ├── LocalEvent.java           # Événement local (festival, salon…) — impactLevel VARCHAR(20)
│       │   ├── MinStayStrategy.java      # Stratégie durée minimum de séjour
│       │   ├── Invoice.java              # Facture — numéro, statut, montant, destinataire
│       │   ├── InvoiceLine.java          # Ligne de facture — label, qty, unitPrice, type
│       │   ├── ManualExpense.java        # Dépense manuelle (hors Qonto)
│       │   ├── ManualRevenue.java        # Revenu manuel (hors Beds24)
│       │   ├── QontoAccount.java         # Compte Qonto lié à un AppUser
│       │   ├── ExpenseRule.java          # Règle catégorisation transactions Qonto
│       │   ├── FaqItem.java             # Question/réponse FAQ (FR + 4 traductions)
│       │   ├── FaqSuggestion.java       # Question sans réponse enregistrée par le chatbot
│       │   ├── AutoResponderConfig.java  # Config répondeur auto Beds24 — webhook + prompt IA
│       │   ├── AutoResponderLog.java     # Log des réponses auto envoyées
│       │   ├── BookingMessageLog.java    # Log des messages voyageurs reçus via webhook Beds24
│       │   ├── AdminNotification.java   # Notification superadmin → users
│       │   ├── AdminNotificationRead.java # Suivi lectures (notification + user, unique)
│       │   ├── AnalyticsEvent.java      # Événement analytics — PAGE_VIEW, LOGIN, CLICK
│       │   ├── Feedback.java            # Feedback utilisateur — catégorie, message, statut
│       │   ├── FcmToken.java            # Token FCM push mobile (par user)
│       │   ├── PushSubscription.java    # Subscription Web Push (VAPID)
│       │   └── enums/
│       │       ├── SubscriptionPlan.java  # FREE, STARTER, PRO, AGENCE
│       │       ├── UserRole.java          # USER, ADMIN, HOUSEKEEPER
│       │       ├── ChannelType.java       # ICAL, BEDS24
│       │       ├── AnalyticsEventType.java # PAGE_VIEW, LOGIN, CLICK
│       │       ├── BookingStatus.java     # PENDING, CONFIRMED, CANCELLED, COMPLETED
│       │       ├── BlockType.java         # OWNER_STAY, MAINTENANCE, CLEANING, OTHER
│       │       ├── TaskType.java          # CHECKIN_PREP, CHECKOUT_CLEANING, CLEANING, MAINTENANCE, INSPECTION
│       │       ├── TaskStatus.java        # PENDING, IN_PROGRESS, DONE, SKIPPED
│       │       ├── LinenCategory.java     # SHEETS, PILLOWCASES, TOWELS, BATH_TOWELS, DUVET_COVERS, OTHER
│       │       ├── MovementDirection.java # CLEAN_IN (stock propre entrant), TO_LAUNDRY (sortie laverie)
│       │       ├── ImpactLevel.java       # FAIBLE, MOYEN, FORT, EXCEPTIONNEL (colonne VARCHAR(20))
│       │       ├── InvoiceStatus.java     # DRAFT, SENT, PAID, CANCELLED
│       │       └── InvoiceLineType.java   # SERVICE, PRODUCT, DISCOUNT, TAX
│       ├── repository/               # Spring Data JPA (un par entité)
│       ├── service/
│       │   ├── Beds24ApiClient.java      # Client HTTP Beds24 API v2 (HttpClient statique partagé)
│       │   ├── Beds24TokenService.java   # Gestion tokens Beds24 (refresh auto, pas @Transactional)
│       │   ├── Beds24ReportService.java  # Rapports CA / occupancy depuis Beds24
│       │   ├── RoomIdResolverService.java # Résolution beds24PropertyId → roomId (cache DB + mémoire)
│       │   ├── DynamicPricingService.java # Suggestion prix — segments événements + historique Beds24
│       │   ├── PropertyBundleService.java # Sync bundles de logements au login
│       │   ├── IcalSyncService.java      # Sync iCal automatique
│       │   ├── IcalSyncJob.java          # Job @Scheduled pour sync iCal (cron toutes les 2h)
│       │   ├── HousekeepingReportService.java # Rapports ménage (4 types) + costSummary() pour marge stats
│       │   ├── LinenService.java         # Déduction stock linge (idempotent via linenDeducted)
│       │   ├── LinenTemplateService.java # CRUD modèles de dotation linge
│       │   ├── MinStayStrategyService.java # Calcul durée minimum séjour par période
│       │   ├── RagService.java           # RAG keyword BM25 — indexe KB + FAQ, retrieve top-N chunks sans API externe
│       │   ├── ChatbotPromptService.java # System instruction partagé (contexte RAG ou full-context + date)
│       │   ├── GeminiChatbotService.java # Chatbot Gemini 2.5 Flash (principal, function calling)
│       │   ├── GroqChatbotService.java   # Chatbot Groq llama-3.3 (2ème repli)
│       │   ├── CerebrasChatbotService.java # Chatbot Cerebras llama-3.3 (3ème repli, API OpenAI-compatible)
│       │   ├── ChatbotToolService.java   # Exécution des tools chatbot (scopé userId)
│       │   ├── AutoResponderService.java # Répondeur auto — webhook Beds24 + IA Groq
│       │   ├── FaqTranslationService.java # Traduction FAQ via MyMemory API (async)
│       │   ├── QontoService.java         # Intégration Qonto API v2 (transactions + catégorisation)
│       │   ├── EmailService.java         # Envoi emails (SMTP)
│       │   ├── FcmPushService.java       # Push notifications Firebase Cloud Messaging
│       │   ├── WebPushService.java       # Push notifications Web Push (VAPID)
│       │   ├── SubscriptionService.java  # Gestion abonnements Stripe (plans tarifaires)
│       │   ├── ExportService.java        # Export CSV/Excel des données
│       │   ├── CloudinaryService.java    # Upload base64 → Cloudinary + suppression par publicId
│       │   ├── MessageService.java       # Messagerie Beds24 + push WebSocket
│       │   ├── AnalyticsService.java     # Enregistrement events + calcul KPIs superadmin
│       │   └── SyncResult.java           # DTO résultat de sync
│       ├── controller/
│       │   ├── AuthController.java                    # /auth/register, /auth/login
│       │   ├── UserSettingsController.java            # /user/profile, /user/beds24/**, /user/password
│       │   ├── SubscriptionController.java            # /user/subscription (plans + Stripe)
│       │   ├── AdminBookingController.java            # /admin/bookings/** — filtre prolongation arrivées/départs
│       │   ├── AdminMessageController.java            # /admin/messages/**
│       │   ├── AdminMessageTemplateController.java    # /admin/message-templates/**
│       │   ├── AdminPaymentController.java            # /admin/payments/**
│       │   ├── AdminPropertyController.java           # /admin/properties (pass-through Beds24)
│       │   ├── AdminPropertyConfigController.java     # /admin/property-configs/**
│       │   ├── AdminPropertyInventoryController.java  # /admin/property-inventory/**
│       │   ├── AdminBookingTimeOverrideController.java # /admin/booking-time-overrides/**
│       │   ├── AdminAvailabilityController.java       # /admin/availability/** (calendrier + blocages + prix)
│       │   ├── AdminHousekeeperController.java        # /admin/housekeepers/**
│       │   ├── AdminHousekeepingController.java       # /admin/housekeeping/**
│       │   ├── AdminLinenController.java              # /admin/linen/**
│       │   ├── AdminLinenTemplateController.java      # /admin/linen-templates/**
│       │   ├── AdminLocalPropertyController.java      # /admin/local-properties/** (mode iCal)
│       │   ├── AdminIcalSourceController.java         # /admin/local-properties/{id}/ical-sources/**
│       │   ├── AdminPropertyBundleController.java     # /admin/property-bundles/**
│       │   ├── AdminKeyBoxController.java             # /admin/key-boxes/**
│       │   ├── AdminDynamicPricingController.java     # /admin/dynamic-pricing/**
│       │   ├── AdminPricingZoneController.java        # /admin/pricing-zones/**
│       │   ├── AdminLocalEventController.java         # /admin/local-events/**
│       │   ├── AdminMinStayController.java            # /admin/min-stay/**
│       │   ├── AdminStatsController.java              # /admin/stats/** (revenus + marge)
│       │   ├── AdminManualExpenseController.java      # /admin/manual-expenses/**
│       │   ├── AdminManualRevenueController.java      # /admin/manual-revenues/**
│       │   ├── AdminExpenseRuleController.java        # /admin/expense-rules/**
│       │   ├── AdminQontoController.java              # /admin/qonto/**
│       │   ├── AdminInvoiceController.java            # /admin/invoices/**
│       │   ├── AdminChatbotController.java            # /admin/chatbot/**
│       │   ├── AdminAutoResponderController.java      # /admin/auto-responder/**
│       │   ├── AdminNotificationController.java       # /admin/notifications/**
│       │   ├── StatsController.java                   # /admin/stats (KPIs dashboard)
│       │   ├── ReportController.java                  # /admin/reports/**
│       │   ├── HousekeeperPortalController.java       # /housekeeper/** (ROLE_HOUSEKEEPER)
│       │   ├── PublicBookingController.java           # /public/{slug}/** + /public/**
│       │   ├── PublicIcalController.java             # /public/ical/{token}.ics (flux iCal public)
│       │   ├── FaqController.java                    # /public/faq + /superadmin/faq/**
│       │   ├── Beds24WebhookController.java          # /webhooks/beds24 (répondeur auto)
│       │   ├── StripeWebhookController.java          # /webhooks/stripe
│       │   ├── PushSubscriptionController.java       # /push/** (VAPID + FCM)
│       │   ├── AnalyticsController.java              # /analytics/track
│       │   ├── FeedbackController.java               # /user/feedback
│       │   ├── SuperAdminController.java             # /superadmin/stats, /users, /feedbacks
│       │   └── SuperAdminNotificationController.java # /superadmin/notifications/**
│       └── dto/
│           ├── Beds24ApiResponse.java   # Wrapper {"success":true,"data":[...],"pages":{}}
│           ├── Beds24AuthDTO.java       # token, refreshToken, expiresIn
│           ├── Beds24PropertyDTO.java   # Propriété Beds24
│           ├── Beds24BookingDTO.java    # Réservation Beds24 (champs complets)
│           ├── ReportResult.java        # DTO résultat de rapport ménage
│           └── ...                     # DTOs divers (BookingRequest, GuestDTO, etc.)
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
│       ├── styles.scss               # Global styles + Angular Material theme + dialog plein écran mobile
│       ├── environments/
│       │   ├── environment.ts        # apiUrl, wsUrl, stripePublishableKey
│       │   └── environment.prod.ts
│       └── app/
│           ├── app.component.ts
│           ├── app.config.ts         # provideRouter, provideAnimations, authInterceptor
│           ├── app.routes.ts
│           ├── core/
│           │   ├── models/           # booking.model.ts, message.model.ts, payment.model.ts
│           │   ├── components/
│           │   │   ├── chat-widget.component.ts    # Widget chatbot flottant
│           │   │   └── lang-switcher.component.ts  # Sélecteur de langue
│           │   ├── services/
│           │   │   ├── auth.service.ts               # Login JWT, localStorage — USER/ADMIN/HOUSEKEEPER
│           │   │   ├── booking.service.ts            # Appels API + getPropertyNames() + getPropertiesWithDisplayNames()
│           │   │   ├── message.service.ts            # Appels API + WebSocket STOMP
│           │   │   ├── message-template.service.ts   # CRUD modèles + apply() (variables nom/dates/code/horaires)
│           │   │   ├── property-config.service.ts    # Config propriété — accessCode, shortName, cleaningHours
│           │   │   ├── property-inventory.service.ts # Inventaire équipements
│           │   │   ├── booking-time-override.service.ts # Override horaires check-in/check-out
│           │   │   ├── payment.service.ts            # Paiements Stripe
│           │   │   ├── sync.service.ts               # Sync iCal
│           │   │   ├── public.service.ts             # Site public
│           │   │   ├── analytics.service.ts          # Auto-tracking PAGE_VIEW
│           │   │   ├── user.service.ts               # Profil, Beds24, mot de passe
│           │   │   ├── housekeeper.service.ts        # CRUD prestataires admin
│           │   │   ├── housekeeper-portal.service.ts # Portail prestataire
│           │   │   ├── housekeeping.service.ts       # Tâches ménage admin
│           │   │   ├── dynamic-pricing.service.ts    # Prix dynamique
│           │   │   ├── invoice.service.ts            # Factures
│           │   │   ├── manual-expense.service.ts     # Dépenses manuelles
│           │   │   ├── manual-revenue.service.ts     # Revenus manuels
│           │   │   ├── qonto.service.ts              # Intégration Qonto
│           │   │   ├── property-bundle.service.ts    # Bundles logements
│           │   │   ├── linen-template.service.ts     # Modèles linge
│           │   │   ├── min-stay.service.ts           # Durée minimum séjour
│           │   │   ├── auto-responder.service.ts     # Répondeur auto
│           │   │   ├── chatbot.service.ts            # Chatbot IA
│           │   │   ├── push-notification.service.ts  # Web Push + FCM
│           │   │   ├── message-reminder.service.ts   # Rappels messages
│           │   │   ├── language.service.ts           # Gestion langue active
│           │   │   └── translation.service.ts        # Traductions dynamiques
│           │   ├── guards/
│           │   │   ├── auth.guard.ts        # USER→/admin, ADMIN→/superadmin, HOUSEKEEPER→/housekeeper
│           │   │   ├── superadmin.guard.ts  # Protège /superadmin/**
│           │   │   └── housekeeper.guard.ts # Protège /housekeeper/**
│           │   └── interceptors/
│           │       └── auth.interceptor.ts  # Bearer token sur les routes protégées
│           ├── admin/
│           │   ├── admin.routes.ts
│           │   ├── layout/admin-layout.component.ts  # Sidenav + toolbar
│           │   ├── login/login.component.ts
│           │   ├── register/register.component.ts
│           │   ├── onboarding/onboarding.component.ts
│           │   ├── dashboard/dashboard.component.ts
│           │   ├── today/today.component.ts
│           │   ├── arrivals/arrivals.component.ts
│           │   ├── departures/departures.component.ts
│           │   ├── bookings/bookings.component.ts
│           │   ├── booking-form/booking-form.component.ts
│           │   ├── booking-detail-dialog/booking-detail-dialog.component.ts
│           │   ├── blackout-dialog/blackout-dialog.component.ts
│           │   ├── price-dialog/price-dialog.component.ts
│           │   ├── messages/messages.component.ts
│           │   ├── payments/payments.component.ts
│           │   ├── housekeeping/housekeeping.component.ts
│           │   ├── linen/linen.component.ts
│           │   ├── calendar/calendar.component.ts
│           │   ├── dynamic-pricing/dynamic-pricing.component.ts
│           │   ├── expenses/expenses.component.ts
│           │   ├── stats/stats.component.ts
│           │   ├── reports/reports.component.ts
│           │   ├── invoices/invoices.component.ts
│           │   ├── invoice-editor/invoice-editor.component.ts
│           │   ├── faq/faq.component.ts
│           │   ├── auto-responder/auto-responder.component.ts
│           │   ├── properties/properties.component.ts
│           │   ├── notifications/notifications.component.ts
│           │   ├── settings/settings.component.ts
│           │   ├── feedback/feedback.component.ts
│           │   ├── sync/sync.component.ts
│           │   └── coming-soon/coming-soon.component.ts
│           ├── superadmin/
│           │   ├── superadmin-layout.component.ts
│           │   ├── dashboard/superadmin-dashboard.component.ts
│           │   ├── users/superadmin-users.component.ts
│           │   ├── faq/superadmin-faq.component.ts
│           │   ├── feedbacks/superadmin-feedbacks.component.ts
│           │   └── notifications/superadmin-notifications.component.ts
│           ├── housekeeper/
│           │   ├── layout/housekeeper-layout.component.ts
│           │   ├── tasks/housekeeper-tasks.component.ts
│           │   ├── arrivals/housekeeper-arrivals.component.ts   # Filtre prolongements (même logique admin)
│           │   ├── departures/housekeeper-departures.component.ts
│           │   └── reports/housekeeper-reports.component.ts
│           └── public/
│               ├── home/home.component.ts
│               ├── page-resolver/page-resolver.component.ts
│               ├── property-detail/property-detail.component.ts
│               ├── booking/booking.component.ts
│               ├── faq/faq.component.ts
│               ├── payment-redirect/payment-redirect.component.ts
│               ├── privacy/privacy.component.ts
│               └── delete-account/delete-account.component.ts
│
├── database/
│   └── init.sql
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Schéma base de données (tables auto-créées par Hibernate)

> **Important :** les entités `Booking`, `Property`, `Guest`, `Message`, `Payment`, `Channel`, `AvailabilityBlock` n'existent **plus** comme entités JPA. Le projet consomme Beds24 via API directement (DTOs). Seules les tables ci-dessous existent réellement.

| Table | Entité | Description |
|-------|--------|-------------|
| `users` | AppUser | Comptes SaaS — email, password BCrypt, plan, channelType (ICAL/BEDS24), publicSiteSlug |
| `beds24_accounts` | Beds24Account | Tokens Beds24 par user (refreshToken + accessToken) |
| `property_configs` | PropertyConfig | Config par propriété — `accessCode`, `previousAccessCode`, `cleaningHours`, `shortName`, `roomId` |
| `property_inventory_items` | PropertyInventoryItem | Inventaire équipements — label, category, quantity, sortOrder |
| `booking_time_overrides` | BookingTimeOverride | Override horaires — `beds24BookingId`, `checkinTime`, `checkoutTime`, `note` |
| `message_templates` | MessageTemplate | Modèles messages — `contentFr`, `contentEn`, type, beds24PropertyId |
| `housekeeping_tasks` | HousekeepingTask | Tâches ménage — `housekeeper_id` FK, `staff_id` FK, report, hasIncident |
| `housekeeper_profiles` | HousekeeperProfile | Prestataires — nom, téléphone, `linked_user_id`, `hourlyRate` |
| `housekeeping_staff` | HousekeepingStaff | Personnel interne — firstName, lastName, phone, hourlyRate |
| `task_photos` | TaskPhoto | Photos tâche — `url` VARCHAR(500) + `public_id` VARCHAR(200) + `data` LONGTEXT (legacy) |
| `task_linen_usages` | TaskLinenUsage | Sets de linge par tâche — task_id + linen_item_id + quantity |
| `linen_items` | LinenItem | Articles de linge — label, category, quantity, defaultPerCleaning |
| `linen_movements` | LinenMovement | Mouvements de stock — direction (CLEAN_IN/TO_LAUNDRY), quantity, date |
| `linen_templates` | LinenTemplate | Modèle de dotation linge par logement |
| `linen_template_items` | LinenTemplateItem | Ligne d'un modèle — linen_item_id + quantity |
| `key_boxes` | KeyBox | Boîtes à clé — label, code, modèle, notes |
| `local_properties` | LocalProperty | Logements mode iCal — nom, adresse, `icalFeedToken` (UUID opaque) |
| `ical_bookings` | IcalBooking | Réservations iCal — `icalUid` ("direct-*" = résa directe), `sourceId`, status |
| `property_ical_sources` | PropertyIcalSource | Sources iCal par logement — nom + URL + lastSync |
| `property_bundles` | PropertyBundle | Groupes de logements liés |
| `property_pricing_configs` | PropertyPricingConfig | Config prix Beds24 — basePrice, minPrice, maxPrice |
| `pricing_zones` | PricingZone | Zones géographiques de prix dynamique |
| `pricing_zone_periods` | PricingZonePeriod | Périodes saisonnières — startMonth/Day, endMonth/Day, adjustmentPercent |
| `pricing_event_impact_configs` | PricingEventImpactConfig | Impact événements par niveau — faible/moyen/fort/exceptionnel % |
| `local_events` | LocalEvent | Événements locaux — dateFrom, dateTo, `impact_level` VARCHAR(20) |
| `min_stay_strategies` | MinStayStrategy | Stratégies durée min séjour |
| `invoices` | Invoice | Factures — numéro, statut, montant, destinataire, dates |
| `invoice_lines` | InvoiceLine | Lignes de facture — label, qty, unitPrice, type |
| `manual_expenses` | ManualExpense | Dépenses manuelles hors Qonto |
| `manual_revenues` | ManualRevenue | Revenus manuels hors Beds24 |
| `qonto_accounts` | QontoAccount | Compte Qonto lié — orgSlug, apiKey (chiffré) |
| `expense_rules` | ExpenseRule | Règles catégorisation Qonto — keywords, category |
| `faq_items` | FaqItem | Questions/réponses FAQ — contentFr + 4 traductions auto |
| `faq_suggestions` | FaqSuggestion | Questions sans réponse enregistrées par le chatbot |
| `auto_responder_configs` | AutoResponderConfig | Config répondeur auto — webhook secret, prompt IA, actif/inactif |
| `auto_responder_logs` | AutoResponderLog | Log des réponses auto envoyées — bookingId, question, réponse, modèle |
| `booking_message_logs` | BookingMessageLog | Messages voyageurs reçus via webhook Beds24 |
| `analytics_events` | AnalyticsEvent | PAGE_VIEW / LOGIN / CLICK — userId NULL pour visiteurs anonymes |
| `feedbacks` | Feedback | Feedbacks — catégorie (dont "chatbot" = actions non gérées), statut |
| `admin_notifications` | AdminNotification | Notifications superadmin → users |
| `admin_notification_reads` | AdminNotificationRead | Suivi lectures — notification_id + user_id (unique) |
| `admin_notification_targets` | — | Join table ManyToMany AdminNotification ↔ AppUser |
| `fcm_tokens` | FcmToken | Tokens Firebase Cloud Messaging par user |
| `push_subscriptions` | PushSubscription | Subscriptions Web Push (VAPID) par user |

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
2. `POST /user/beds24/connect-token` → `Beds24ApiClient.connectAccount()` appelle Beds24 `/authentication/setup`
3. **Le mot de passe n'est jamais stocké** — seul le `refreshToken` est conservé
4. Le token d'accès (court-vécu, 24h) est auto-rafraîchi avant chaque appel API via `Beds24TokenService.getValidToken()`

### HttpClient partagé
`Beds24ApiClient`, `GeminiChatbotService`, `GroqChatbotService`, `QontoService` et `Beds24TokenService` utilisent un `HttpClient` **statique partagé** (`private static final HttpClient HTTP_CLIENT`). Ne jamais recréer un `HttpClient` par appel.

### Données consommées via API (pas d'entités JPA)
- **Propriétés** via `/properties`
- **Réservations** via `/bookings`
- **Calendrier** via `/calendar` (blocages, prix)

### Synchronisation iCal (mode iCal)

| Plateforme | Où trouver l'URL iCal |
|------------|----------------------|
| Booking.com | Extranet → Calendrier → Exporter le calendrier |
| Airbnb | Calendrier → Disponibilités → Exporter le calendrier |
| Abritel | Calendrier → Synchroniser → Exporter iCal |

---

## Filtre de prolongation — Arrivées / Départs

`AdminBookingController.filterProlongations()` exclut les prolongations des listes d'arrivées et de départs.

**Règle :** une réservation B est une prolongation si :
- même `beds24PropertyId` que A
- même nom/prénom (`bookingName()`) que A
- `checkIn(B) == checkOut(A)`

Dans ce cas, A est masqué des départs et B des arrivées.

**Implémentation :**
- Mode Beds24 : second appel `getBookings()` sur la même fenêtre ±7 jours
- Mode iCal : requête `IcalBookingRepository` sur la même plage
- `bookingName()` normalise en minuscules sans espaces

---

## Entretien — Calcul des coûts (`costSummary`)

`HousekeepingReportService.costSummary(userId, from, to)` calcule le total ménage/dépannage pour la page Revenus.

**Règles d'inclusion :**
1. `status == DONE`
2. `housekeeper != null` (prestataire externe — `HousekeeperProfile`, pas `HousekeepingStaff`)
3. `extraHours > 0` et un taux horaire disponible

**Taux effectif (`effectiveCost`)** : `task.hourlyRate` en priorité, puis `housekeeper.hourlyRate` en fallback.

> Ces règles sont **alignées sur l'onglet Charges frontend** (`housekeeperCharges` computed). Ne pas modifier l'une sans vérifier l'autre.

---

## Angular Material 17 — Largeur des `mat-form-field` dans un flex container

`mat-form-field` peut utiliser `display: contents` sur son hôte, rendant `width`/`flex` sur l'hôte sans effet.

**Solution :** envelopper dans un `<div>` portant la classe de largeur. Le `div` est un flex item fiable.

```html
<div class="period-month">
  <mat-form-field appearance="outline" style="width:100%">
    ...
  </mat-form-field>
</div>
```

Exemple appliqué : champs mois des périodes saisonnières dans `dynamic-pricing.component.ts`.

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
