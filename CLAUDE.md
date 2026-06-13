# FlowlyRent — Contexte projet

## Vue d'ensemble

FlowlyRent est une plateforme SaaS multi-tenant de gestion de location saisonnière (MVP).
Chaque hôte connecte son compte Beds24 (channel manager) pour centraliser propriétés et réservations, gérer des réservations directes, et proposer un site de réservation public personnalisé.

**Dépôt GitHub :** `fxpast/flowlyrent` — ⚠️ **REPO PUBLIC**
**Domaine production :** `flowlyrent.com`

---

## ⚠️ Sécurité — Repo public

- **Ne jamais committer de secrets** dans aucun fichier versionné
- Toutes les valeurs sensibles passent **uniquement par des variables d'environnement**
- Dans `application.yml` : syntaxe `${MA_VAR}` sans défaut obligatoire pour les secrets
- Secrets qui **ne doivent jamais apparaître** dans le code :
  `CLOUDINARY_SECRET`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD`, `DB_PASSWORD`

---

## Workflow Git

| Branche | Rôle |
|---------|------|
| `dev` | Développement — tous les commits et pushs de Claude vont ici |
| `master` | Production — géré exclusivement par l'utilisateur |

> **RÈGLE ABSOLUE** :
> - Toujours travailler sur `dev`
> - Ne **jamais** committer ni pousser sur `master`
> - C'est l'utilisateur qui merge `dev → master`

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Angular 17 (standalone) + Angular Material + ngx-translate (FR/EN/ES/DE/IT) |
| Backend | Java 17 + Spring Boot 3.2 |
| Base de données | MySQL/MariaDB (XAMPP dev, MariaDB 11 prod) |
| ORM | Spring Data JPA / Hibernate (`ddl-auto: update`) |
| Authentification | JWT (jjwt 0.12.5) — sujet = email, durée **365 jours** + `POST /auth/refresh` |
| Paiement | Stripe (Checkout Session + Payment Intent + Webhooks) |
| Messagerie | WebSocket (STOMP via SockJS) |
| Sync plateformes | Beds24 API v2 + iCal (legacy) |
| Stockage photos | Cloudinary (`cloudinary-http45` 1.38.0) — cloud `dlixzbkue` |
| App mobile | Flutter WebView (`flowlyrent_app/`) → `flowlyrent.com` — package `com.flowlyrent.flowlyrent_app` |
| Infrastructure dev | Docker Compose / XAMPP local |
| Infrastructure prod | Netlify (frontend) + Railway (backend + MySQL) |

---

## Plans tarifaires

| Plan | Prix | Propriétés |
|------|------|-----------|
| FREE | 0€ | 1 (2% commission directe) |
| STARTER | 9€/mois | 3 |
| PRO | 19€/mois | Illimité |
| AGENCE | 49€/mois | Illimité (multi-utilisateurs) |

---

## Architecture multi-tenant

Chaque entité est rattachée à un `AppUser` via `user_id` sur `Property`.
Toutes les routes admin lisent l'utilisateur via `SecurityUtils.getCurrentUserId()`.
**Règle absolue : ne jamais retourner de données appartenant à un autre utilisateur.**

---

## Commandes essentielles

```bash
# Backend (depuis /backend)
mvn spring-boot:run

# Frontend (depuis /frontend)
npm install && npm start   # → http://localhost:4200 (proxy → :8080)

# Base de données locale
mysql -u root -e "CREATE DATABASE IF NOT EXISTS flowlyrent CHARACTER SET utf8mb4;"

# App Flutter (depuis /flowlyrent_app)
flutter run          # dev
flutter build apk    # APK debug
flutter build appbundle --release  # AAB Play Store (keystore dans android/key.properties)
```

---

## Conventions de code

- **Backend** : package `com.flowlyrent`, Lombok (`@Data`), DTOs séparés des entités
- **Frontend** : composants standalone Angular 17, signals (`signal()`), syntaxe `@for` / `@if`
- **Multi-tenant** : toujours filtrer par `getCurrentUserId()` dans les contrôleurs admin
- **i18n** : `TranslateModule` dans chaque composant, `| translate` en template, `t.instant()` en TS — fichiers JSON dans `frontend/src/assets/i18n/{fr,en,es,de,it}.json`
- **Dialogs** : utiliser `MatDialog` (CDK overlay), jamais `position:fixed` inline — `mat-sidenav-container` applique des transforms CSS qui le cassent
- **Dialogs mobile** : règle globale dans `styles.scss` — plein écran sur ≤600px automatiquement
- **Noms de propriétés** : toujours utiliser `BookingService.getPropertyNames()` ou `getPropertiesWithDisplayNames()` — appliquent automatiquement le `shortName`. Ne jamais utiliser `p['name']` directement.
- **Retour de navigation** : `location.back()` plutôt que `router.navigate()`
- **Templates messages** : `MessageTemplateService.apply(content, booking, accessCode?, checkinTime?, checkoutTime?, previousAccessCode?)`
- **Arrow functions dans templates Angular** : ne jamais utiliser `=>` ou `<` / `>` inline dans `(click)=""` — créer une méthode dans le composant
- **Affichage notes multi-lignes** : `white-space: pre-wrap` + `cdkTextareaAutosize cdkAutosizeMinRows="5"`
- **Validation formulaires** : aligner les contraintes Angular (`minlength`, `required`, `#ref="ngModel"`) sur les annotations Spring (`@Size`, `@NotBlank`) — évite de gérer le format `ProblemDetail` des erreurs de validation `@Valid`
- **Erreurs HTTP silencieuses** : utiliser `catchError(() => of(null))` pour les endpoints optionnels (ex: booking-time-overrides, Qonto) — toujours ajouter un guard `if (!result) return;` après
- **Beds24 API timeouts** : `connectTimeout(10s)` + `requestTimeout(25s)` configurés dans `Beds24ApiClient` — ne pas modifier sans raison
- **Pas de commentaires inutiles** — le code se lit tout seul
- **Git** : travailler sur `dev`, ne jamais toucher à `master`

---

## Portails de connexion

La page d'accueil (`/public/home`) présente deux portails distincts :

| Portail | Lien | Rôle accepté | Inscription |
|---------|------|--------------|-------------|
| Propriétaire / Hôte | `/admin/login?type=owner` | `USER` uniquement | Oui (`/admin/register`) |
| Prestataire | `/admin/login?type=housekeeper` | `HOUSEKEEPER` uniquement | Non |

- Le login enforcer le rôle via `ActivatedRoute.snapshot.queryParamMap.get('type')`
- Si mauvais rôle : `localStorage` nettoyé + `auth.isLoggedIn.set(false)` + message d'erreur (sans appeler `auth.logout()` qui navigue vers home)
- Après inscription ou connexion propriétaire : `getBeds24Status()` → `/admin/settings` si Beds24 non lié, sinon `/admin/dashboard`
- Le superadmin (`isAdmin()`) passe toujours directement vers `/superadmin/dashboard`, quel que soit le `type`

---

## Pages publiques Play Store

Requises par Google Play — routes sous `/public/` sans authentification :

| Route | Composant | Rôle |
|-------|-----------|------|
| `/public/privacy` | `PrivacyComponent` | Politique de confidentialité |
| `/public/delete-account` | `DeleteAccountComponent` | Procédure suppression de compte |

---

## Fonctionnalités clés

### JWT — Session persistante
- Durée : **365 jours** (configuré dans `JwtTokenProvider`)
- Auto-refresh : `AuthService.tryAutoRefresh()` appelé au démarrage — renouvelle si < 30 jours restants via `POST /auth/refresh`

### FAQ — Traduction automatique
- `FaqTranslationService` appelle MyMemory API (`api.mymemory.translated.net`) de façon asynchrone
- La traduction se déclenche automatiquement à chaque création/modification/import
- Endpoint de re-traduction forcée : `POST /superadmin/faq/retranslate`
- L'endpoint public `GET /public/faq?lang=fr` retourne la bonne langue avec fallback FR

### Dialog réservation — Onglet Entretien
- **Code d'accès** : toujours visible (pas de condition `@if undefined`) — chargé dans `ngOnInit()` avec le `cleaningFee`
- **Taxe de séjour** : `(totalPrice - cleaningFee) × 2.75%` — affichée en badge bleu sous le prix total
- **Nom/prénom** : `mapField()` écrase toujours le champ destination (fix : suppression de `!b.containsKey(to)`)

### Revenus — KPIs Qonto
- La page Revenus (`/admin/stats`) charge en parallèle le CA Beds24 ET le summary Qonto du même mois
- **Marge bénéficiaire** (KPI) : `caTotal - totalDebits Qonto` — vert/rouge selon signe
- **Marge par logement** : section affichée si Qonto connecté — dépenses liées à chaque `beds24PropertyId` via les règles de catégorisation
- `caMonthly()` retourne maintenant `propId` dans chaque entrée `byProperty`
- `fetchSummary()` retourne `byProperty` : map `beds24PropertyId → total débits`

---

## Documentation détaillée

| Fichier | Contenu |
|---------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Structure des répertoires, schéma BDD, Cloudinary, sync Beds24, code PHP référence |
| [`docs/API.md`](docs/API.md) | Tous les endpoints REST + WebSocket |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Objectifs MVP et statut d'avancement |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Variables d'environnement, lancer le projet, déploiement Netlify/Railway |
