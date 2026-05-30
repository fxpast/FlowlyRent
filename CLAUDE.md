# FlowlyRent — Contexte projet

## Vue d'ensemble

FlowlyRent est une plateforme SaaS multi-tenant de gestion de location saisonnière (MVP).
Elle permet à chaque hôte de connecter son compte Beds24 (channel manager) pour centraliser automatiquement ses propriétés et réservations, gérer des réservations directes, et proposer un site de réservation public personnalisé.

**Dépôt GitHub :** `fxpast/flowlyrent` — ⚠️ **REPO PUBLIC**
**Domaine production :** `flowlyrent.com`

---

## ⚠️ Sécurité — Repo public

Le dépôt GitHub est **public**. Règles absolues :

- **Ne jamais committer de secrets** dans aucun fichier versionné (`application.yml`, `environment.ts`, etc.)
- Toutes les valeurs sensibles passent **uniquement par des variables d'environnement** (Railway en prod, `.env` local gitignored)
- Dans `application.yml`, la syntaxe `${MA_VAR}` sans valeur par défaut est obligatoire pour les secrets — si la variable n'est pas définie, le backend refuse de démarrer (comportement voulu)
- La syntaxe `${MA_VAR:valeur_par_defaut}` n'est acceptable **que pour les valeurs non-sensibles** (cloud name, api key publique, URLs)
- Les valeurs non-sensibles autorisées en défaut : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` (inutilisables sans le secret)
- Secrets qui **ne doivent jamais apparaître** dans le code : `CLOUDINARY_SECRET`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD`, `DB_PASSWORD`

---

## Workflow Git

| Branche | Rôle |
|---------|------|
| `dev` | Développement — tous les commits et pushs de Claude vont ici |
| `master` | Production — géré exclusivement par l'utilisateur |

> **RÈGLE ABSOLUE — GIT** :
> - Toujours travailler sur la branche `dev` (`git checkout dev` avant tout commit)
> - Ne **jamais** committer ni pousser sur `master`
> - C'est l'utilisateur qui merge `dev → master` et décide de ce qui part en prod
> - Ne jamais exécuter `git push origin master` ni créer de Pull Request sans accord explicite

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 17 (standalone components) + Angular Material |
| Backend | Java 17 + Spring Boot 3.2 |
| Base de données | MySQL/MariaDB (XAMPP en dev, MariaDB 11 en prod) |
| ORM | Spring Data JPA / Hibernate (`ddl-auto: update`) |
| Authentification | JWT (jjwt 0.12.5) — sujet = email, durée 7 jours |
| Paiement | Stripe (Checkout Session + Payment Intent + Webhooks) |
| Messagerie temps réel | WebSocket (STOMP via SockJS) |
| Synchronisation plateformes | Beds24 API v2 (principal) + iCal (legacy) |
| Stockage photos | Cloudinary (`cloudinary-http45` 1.38.0) — cloud name `dlixzbkue` |
| Infrastructure dev | Docker Compose / XAMPP local |
| Infrastructure prod | Netlify (frontend) + Railway (backend + MySQL) |
| API docs | Springdoc OpenAPI (Swagger UI) |

---

## Plans tarifaires

| Plan | Prix | Propriétés | Notes |
|------|------|-----------|-------|
| FREE | 0€ | 1 | 2% de commission sur réservations directes |
| STARTER | 9€/mois | 3 | |
| PRO | 19€/mois | Illimité | |
| AGENCE | 49€/mois | Illimité | Multi-utilisateurs |

---

## Architecture multi-tenant

Chaque entité de données est rattachée à un `AppUser` via une FK `user_id` sur `Property`.
Toutes les routes admin lisent l'utilisateur courant via `SecurityUtils.getCurrentUserId()`.
**Règle absolue : ne jamais retourner de données appartenant à un autre utilisateur.**

---

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
│       │   ├── Booking.java          # Réservation
│       │   ├── Guest.java            # Voyageur
│       │   ├── Message.java          # Message hôte <-> voyageur
│       │   ├── Payment.java          # Paiement Stripe
│       │   ├── Channel.java          # Canal iCal (legacy)
│       │   ├── AvailabilityBlock.java # Blocage manuel de dates
│       │   ├── HousekeepingTask.java  # Tâche ménage — housekeeper FK, report, hasIncident
│       │   ├── HousekeeperProfile.java # Prestataire ménage — linkedUser (AppUser HOUSEKEEPER)
│       │   ├── TaskPhoto.java         # Photo tâche — url (Cloudinary) + publicId + data (legacy base64)
│       │   ├── AnalyticsEvent.java    # Événement analytics (PAGE_VIEW, LOGIN, CLICK)
│       │   ├── Feedback.java          # Feedback utilisateur (catégorie + message + statut)
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
│       │       └── SenderType.java        # GUEST, HOST
│       ├── repository/               # Spring Data JPA (un par entité)
│       ├── service/
│       │   ├── Beds24SyncService.java # Sync Beds24 API v2 (propriétés, chambres, réservations)
│       │   ├── BookingService.java    # CRUD + arrivées/départs par semaine (scopé par user)
│       │   ├── CloudinaryService.java # Upload base64 → Cloudinary + suppression par publicId
│       │   ├── ICalSyncService.java   # Sync iCal automatique (cron toutes les 2h)
│       │   ├── MessageService.java    # Messagerie + push WebSocket
│       │   ├── PaymentService.java    # Stripe Checkout + webhooks
│       │   ├── AnalyticsService.java  # Enregistrement events + calcul KPIs superadmin
│       │   └── SyncResult.java        # DTO résultat de sync
│       ├── controller/
│       │   ├── AuthController.java          # /auth/register, /auth/login
│       │   ├── UserSettingsController.java  # /user/profile, /user/beds24/**, /user/password, /user/feedback
│       │   ├── AdminBookingController.java  # /admin/bookings/**
│       │   ├── AdminMessageController.java  # /admin/messages/**
│       │   ├── AdminPaymentController.java  # /admin/payments/**
│       │   ├── AdminHousekeeperController.java  # /admin/housekeepers/** (CRUD + activate/deactivate portal)
│       │   ├── AdminHousekeepingController.java # /admin/housekeeping/** (tâches + GET /{id}/photos)
│       │   ├── HousekeeperPortalController.java # /housekeeper/** (espace prestataire — ROLE_HOUSEKEEPER)
│       │   ├── SyncController.java          # /sync/channels/** (iCal uniquement)
│       │   ├── PublicBookingController.java # /public/{slug}/** + /public/**
│       │   ├── StripeWebhookController.java # /webhooks/stripe
│       │   ├── AnalyticsController.java     # /analytics/track (public — visiteurs anonymes)
│       │   ├── FeedbackController.java      # /user/feedback (POST)
│       │   └── SuperAdminController.java    # /superadmin/** (ROLE_ADMIN requis)
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
│           │   │   ├── auth.service.ts      # Login JWT, localStorage — role USER/ADMIN/HOUSEKEEPER
│           │   │   ├── booking.service.ts   # Appels API admin réservations
│           │   │   ├── message.service.ts   # Appels API + WebSocket STOMP
│           │   │   ├── payment.service.ts   # Appels API paiements Stripe
│           │   │   ├── sync.service.ts      # Appels API synchronisation iCal
│           │   │   ├── public.service.ts    # Appels API site public
│           │   │   ├── analytics.service.ts # Auto-tracking PAGE_VIEW (tous visiteurs, auth ou non)
│           │   │   ├── user.service.ts      # Profil, Beds24, mot de passe
│           │   │   ├── housekeeper.service.ts        # Admin — CRUD prestataires + activate/deactivate portal
│           │   │   └── housekeeper-portal.service.ts # Portail — me, tasks, status, report, photos
│           │   ├── guards/
│           │   │   ├── auth.guard.ts        # Redirige selon rôle : USER→/admin, ADMIN→/superadmin, HOUSEKEEPER→/housekeeper
│           │   │   ├── superadmin.guard.ts  # Vérifie isAdmin() — protège /superadmin/**
│           │   │   └── housekeeper.guard.ts # Vérifie isHousekeeper() — protège /housekeeper/**
│           │   └── interceptors/
│           │       └── auth.interceptor.ts  # Bearer token sur /admin, /sync, /user, /superadmin, /analytics, /housekeeper
│           ├── admin/
│           │   ├── admin.routes.ts          # Lazy loading des pages admin
│           │   ├── layout/admin-layout.component.ts  # Sidenav + toolbar (mat-sidenav-container)
│           │   ├── login/login.component.ts           # Redirige ADMIN → /superadmin/dashboard
│           │   ├── dashboard/dashboard.component.ts  # Stats du jour + listes semaine
│           │   ├── arrivals/arrivals.component.ts    # Arrivées avec navigation semaine
│           │   ├── departures/departures.component.ts
│           │   ├── bookings/bookings.component.ts    # Liste + filtres + actions
│           │   ├── booking-form/booking-form.component.ts  # Créer/modifier réservation
│           │   ├── messages/messages.component.ts    # Chat temps réel
│           │   ├── payments/payments.component.ts    # Génération liens Stripe
│           │   ├── sync/sync.component.ts            # Gestion canaux iCal
│           │   ├── housekeeping/housekeeping.component.ts  # Tâches ménage + Prestataires + viewer rapport/photos
│           │   ├── settings/settings.component.ts    # Beds24 + Profil + Mot de passe
│           │   └── feedback/feedback.component.ts    # Formulaire feedback MVP
│           ├── superadmin/                           # Accessible uniquement ROLE_ADMIN
│           │   ├── superadmin.routes.ts
│           │   ├── superadmin-layout.component.ts
│           │   ├── dashboard/superadmin-dashboard.component.ts  # KPIs (users, logins, clics, visiteurs anonymes)
│           │   ├── users/superadmin-users.component.ts          # Liste users + reset mdp + suppression
│           │   └── feedbacks/superadmin-feedbacks.component.ts  # Feedbacks + gestion statut
│           ├── housekeeper/                          # Portail prestataire — ROLE_HOUSEKEEPER uniquement
│           │   ├── housekeeper.routes.ts             # Route racine avec housekeeperGuard
│           │   ├── layout/housekeeper-layout.component.ts  # Toolbar simple + nom + logout
│           │   └── tasks/housekeeper-tasks.component.ts    # Missions groupées par date, rapport, photos
│           └── public/
│               ├── public.routes.ts
│               ├── home/home.component.ts            # Page d'accueil (bandeau bêta MVP)
│               ├── property-detail/property-detail.component.ts  # Fiche + réservation
│               └── booking/booking.component.ts      # Récapitulatif + messages client
│
├── database/
│   └── init.sql                      # Création BDD + utilisateur MariaDB
├── docker-compose.yml                # db + backend + frontend
├── .env.example                      # Variables d'environnement à copier en .env
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

---

## Stockage des photos (Cloudinary)

Les photos de tâches ménage sont stockées sur **Cloudinary** (cloud `dlixzbkue`).

### Flux upload
1. La prestataire prend une photo sur mobile → le frontend lit le fichier en base64 (`FileReader`)
2. Le base64 est envoyé au backend via `POST /housekeeper/tasks/{id}/photos`
3. Le backend uploade vers Cloudinary via `CloudinaryService.uploadBase64()` dans le dossier `flowlyrent/tasks/{taskId}/`
4. Cloudinary retourne `secure_url` et `public_id` → stockés dans `task_photos.url` et `task_photos.public_id`
5. Le champ `data` (LONGTEXT) reste null pour les nouveaux uploads

### Fallback base64
Si l'upload Cloudinary échoue, la photo est sauvegardée en base64 dans le champ `data` (comportement legacy). L'affichage utilise `url ?? data` partout.

### Suppression
Quand une photo est supprimée, `CloudinaryService.delete(publicId)` est appelé avant `photoRepo.deleteById()`.

### Affichage côté admin
Le menu Ménage affiche un bouton `photo_library` sur chaque carte de tâche assignée à un prestataire. Clic → `MatDialog` (CDK overlay, hors du `mat-sidenav-container`) affichant rapport + photos groupées par type (Avant / Après / Incident). Clic sur une photo → plein écran dans un nouvel onglet.

> **Note technique** : les dialogs utilisent `MatDialog` et non un overlay `position:fixed` inline, car `mat-sidenav-container` applique des transforms CSS qui cassent `position:fixed` à l'intérieur du sidenav.

---

## Endpoints API backend

Le contexte path est `/api` — toutes les routes sont préfixées.

### Authentification (public)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | Créer un compte (retourne JWT) |
| POST | `/auth/login` | Se connecter (retourne JWT) |

### Paramètres utilisateur (JWT requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/user/profile` | Profil de l'utilisateur connecté |
| PUT | `/user/profile` | Modifier firstName, lastName, publicSiteSlug |
| GET | `/user/beds24/status` | Statut connexion Beds24 + dernière sync |
| POST | `/user/beds24/connect-token` | Connecter compte Beds24 via setup token |
| POST | `/user/beds24/sync` | Déclencher une sync manuelle Beds24 |
| DELETE | `/user/beds24/disconnect` | Déconnecter le compte Beds24 |
| PATCH | `/user/password` | Changer son mot de passe (vérifie l'ancien) |
| POST | `/user/feedback` | Soumettre un feedback MVP |

### Admin (JWT requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/bookings` | Liste des réservations (scopé user) |
| GET | `/admin/bookings/{id}` | Détail d'une réservation |
| POST | `/admin/bookings` | Créer une réservation directe |
| PUT | `/admin/bookings/{id}` | Modifier une réservation |
| PATCH | `/admin/bookings/{id}/status` | Changer le statut |
| GET | `/admin/bookings/arrivals?weekStart=YYYY-MM-DD` | Arrivées de la semaine |
| GET | `/admin/bookings/departures?weekStart=YYYY-MM-DD` | Départs de la semaine |
| GET | `/admin/messages/{bookingId}` | Messages d'une réservation |
| POST | `/admin/messages/{bookingId}` | Envoyer un message (hôte) |
| GET | `/admin/messages/unread-count` | Nombre de messages non lus |
| GET | `/admin/properties` | Liste des logements de l'utilisateur |
| GET | `/admin/payments` | Liste des paiements |
| POST | `/admin/payments/checkout-session` | Créer un lien Stripe Checkout |
| POST | `/admin/payments/payment-intent` | Créer un Payment Intent Stripe |
| GET | `/admin/housekeeping?from=&to=` | Tâches ménage (filtrées par date) |
| POST | `/admin/housekeeping` | Créer une tâche manuelle (accepte `housekeeperId`) |
| PATCH | `/admin/housekeeping/{id}/status` | Changer le statut d'une tâche |
| GET | `/admin/housekeeping/{id}/photos` | Photos d'une tâche (vérifié par user_id) |
| DELETE | `/admin/housekeeping/{id}` | Supprimer une tâche |
| GET | `/admin/housekeepers` | Liste des prestataires (scopé user) |
| POST | `/admin/housekeepers` | Créer un prestataire |
| PUT | `/admin/housekeepers/{id}` | Modifier un prestataire |
| DELETE | `/admin/housekeepers/{id}` | Supprimer un prestataire (soft delete) |
| POST | `/admin/housekeepers/{id}/activate` | Créer compte portail (AppUser HOUSEKEEPER) + lier au profil |
| DELETE | `/admin/housekeepers/{id}/deactivate` | Désactiver compte portail (active=false, unlink) |
| GET | `/admin/availability/calendar?from=&to=` | Données calendrier (propriétés, réservations, blocages) |
| POST | `/admin/availability/blocks` | Créer un blocage de dates |
| DELETE | `/admin/availability/blocks/{id}` | Supprimer un blocage |
| GET | `/sync/channels` | Liste des canaux iCal |
| POST | `/sync/channels` | Ajouter un canal iCal |
| PUT | `/sync/channels/{id}` | Modifier un canal iCal |
| POST | `/sync/channels/{id}/sync` | Déclencher une sync iCal manuelle |
| POST | `/sync/all` | Synchroniser tous les canaux iCal |

### Public (sans authentification)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/public/{slug}/properties` | Logements actifs d'un hôte (par slug) |
| GET | `/public/{slug}/properties/{id}` | Détail d'un logement |
| GET | `/public/{slug}/properties/{id}/availability` | Vérifier la disponibilité |
| POST | `/public/{slug}/bookings` | Créer une réservation (client) |
| GET | `/public/properties` | Liste globale (legacy) |
| GET | `/public/bookings/{id}` | Voir sa réservation |
| POST | `/public/messages/{bookingId}` | Envoyer un message (voyageur) |
| POST | `/public/payments/{bookingId}/checkout` | Démarrer le paiement Stripe |

### Analytics (public — sans authentification)
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/analytics/track` | Enregistrer un événement `{type, page}` — userId null si non connecté |

### Portail prestataire (ROLE_HOUSEKEEPER requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/housekeeper/me` | Profil du prestataire connecté |
| GET | `/housekeeper/tasks?from=YYYY-MM-DD` | Tâches assignées à partir d'une date |
| PATCH | `/housekeeper/tasks/{id}/status` | Changer le statut (PENDING/IN_PROGRESS/DONE/SKIPPED) |
| POST | `/housekeeper/tasks/{id}/report` | Sauvegarder rapport (commentaire + incident) |
| GET | `/housekeeper/tasks/{id}/photos` | Lister les photos d'une tâche |
| POST | `/housekeeper/tasks/{id}/photos` | Ajouter une photo (base64 → Cloudinary, fallback base64) |
| DELETE | `/housekeeper/tasks/{id}/photos/{photoId}` | Supprimer une photo (+ suppression Cloudinary) |

### Superadmin (ROLE_ADMIN requis)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/superadmin/stats` | KPIs (users, logins, clics, visiteurs anonymes) |
| GET | `/superadmin/users` | Liste de tous les utilisateurs |
| DELETE | `/superadmin/users/{id}` | Supprimer définitivement un compte |
| PATCH | `/superadmin/users/{id}/password` | Réinitialiser le mot de passe d'un user |
| GET | `/superadmin/feedbacks` | Liste des feedbacks |
| PATCH | `/superadmin/feedbacks/{id}/status` | Changer le statut d'un feedback |

> **Comptes exclus des KPIs** : configurés via la variable d'environnement `ANALYTICS_INTERNAL_EMAILS` (liste séparée par virgules dans `.env`)

### Webhooks
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/webhooks/stripe` | Webhook Stripe (signature vérifiée) |

### WebSocket
- Endpoint STOMP : `/ws` (SockJS)
- Topic messages : `/topic/messages/{bookingId}`

---

## Synchronisation Beds24

La sync Beds24 est **au niveau du compte utilisateur** (pas par canal).

### Flux d'authentification
1. L'utilisateur saisit son email/mot de passe Beds24 dans l'admin
2. `POST /user/beds24/connect` → `Beds24SyncService.connectAccount()` appelle Beds24 `/authentication/setup`
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
Toujours disponible pour les plateformes sans compte Beds24 :

| Plateforme | Où trouver l'URL iCal |
|------------|----------------------|
| Booking.com | Extranet → Calendrier → Exporter le calendrier |
| Airbnb | Calendrier → Disponibilités → Exporter le calendrier |
| Abritel | Calendrier → Synchroniser → Exporter iCal |

---

## Code PHP de référence

Le dossier **`C:\FlowlyRent\php_code\`** contient l'application PHP legacy qui sert de référence pour le portage vers FlowlyRent.

> Ce dossier est **gitignored** — ne jamais le committer.

Fichiers clés à consulter en priorité :

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

**Usage** : quand un comportement est incertain (formules de calcul, mapping de champs Beds24, logique métier), consulter le fichier PHP correspondant comme référence.

---

## Tokens de développement Beds24

Les tokens de dev sont stockés dans **`.beds24.env.local`** (gitignored — jamais commité).
Lire ce fichier pour tester l'API Beds24 sans passer par le flux d'authentification complet.

---

## Variables d'environnement

⚠️ **Repo public** : aucune valeur sensible ne doit apparaître dans le code ou les fichiers versionnés.

Copier `.env.example` en `.env` (gitignored) et remplir :

```bash
# Base de données
DB_USERNAME=flowlyrent
DB_PASSWORD=flowlyrent

# JWT
JWT_SECRET=<base64 32+ bytes>
JWT_EXPIRATION=604800000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudinary (stockage photos ménage)
CLOUDINARY_SECRET=<api_secret Cloudinary>
# CLOUDINARY_CLOUD_NAME et CLOUDINARY_API_KEY ont des défauts non-sensibles dans application.yml

# Compte superadmin auto-créé au démarrage (AdminBootstrap)
ADMIN_USERNAME=admin@flowlyrent.com
ADMIN_PASSWORD=<mot de passe sécurisé>

# Frontend (environments/environment.ts — ne pas committer les clés live)
stripePublishableKey: 'pk_test_...'
```

---

## Lancer le projet

### Développement local (XAMPP)
```bash
# Démarrer XAMPP (MySQL sur localhost:3306)
# Créer la base :
mysql -u root -e "CREATE DATABASE IF NOT EXISTS flowlyrent CHARACTER SET utf8mb4;"

# Backend (depuis /backend) — pas de fichier mvnw, utiliser mvn directement
mvn spring-boot:run

# Frontend (depuis /frontend)
npm install
npm start  # → http://localhost:4200 avec proxy vers :8080
```

### Connexion base Railway (production)

Les paramètres de connexion Railway (host, port, password) sont disponibles dans le dashboard Railway.
Ne jamais les committer dans git.

**Importer les données locales → Railway** (à refaire après chaque évolution de schéma) :

```powershell
# 1. Exporter XAMPP
& "C:\xampp\mysql\bin\mysqldump.exe" -u root flowlyrent > flowlyrent_export.sql

# 2. Importer via Node (nécessaire car XAMPP = MariaDB client, Railway = MySQL 8)
#    Créer C:\FlowlyRent\_tmp_import\ avec package.json + import.mjs
#    puis : node import.mjs
```

> Le client MariaDB de XAMPP ne supporte pas le plugin `caching_sha2_password` de MySQL 8.
> Utiliser le script Node.js `mysql2` qui gère aussi le décodage UTF-16 LE du dump.

---

### Production (Netlify + Railway)

**Frontend → Netlify**
- Connecter le repo GitHub sur [app.netlify.com](https://app.netlify.com)
- Netlify lit automatiquement `frontend/netlify.toml`
- Build : `npm ci && npm run build -- --configuration production`
- Publish : `dist/flowlyrent/browser`
- Mettre à jour `environment.prod.ts` avec l'URL Railway du backend

**Backend → Railway**
- Connecter le repo GitHub sur [railway.app](https://railway.app)
- Root directory : `backend/` — Railway détecte le Dockerfile
- Ajouter un plugin MySQL dans le projet Railway
- Variables d'environnement Railway à configurer :
  ```
  SPRING_PROFILES_ACTIVE=prod
  JWT_SECRET=<clé base64 32+ octets>
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  CLOUDINARY_SECRET=<api_secret Cloudinary — régénérer si compromis>
  CORS_ALLOWED_ORIGINS=https://flowlyrent.com,https://www.flowlyrent.com,https://flowlyrent.netlify.app
  ADMIN_USERNAME=admin@flowlyrent.com
  ADMIN_PASSWORD=<mot de passe sécurisé>
  ANALYTICS_INTERNAL_EMAILS=<emails internes séparés par virgule>
  ```
  Les variables `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`
  sont injectées automatiquement par Railway depuis le plugin MySQL.

**Profil Spring Boot prod** : `application-prod.yml` (se charge via `SPRING_PROFILES_ACTIVE=prod`)

**CORS** : `WebConfig.java` lit `app.cors.allowed-origins` — défaut localhost:4200 en dev,
variable `CORS_ALLOWED_ORIGINS` en prod.

---

## Objectifs MVP — Statut

- [x] Authentification JWT multi-tenant (register / login)
- [x] Connexion compte Beds24 par user (username+password → refresh token)
- [x] Synchronisation automatique propriétés depuis Beds24
- [x] Synchronisation automatique chambres/unités depuis Beds24
- [x] Synchronisation automatique réservations depuis Beds24 (incrémentale)
- [x] Génération automatique tâches ménage à chaque checkout
- [x] Blocages manuels de dates (AvailabilityBlock)
- [x] Synchronisation avec Booking.com / Airbnb / Abritel (iCal)
- [x] Liste des arrivées de la semaine (navigation semaine)
- [x] Liste des départs de la semaine (navigation semaine)
- [x] Réservations directes admin (création + liste + modification)
- [x] Paiement Stripe admin (lien Checkout)
- [x] Messagerie temps réel hôte ↔ voyageur (WebSocket)
- [x] Site de réservation public par slug (`/public/{slug}/properties`)
- [x] Interface admin — paramètres Beds24 (connexion / sync manuelle)
- [x] Interface admin — tâches ménage
- [x] Interface admin — calendrier des disponibilités
- [x] Notifications email (confirmation réservation, reçu paiement, rappel J-1)
- [x] Tableau de bord revenus / statistiques
- [x] Rôles utilisateurs (USER / ADMIN / HOUSEKEEPER) — JWT claim "role"
- [x] Dashboard superadmin — KPIs filtrés (utilisateurs, connexions, clics, visiteurs anonymes)
- [x] Tracking analytique automatique (PAGE_VIEW tous visiteurs + LOGIN)
- [x] Feedback utilisateurs — formulaire + gestion superadmin
- [x] Changement de mot de passe — auto (paramètres) + admin (superadmin)
- [x] Suppression compte utilisateur (superadmin)
- [x] Auto-création compte ADMIN au démarrage (AdminBootstrap + env vars)
- [x] Prestataires ménage — CRUD admin + onglet dédié dans housekeeping
- [x] Portail prestataire — espace personnel `/housekeeper/tasks` (rôle HOUSEKEEPER)
- [x] Activation portail prestataire — création compte AppUser lié au profil
- [x] Rapport de tâche — commentaire + signalement incident
- [x] Photos tâche — avant/après/incident (caméra mobile → Cloudinary)
- [x] Consultation photos prestataire depuis le menu Ménage admin (MatDialog)
- [x] Logo SVG + favicon maison bleue
- [x] Domaine personnalisé flowlyrent.com

---

## Conventions de code

- **Backend** : package `com.flowlyrent`, Lombok (`@Data`), DTOs séparés des entités
- **Frontend** : composants standalone Angular 17, signals (`signal()`), syntaxe `@for` / `@if`
- **Multi-tenant** : toujours filtrer par `getCurrentUserId()` dans les contrôleurs admin
- **Dialogs admin** : utiliser `MatDialog` (CDK overlay) et non `position:fixed` inline — le `mat-sidenav-container` applique des transforms qui cassent `position:fixed`
- **Langue de l'interface** : Français
- **Pas de commentaires inutiles** — le code se lit tout seul
- **Sécurité repo public** : aucune valeur sensible en dur dans le code — tout passe par `${ENV_VAR}` sans défaut
- **Git** : travailler sur `dev`, ne jamais toucher à `master`
