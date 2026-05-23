# FlowlyRent — Contexte projet

## Vue d'ensemble

FlowlyRent est une plateforme de gestion de location saisonnière (MVP).
Elle permet à un hôte de centraliser ses réservations provenant de plusieurs plateformes (Booking.com, Airbnb, Abritel) et de gérer ses réservations directes.

**Dépôt GitHub :** `fxpast/flowlyrent`
**Branche de développement :** `claude/booking-mvp-objectives-yHm1I`

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 17 (standalone components) + Angular Material |
| Backend | Java 17 + Spring Boot 3.2 |
| Base de données | MariaDB 11 |
| ORM | Spring Data JPA / Hibernate |
| Paiement | Stripe (Checkout Session + Payment Intent + Webhooks) |
| Messagerie temps réel | WebSocket (STOMP via SockJS) |
| Synchronisation plateformes | iCal (standard universel) |
| Infrastructure | Docker Compose |
| API docs | Springdoc OpenAPI (Swagger UI) |

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
│       │   ├── SecurityConfig.java   # HTTP Basic auth, routes publiques/admin
│       │   ├── WebConfig.java        # CORS (localhost:4200)
│       │   └── WebSocketConfig.java  # STOMP /ws endpoint
│       ├── model/
│       │   ├── Property.java         # Logement
│       │   ├── Booking.java          # Réservation
│       │   ├── Guest.java            # Voyageur
│       │   ├── Message.java          # Message hôte <-> voyageur
│       │   ├── Payment.java          # Paiement Stripe
│       │   ├── Channel.java          # Canal sync (iCal URL par plateforme)
│       │   └── enums/
│       │       ├── BookingStatus.java  # PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
│       │       ├── BookingSource.java  # DIRECT, BOOKING_COM, AIRBNB, ABRITEL
│       │       ├── Platform.java       # BOOKING_COM, AIRBNB, ABRITEL
│       │       ├── PaymentStatus.java  # PENDING, COMPLETED, REFUNDED, FAILED, CANCELLED
│       │       └── SenderType.java     # GUEST, HOST
│       ├── repository/               # Spring Data JPA (un par entité)
│       ├── service/
│       │   ├── BookingService.java   # CRUD + arrivées/départs par semaine
│       │   ├── ICalSyncService.java  # Sync iCal automatique (cron toutes les 2h)
│       │   ├── MessageService.java   # Messagerie + push WebSocket
│       │   └── PaymentService.java   # Stripe Checkout + webhooks
│       ├── controller/
│       │   ├── AdminBookingController.java   # /admin/bookings/**
│       │   ├── AdminMessageController.java   # /admin/messages/**
│       │   ├── AdminPaymentController.java   # /admin/payments/**
│       │   ├── SyncController.java           # /sync/channels/**
│       │   ├── PublicBookingController.java  # /public/**
│       │   └── StripeWebhookController.java  # /webhooks/stripe
│       └── dto/                      # BookingRequest, BookingResponse, GuestDTO, etc.
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
│       ├── styles.scss               # Global styles + Angular Material theme
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
│           │   │   ├── auth.service.ts      # Login HTTP Basic, localStorage
│           │   │   ├── booking.service.ts   # Appels API admin réservations
│           │   │   ├── message.service.ts   # Appels API + WebSocket STOMP
│           │   │   ├── payment.service.ts   # Appels API paiements Stripe
│           │   │   ├── sync.service.ts      # Appels API synchronisation iCal
│           │   │   └── public.service.ts    # Appels API site public
│           │   ├── guards/
│           │   │   └── auth.guard.ts        # Redirige /admin/login si non connecté
│           │   └── interceptors/
│           │       └── auth.interceptor.ts  # Ajoute Authorization: Basic sur /admin et /sync
│           ├── admin/
│           │   ├── admin.routes.ts          # Lazy loading des pages admin
│           │   ├── layout/admin-layout.component.ts  # Sidenav + toolbar
│           │   ├── login/login.component.ts
│           │   ├── dashboard/dashboard.component.ts  # Stats du jour + listes semaine
│           │   ├── arrivals/arrivals.component.ts    # Arrivées avec navigation semaine
│           │   ├── departures/departures.component.ts
│           │   ├── bookings/bookings.component.ts    # Liste + filtres + actions
│           │   ├── booking-form/booking-form.component.ts  # Créer/modifier réservation
│           │   ├── messages/messages.component.ts    # Chat temps réel
│           │   ├── payments/payments.component.ts    # Génération liens Stripe
│           │   └── sync/sync.component.ts            # Gestion canaux iCal
│           └── public/
│               ├── public.routes.ts
│               ├── home/home.component.ts            # Liste des logements
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

## Endpoints API backend

Le contexte path est `/api` — toutes les routes sont préfixées.

### Admin (authentification HTTP Basic requise)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/bookings` | Liste toutes les réservations |
| GET | `/admin/bookings/{id}` | Détail d'une réservation |
| POST | `/admin/bookings` | Créer une réservation directe |
| PUT | `/admin/bookings/{id}` | Modifier une réservation |
| PATCH | `/admin/bookings/{id}/status` | Changer le statut |
| GET | `/admin/bookings/arrivals?weekStart=YYYY-MM-DD` | Arrivées de la semaine |
| GET | `/admin/bookings/departures?weekStart=YYYY-MM-DD` | Départs de la semaine |
| GET | `/admin/messages/{bookingId}` | Messages d'une réservation |
| POST | `/admin/messages/{bookingId}` | Envoyer un message (hôte) |
| GET | `/admin/messages/unread-count` | Nombre de messages non lus |
| GET | `/admin/payments` | Liste des paiements |
| POST | `/admin/payments/checkout-session` | Créer un lien Stripe Checkout |
| POST | `/admin/payments/payment-intent` | Créer un Payment Intent Stripe |
| GET | `/sync/channels` | Liste des canaux iCal |
| POST | `/sync/channels` | Ajouter un canal |
| PUT | `/sync/channels/{id}` | Modifier un canal |
| POST | `/sync/channels/{id}/sync` | Déclencher une sync manuelle |
| POST | `/sync/all` | Synchroniser tous les canaux |

### Public (sans authentification)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/public/properties` | Liste des logements actifs |
| GET | `/public/properties/{id}` | Détail d'un logement |
| GET | `/public/properties/{id}/availability?checkIn=&checkOut=` | Vérifier la disponibilité |
| POST | `/public/bookings` | Créer une réservation (client) |
| GET | `/public/bookings/{id}` | Voir sa réservation |
| POST | `/public/messages/{bookingId}` | Envoyer un message (voyageur) |
| POST | `/public/payments/{bookingId}/checkout` | Démarrer le paiement Stripe |

### Webhooks
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/webhooks/stripe` | Webhook Stripe (signature vérifiée) |

### WebSocket
- Endpoint STOMP : `/ws` (SockJS)
- Topic messages : `/topic/messages/{bookingId}`

---

## Variables d'environnement

Copier `.env.example` en `.env` et remplir :

```bash
# Backend
DB_USERNAME=flowlyrent
DB_PASSWORD=flowlyrent
ADMIN_USERNAME=admin
ADMIN_PASSWORD=mot_de_passe_fort
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend (environments/environment.ts)
stripePublishableKey: 'pk_test_...'
```

---

## Synchronisation iCal — Plateformes

La synchronisation fonctionne via le standard iCal (`.ics`), universel sur toutes les plateformes :

| Plateforme | Où trouver l'URL iCal |
|------------|----------------------|
| Booking.com | Extranet → Calendrier → Exporter le calendrier |
| Airbnb | Calendrier → Disponibilités → Exporter le calendrier |
| Abritel | Calendrier → Synchroniser → Exporter iCal |

La sync s'exécute **automatiquement toutes les 2 heures** (configurable via `sync.ical.cron` dans `application.yml`).
Elle peut aussi être déclenchée manuellement depuis l'admin → Synchronisation.

---

## Lancer le projet

### Développement local
```bash
# Base de données
docker run -d --name mariadb \
  -e MYSQL_DATABASE=flowlyrent \
  -e MYSQL_USER=flowlyrent \
  -e MYSQL_PASSWORD=flowlyrent \
  -e MYSQL_ROOT_PASSWORD=root \
  -p 3306:3306 mariadb:11

# Backend (depuis /backend)
./mvnw spring-boot:run

# Frontend (depuis /frontend)
npm install
npm start  # → http://localhost:4200 avec proxy vers :8080
```

### Production (Docker Compose)
```bash
cp .env.example .env
# Éditer .env avec les vraies clés
docker-compose up -d
# Admin → http://localhost:4200/admin/login
# Public → http://localhost:4200/public/home
# Swagger → http://localhost:8080/api/swagger-ui.html
```

---

## Objectifs MVP — Statut

- [x] Synchronisation avec Booking.com (iCal)
- [x] Synchronisation avec Airbnb (iCal)
- [x] Synchronisation avec Abritel (iCal)
- [x] Liste des arrivées de la semaine (navigation semaine)
- [x] Liste des départs de la semaine (navigation semaine)
- [x] Page de réservations directes admin (création + liste)
- [x] Modifier une réservation directe admin
- [x] Page de paiement Stripe admin (lien Checkout)
- [x] Recevoir un message du client (WebSocket temps réel)
- [x] Envoyer un message au client depuis l'admin
- [x] Site web de réservation public (accueil + fiche + paiement)

---

## Conventions de code

- **Backend** : package `com.flowlyrent`, Lombok pour les getters/setters (`@Data`), DTOs séparés des entités
- **Frontend** : composants standalone Angular 17, signals (`signal()`) pour l'état local, `@for` / `@if` (nouvelle syntaxe Angular)
- **Langue de l'interface** : Français
- **Pas de commentaires inutiles** — le code se lit tout seul

---

## Prochaines évolutions possibles

- Calendrier visuel des disponibilités (vue mensuelle par logement)
- Notifications email automatiques (confirmation, rappel)
- Tableau de bord revenus / statistiques
- Gestion multi-logements avancée
- Authentification JWT (remplacer HTTP Basic)
- Application mobile (Ionic / Capacitor)
- Intégration API native Booking.com (partenariat requis)
