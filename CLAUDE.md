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
  `CLOUDINARY_SECRET`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PASSWORD`, `DB_PASSWORD`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`

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
| Paiement | Stripe Connect OAuth + Payment Element (carte, Apple Pay, Google Pay, SEPA) — chaque hôte connecte son propre compte Stripe |
| Messagerie | WebSocket (STOMP via SockJS) + répondeur auto (webhook Beds24 + Groq) |
| Mode Channel | Beds24 API v2 — propriétés et réservations consommées via API (pas d'entités JPA) |
| Mode iCal | `LocalProperty` + `IcalBooking` + `PropertyIcalSource` — logements créés manuellement |
| Stockage photos | Cloudinary (`cloudinary-http45` 1.38.0) — cloud `dlixzbkue` |
| App mobile | Flutter WebView (`flowlyrent_app/`) → `flowlyrent.com` — package `com.flowlyrent.flowlyrent_app` |
| Infrastructure dev | Docker Compose / XAMPP local |
| Infrastructure prod | Netlify (frontend) + Railway (backend + MySQL) |
| Chatbot IA | Gemini 2.5 Flash (principal) + Groq `llama-3.3-70b-versatile` (fallback) + Cerebras `llama-3.3-70b` (3ème repli) — function calling + RAG keyword BM25 |
| Intégration comptable | Qonto API v2 — transactions + catégorisation + KPI marge |
| Push notifications | Web Push (VAPID) + Firebase Cloud Messaging (FCM) |

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

Toutes les entités sont rattachées à un `AppUser` via `userId` (présent sur `PropertyConfig`, `HousekeepingTask`, `LocalProperty`, `IcalBooking`, etc.).
Les routes admin lisent l'utilisateur via `SecurityUtils.getCurrentUserId()`.
**Règle absolue : ne jamais retourner de données appartenant à un autre utilisateur.**

> En mode Beds24, les entités `Property`, `Booking`, `Guest` n'existent **pas** en base — elles sont consommées directement via l'API Beds24 et retournées comme DTOs.

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
- **Champs date** : toujours utiliser `MatDatepicker` (`MatDatepickerModule` + `MatNativeDateModule`) plutôt que `<input type="date">` — pattern : `[matDatepicker]="picker"` + `(ngModelChange)="onXxxChange($event)"` pour convertir `Date → string` via `localDate()`, et `[min]="someDate"` avec une vraie `Date` (pas une string)
- **Affichage notes multi-lignes** : `white-space: pre-wrap` + `cdkTextareaAutosize cdkAutosizeMinRows="5"`
- **Validation formulaires** : aligner les contraintes Angular (`minlength`, `required`, `#ref="ngModel"`) sur les annotations Spring (`@Size`, `@NotBlank`) — évite de gérer le format `ProblemDetail` des erreurs de validation `@Valid`
- **Erreurs HTTP silencieuses** : utiliser `catchError(() => of(null))` pour les endpoints optionnels (ex: booking-time-overrides, Qonto) — toujours ajouter un guard `if (!result) return;` après
- **`application.yml` — clés top-level uniques** : YAML interdit les clés dupliquées au même niveau — `DuplicateKeyException` au démarrage Spring Boot. Si on ajoute une propriété sous `app:`, la mettre dans le bloc `app:` **existant**, jamais créer un second `app:` séparé.
- **Beds24 API timeouts** : `connectTimeout(10s)` + `requestTimeout(25s)` configurés dans `Beds24ApiClient` — ne pas modifier sans raison
- **Beds24 API — HttpClient partagé** : `Beds24ApiClient`, `GeminiChatbotService`, `GroqChatbotService`, `QontoService` et `Beds24TokenService` utilisent chacun un `HttpClient` **statique partagé** (`private static final HttpClient HTTP_CLIENT = …`). Ne jamais recréer un `HttpClient` par appel — c'est la cause #1 d'épuisement de ressources sous charge (threads, file descriptors).
- **Beds24 API — quota de crédits** : l'API Beds24 v2 impose un système de "crédits" par fenêtre de temps. Chaque appel `getBookings` / `getCalendar` / `updateCalendar` coûte des crédits. Les erreurs 429 "Credit limit exceeded" sont attrapées par `Beds24ApiClient.send()` et renvoient un message lisible via `Beds24ApiClient.friendlyMessage()`. Toujours éviter les appels redondants : ex. `resolveRoomId()` ne fait UN appel `getCalendar` QUE la première fois par logement (cache mémoire + DB `PropertyConfig.roomId`).
- **Beds24 API — résolution roomId** : `RoomIdResolverService.resolveRoomId(userId, token, propertyId, from, to)` résout `propertyId → roomId` avec cache à deux niveaux : DB (`PropertyConfig.roomId`, persisté dès le 1ᵉʳ lookup) puis mémoire (`Beds24ApiClient.roomIdCache`). Ne jamais appeler `beds24.getCalendar()` manuellement pour retrouver un roomId — utiliser ce service.
- **Hibernate 6 + MySQL / MariaDB — ENUM natif** : Hibernate 6 mappe `@Enumerated(EnumType.STRING)` en type ENUM natif MySQL par défaut. Le `ddl-auto: update` **ne redimensionne jamais** un ENUM existant quand on ajoute une constante Java → erreur d'insertion silencieuse. Toujours forcer `columnDefinition = "VARCHAR(N)"` sur les champs enum susceptibles d'évoluer (voir `LocalEvent.impactLevel`). En cas d'ajout de valeur sur une colonne existante : `ALTER TABLE … MODIFY … VARCHAR(N) NOT NULL;` sur chaque base (dev + Railway prod).
- **Beds24TokenService** : `getValidToken()` ne doit **pas** être `@Transactional` — la méthode fait un appel réseau externe AVANT tout accès DB, donc une transaction ouvrirait une connexion HikariCP qui resterait bloquée jusqu'à 25s pendant l'appel Beds24, épuisant le pool sous charge concurrente.
- **`mat-form-field` dans un flex container** : `mat-form-field` peut utiliser `display: contents` sur son hôte en Angular Material 17 → `width`/`flex` appliqués sur l'hôte ont no effet. Envelopper dans un `<div class="ma-classe">` et mettre `style="width:100%"` sur le `mat-form-field`. Voir `dynamic-pricing.component.ts` `.period-month`.
- **`mat-select` avec contrainte de largeur fixe** : Angular Material MDC ignore toutes les règles CSS de largeur externe sur `mat-form-field`+`mat-select` (résistant aux 6 approches classiques). Solution définitive : remplacer par un `<select>` natif avec `width`, `height`, `border`, `border-radius` CSS standard — obéit immédiatement. Voir `.period-month` dans `dynamic-pricing.component.ts`.
- **`mat-hint` sur mobile** : le texte d'aide peut déborder et chevaucher le composant suivant. Corriger avec `subscriptSizing="dynamic"` sur le `mat-form-field` + `flex-wrap: wrap` sur le conteneur `.form-row`. Voir `settings.component.ts`.
- **Entretien — coûts pour la marge** : `HousekeepingReportService.costSummary()` doit rester **aligné** sur l'onglet Charges frontend (`housekeeperCharges` computed). Règles : `status == DONE` + `housekeeper != null` (prestataire externe, pas `HousekeepingStaff`) + `extraHours > 0` + taux disponible. Ne modifier l'un sans vérifier l'autre.
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
- **Nom du logement dans la note auto-générée** : `draft['propName']` est vide (Beds24 ne l'inclut pas dans la réponse réservation). Le nom est résolu via `BookingService.getPropertyNames()` (cache interne, aucun appel Beds24) dans `generateCleaningNotes()`. Idem dans `housekeeping.component.ts` via `generateNewTaskNotes()`. Ne jamais utiliser `draft['propName']` comme source de vérité pour le nom du logement.

### Factures — Bas de page global
- `AppUser.invoiceFooter` (TEXT) : texte libre affiché en pied de toutes les factures PDF
- Saisi dans **Paramètres → Informations de facturation** (même carte que `companyName`/`siret`/`companyAddress`)
- `PUT /user/profile` avec clé `invoiceFooter` → `invoice-pdf.ts` : `footer` callback pdfmake + marge bas 80 px si renseigné

### Entretien — Envoi mission (WhatsApp / SMS / Email)
- Boutons dans la carte de chaque tâche (`sendMission(task, channel)`)
- Le contenu envoyé est **uniquement `task.notes`** — aucun en-tête généré automatiquement

### Chatbot — Base de connaissance

> **⚠️ RÈGLE : mettre à jour `backend/src/main/resources/chatbot/knowledge-base.md` à chaque fois qu'une nouvelle fonctionnalité est implémentée ou qu'une fonctionnalité existante change de comportement.** Le chatbot répond en se basant sur ce fichier — une base obsolète produit de mauvaises réponses. La mise à jour doit être incluse dans le même commit que la fonctionnalité.

### Chatbot — RAG keyword BM25
- **`RagService`** : indexe au démarrage la KB (sections `##`) + toutes les entrées FAQ en mémoire JVM — **aucun appel API externe**
- À chaque question : tokenise + supprime mots vides (FR+EN) + score overlap pour chaque chunk → retourne top-4 sections KB + top-6 entrées FAQ (~2 000 tokens vs ~9 300 en full-context)
- Si `retrieve()` retourne `null` (KB introuvable) : fallback automatique mode full-context
- `refreshFaq()` : appelé après chaque ajout/modif FAQ pour reindexer sans redémarrer
- **Piège** : `Set.of()` lève `IllegalArgumentException` sur doublons → vérifier qu'aucun mot n'est dupliqué dans `STOP_WORDS`

### Chatbot — Function calling (Gemini + Groq + Cerebras)
- **`ChatbotPromptService`** : construit le `systemInstruction` partagé (contexte RAG ou full-context + date du jour) et charge `chatbot/tool-declarations.json` au démarrage (`@PostConstruct`) — fournit les déclarations Gemini ET OpenAI
- **`GeminiChatbotService`** : fournisseur principal, boucle de function calling max 3 itérations
- **`GroqChatbotService`** : 2ème repli si Gemini indisponible (quota), format OpenAI-compatible
- **`CerebrasChatbotService`** : 3ème repli, API OpenAI-compatible (`https://api.cerebras.ai/v1/chat/completions`), modèle `llama-3.3-70b`
- **Chaîne de fallback** : Gemini → Groq → Cerebras → 503 (dans `AdminChatbotController`)
- **`ChatbotToolService.execute(toolName, args, lang)`** : toujours scopé sur `securityUtils.getCurrentUserId()` — jamais de userId dans les args Gemini
- **Outils lecture seule** : `get_properties`, `get_revenue` (CA + marge Qonto), `get_arrivals`, `get_departures`, `get_ongoing_stays`, `get_reservations` (liste résumée), `search_booking` (détails complets : email, téléphone, enfants, notes…), `get_free_properties` (logements libres/occupés sur une période), `get_expenses_summary`, `get_transactions`, `get_housekeeping_tasks`, `get_housekeeping_costs`, `get_linen_stock`
- **Outils écriture** : `block_dates` / `unblock_dates` (via `Beds24ApiClient.updateCalendar()`) — la description du tool impose une confirmation explicite de l'hôte avant appel
- **`suggest_faq`** : enregistre dans `FaqSuggestion` les questions sans réponse dans la base de connaissance — visibles par le superadmin pour enrichir la FAQ
- **`report_unhandled_action`** : quand le chatbot ne peut pas exécuter une action demandée (ex: envoyer un SMS, modifier un prix), enregistre un `Feedback` avec `category = "chatbot"` — visible dans la page Feedbacks superadmin avec un badge violet / icône `smart_toy`
- Variables d'env : `GEMINI_API_KEY`, `GEMINI_MODEL` (défaut `gemini-2.5-flash`), `GROQ_API_KEY`, `GROQ_MODEL` (défaut `llama-3.3-70b-versatile`), `CEREBRAS_API_KEY`, `CEREBRAS_MODEL` (défaut `llama-3.3-70b`)

### Mode iCal — Export feed + réservations directes + sources multiples
- **`LocalProperty.icalFeedToken`** : UUID opaque auto-généré (`@PrePersist`) — migration `@PostConstruct` dans `AdminLocalPropertyController` pour les lignes avec token null ou vide
- **`GET /public/ical/{token}.ics`** (`PublicIcalController`) : flux iCal public sans auth — l'hôte le colle dans Airbnb/Booking comme "calendrier externe" pour bloquer automatiquement les dates
- **`POST /admin/bookings/direct`** : crée une `IcalBooking` avec `icalUid = "direct-{uuid}"` et `status = "direct"` — exportée dans le flux iCal
- **`DELETE /admin/bookings/direct/{id}`** : supprime uniquement si `icalUid.startsWith("direct-")`
- **`GET /admin/bookings/overlap`** : branche iCal via `IcalBookingRepository` (pas Beds24)
- **`GET /admin/properties`** : inclut `icalFeedToken` dans la réponse pour le mode iCal
- **URL export dans le frontend** : `icalExportUrl(token)` construit une URL absolue — si `environment.apiUrl` est relatif (dev), préfixe `window.location.origin` ; en prod utilise l'URL Railway directement
- **Page Logements** : affiche l'URL export par logement (icône `rss_feed`) + bouton copier
- **Page Réservations** : formulaire de réservation directe + bouton supprimer pour les réservations `direct-*`
- **Sources iCal multiples** : entité `PropertyIcalSource` (`property_ical_sources`) — chaque logement peut avoir N sources (nom + URL + lastSync). CRUD via `AdminIcalSourceController` (`/admin/local-properties/{propId}/ical-sources`). `IcalBooking.sourceId` trace la source d'origine. Migration `@PostConstruct` : l'ancien champ `icalUrl` est converti automatiquement en source nommée "Principal". Suppression d'une source supprime ses `IcalBooking` associées.
- **Sync iCal au login** : `AuthController` déclenche `IcalSyncService.syncUser(userId)` en arrière-plan (`CompletableFuture.runAsync`) à chaque connexion en mode iCal
- **Sync bundles au login** : `PropertyBundleService.syncAllBundlesForUser(userId)` déclenché de même à chaque connexion en mode Beds24 si des bundles actifs existent

### Séparation des entités iCal / Channel Manager

| Entité / Table | Mode | Rôle |
|---|---|---|
| `LocalProperty` (`local_properties`) | iCal uniquement | Logements créés manuellement par l'hôte en mode iCal |
| `PropertyConfig` avec `localPropertyId = null` | Channel (Beds24) | Config Beds24 : shortName, code d'accès, frais ménage… |
| `PropertyConfig` avec `localPropertyId ≠ null` | iCal (pont) | Pendant d'un `LocalProperty` — permet aux modules (entretien, linge, boîte à clé) de fonctionner en mode iCal |

- **`PropertyConfig.localPropertyId`** : `null` = config Beds24 classique ; `non null` = pont iCal (FK → `local_properties.id`)
- **`GET /admin/property-configs`** : retourne uniquement les configs du mode actif (`channelType == ICAL` → `localPropertyId IS NOT NULL`, sinon → `localPropertyId IS NULL`)
- **Migration `@PostConstruct`** dans `AdminLocalPropertyController` : backfill `localPropertyId` sur les configs iCal existantes
- **`GET /admin/stats/revenue`** (mode iCal) : nuits + taux d'occupation depuis `IcalBooking` — sans appel Beds24 ; KPIs CA et Marge masqués dans le frontend

### Revenus — KPIs Qonto
- La page Revenus (`/admin/stats`) charge en parallèle le CA Beds24 ET le summary Qonto du même mois
- **Marge bénéficiaire** (KPI) : `caTotal - totalDebits Qonto` — vert/rouge selon signe
- **Marge par logement** : triée par taux de marge décroissant (% = marge / CA), pas par montant absolu
- `caMonthly()` retourne maintenant `propId` dans chaque entrée `byProperty`
- `fetchSummary()` retourne `byProperty` : map `beds24PropertyId → total débits`
- **Mode iCal** : bannière d'info + seules nuits/occupation affichées (pas de CA ni de marge)

### Prix dynamique — Événements locaux et segmentation

- **`ImpactLevel`** : enum `FAIBLE | MOYEN | FORT | EXCEPTIONNEL`. La colonne DB `local_events.impact_level` est `VARCHAR(20)` (forçé via `columnDefinition` — voir piège Hibernate ENUM ci-dessus).
- **`PricingEventImpactConfig`** (`pricing_event_impact_configs`) : une ligne par hôte, 4 champs `faiblePercent / moyenPercent / fortPercent / exceptionnelPercent` (défauts 20/50/200/400). Géré dans l'onglet **Configuration** du menu Prix dynamique. Endpoints : `GET/PUT /admin/dynamic-pricing/event-impact-config`.
- **Segmentation de l'analyse** : `DynamicPricingService.calculateSuggestion()` découpe la période analysée jour par jour selon les événements locaux qui la couvrent, puis regroupe les jours consécutifs avec le même statut en **segments** (jours normaux / jours événement). Chaque segment a sa propre fourchette de prix (`suggestedMin/Max`), son propre prix actuel et sa propre alerte. Le résultat renvoie `segments: List<Map>` — les anciennes clés top-level `suggestedMin/Max`, `currentPrice`, `alert`, `eventName`, `eventAdjustmentPercent` n'existent plus.
- **Logs de diagnostic** : `DynamicPricingService` émet des logs `INFO` (`[pricing] BEGIN/END/step=history/step=occupancy/step=currentPeriod`) pour mesurer le temps de chaque appel Beds24 et le nombre de réservations récupérées — visible dans les logs Railway sans activer le DEBUG.
- **Mise à jour des prix** : `POST /admin/availability/price` et `/blackout` utilisent `RoomIdResolverService` (pas de `getCalendar()` redondant). La plage `from`/`to` est envoyée en un seul appel `updateCalendar` — jamais jour par jour (référence legacy : `php_code/formulaire_upd_cal.php`).

### PropertyConfig — Champ roomId
- `PropertyConfig.roomId` (colonne `room_id`) : correspondance `beds24PropertyId → roomId` persistée en DB dès le 1ᵉʳ lookup via `RoomIdResolverService`. Évite un appel `getCalendar()` à chaque mise à jour de prix, blocage de dates ou création de réservation. N'est **pas** exposé dans le DTO retourné par `/admin/property-configs` (filtré dans `toDto()`).

### Boîtes à clé — Suppression automatique des orphelines
- Quand un logement est dissocié de sa boîte à clé (`keyBoxId` vide dans `PUT /admin/property-configs/{id}`), si la boîte n'est plus associée à aucun autre logement (`repo.findByKeyBoxId().isEmpty()`), elle est supprimée automatiquement de la base

### Arrivées/Départs — Filtre de prolongation
- **Règle** : si deux réservations partagent le même logement (`propId`), le même prénom ET nom, et que `departure` de l'une = `arrival` de l'autre → c'est une prolongation
- La réservation sortante est **masquée des départs** ; la réservation entrante est **masquée des arrivées**
- Filtrage appliqué côté backend dans `AdminBookingController` ET `HousekeeperPortalController` : `getToday`, `getArrivals`, `getDepartures`
- Pour `getArrivals` et `getDepartures`, un second appel Beds24 (ou requête iCal) est fait pour obtenir la liste croisée nécessaire au filtre
- La liste `ongoing` n'est **pas** filtrée : le nouveau séjour prolongé doit bien apparaître en cours
- Méthodes : `filterProlongations()`, `isProlongation()`, `bookingName()` — comparaison insensible à la casse
- **Chatbot** : `ChatbotToolService.getArrivals()` et `getDepartures()` détectent aussi les prolongements et les retournent dans `prolongements: [{guestName, propertyName, newDeparture}]` — le chatbot formule "Jean Dupont a prolongé son séjour à l'Appart Centre jusqu'au 30 juin"

### Navigation — Modifier réservation directe depuis dashboard/today/arrivées/départs
- Le dialog `BookingDetailDialogComponent` retourne `{ editDirect: true }` via `afterClosed()`
- Les composants `dashboard`, `today`, `arrivals`, `departures` redirigent vers `/admin/bookings` avec `history.state = { editDirectBooking: booking }`
- `BookingsComponent` lit `history.state` dans `ngOnInit()` et ouvre le formulaire d'édition après chargement de la liste

### Stripe Connect — Paiements par hôte

- **Architecture** : chaque hôte connecte son propre compte Stripe via OAuth (bouton dans Paramètres). `AppUser.stripeAccountId` (`acct_xxx`) est persisté en DB.
- **OAuth flow** : `GET /user/stripe-connect/url` → URL Stripe avec `client_id=STRIPE_CLIENT_ID` + `redirect_uri=/admin/stripe-callback` → `POST /user/stripe-connect/callback` échange le code → `OAuth.token()` → sauvegarde `stripeAccountId`
- **Déconnexion** : `DELETE /user/stripe-connect/disconnect` → `OAuth.deauthorize()` + efface `stripeAccountId`
- **Page de paiement public** : `/{slug}/payment` — composant `BookingSitePaymentComponent` — `loadStripe(publishableKey, { stripeAccount: acct_xxx })` + Payment Element monté sur `#payment-element`
- **Création Payment Intent** : `POST /public/{slug}/create-payment-intent` — utilise `RequestOptions.builder().setStripeAccount(user.getStripeAccountId()).build()` — paiement créédirectement sur le compte de l'hôte
- **Variables d'env** : `STRIPE_CLIENT_ID` (`ca_xxx`) + `APP_FRONTEND_URL` (`https://flowlyrent.com`) requis en prod + enregistrer `https://flowlyrent.com/admin/stripe-callback` comme redirect URI dans Stripe Dashboard → Connect
- **Webhook** : `StripeWebhookController` gère `payment_intent.succeeded` (en plus de `checkout.session.completed`) — endpoint : `https://<domaine-backend-railway>/api/webhooks/stripe` (⚠️ pas `flowlyrent.com`, qui pointe vers le frontend Netlify — le backend a `context-path: /api`). Destination Stripe Dashboard configurée sur **"Comptes connectés"** uniquement, événement `payment_intent.succeeded` — cohérent avec le `PaymentIntent` créé via `setStripeAccount()`, qui se déclenche sur le compte de l'hôte, pas sur le compte plateforme.
- **`StripeWebhookController` ne lit qu'un seul `STRIPE_WEBHOOK_SECRET`** : si la facturation SaaS (abonnements Starter/Pro/Agence via `SubscriptionService`) est activée un jour, ses événements (`checkout.session.completed` en mode subscription, `customer.subscription.updated/deleted`, `invoice.payment_failed`) se déclenchent sur le **compte plateforme** (pas de `setStripeAccount`) — donc un endpoint scopé "Comptes connectés" ne les recevra jamais. Il faudrait un second endpoint Stripe scopé "Votre compte" + adapter le contrôleur pour accepter deux secrets. Non fait à ce jour (volontairement, tant que `STRIPE_PRICE_*` n'est pas configuré).
- **`STRIPE_SECRET_KEY` doit être la clé secrète standard, pas une clé restreinte** : une clé `rk_live_...` échoue sur l'échange OAuth (`OAuth.token()`) avec `Unable to authenticate the request; code: invalid_client` — les clés restreintes n'ont pas accès aux endpoints Connect (`/oauth/token`, `/oauth/deauthorize`) sauf permission "Connect" explicitement activée. Utiliser `sk_live_...` standard sur Railway.
- **Erreur `No such API key: sk_test_placeholder`** : survient si `STRIPE_SECRET_KEY` n'est pas correctement lue depuis Railway (variable absente/mal nommée) — le fallback par défaut de `application.yml` (`sk_test_placeholder`) n'est pas une clé Stripe valide.
- **Mismatch Live/Test sur l'OAuth Connect** : l'URI de redirection (`https://flowlyrent.com/admin/stripe-callback`) doit être enregistrée côté Stripe Dashboard → Connect dans le **même mode** (Test ou Live) que `STRIPE_CLIENT_ID`/`STRIPE_SECRET_KEY` utilisés — un code OAuth généré en Live ne peut être échangé qu'avec une clé secrète Live.
- **GitHub Push Protection** : les patterns `sk_live_xxx` / `pk_live_xxx` déclenchent un blocage — ne jamais mettre de vraies clés dans le code, même en placeholder ressemblant à une vraie clé

### Recherche disponibilité — Filtre capacité voyageurs

- `GET /public/{slug}/search?from=&to=&guests=N` filtre les propriétés par `maxPeople >= N`
- **`maxPeople` n'existe pas dans la réponse `/properties`** (contrairement à ce qu'on pensait initialement) — il vient uniquement de `/inventory/rooms`, qui **exige un `propertyId`** (HTTP 500 "Could not process request" si appelé sans filtre, pas d'appel groupé possible pour tous les logements comme `/properties` ou `/bookings`).
- **`PropertyCapacityResolverService.resolveMaxPeople(user, token, propertyIds)`** : résout `maxPeople` avec cache DB (`PropertyConfig.maxPeople`, même pattern que `roomId`/`RoomIdResolverService`) — un appel `getRooms(propertyId=X)` par logement, mais **une seule fois par logement pour toujours** grâce au cache ; les recherches suivantes ne consomment plus aucun crédit Beds24. La ligne `PropertyConfig` est créée automatiquement si elle n'existait pas encore (l'hôte n'a pas forcément configuré ce logement dans `/admin/property-configs`).
- Utilisé à la fois par `GET /{slug}/search` et `GET /{slug}/properties/{propertyId}`
- Si `maxPeople` reste introuvable pour un logement (erreur Beds24, champ absent) : `max=0` → le logement est inclus par défaut (`max == 0 || guests <= max`), jamais exclu par erreur

### Répondeur automatique — Messages voyageurs
- **Webhook** : `POST /webhooks/beds24` reçoit les messages voyageurs Beds24 en temps réel
- **Flux** : message reçu → `AutoResponderService` → Groq (`llama-3.3-70b-versatile`) → réponse postée via `Beds24ApiClient.sendMessage()`
- **Config** : `AutoResponderConfig` par hôte — actif/inactif, prompt personnalisé, secret webhook
- **Logs** : chaque réponse auto est enregistrée dans `AutoResponderLog` (bookingId, question, réponse, modèle)
- **Onglet Tester** : simule une réponse sans envoyer — pour valider le prompt sans impacter les voyageurs

---

## Documentation détaillée

| Fichier | Contenu |
|---------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Structure complète des répertoires, schéma BDD réel (40+ entités), services, contrôleurs, règles métier |
| [`docs/API.md`](docs/API.md) | Tous les endpoints REST + WebSocket |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Objectifs MVP et statut d'avancement |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Variables d'environnement, lancer le projet, déploiement Netlify/Railway |
