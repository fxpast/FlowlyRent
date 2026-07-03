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
- **Entretien — PDF des frais de ménage par prestataire** : `housekeeping-charges-pdf.ts` (même pattern `pdfmake` que `invoice-pdf.ts` — import dynamique, `docDef` avec header/table/totaux/styles). Bouton `picture_as_pdf` sur chaque carte prestataire dans l'onglet Charges (`downloadChargesPdf(entry)`) — génère le relevé pour le mois affiché (détail des missions `DONE` + total), 100% client-side à partir de `housekeeperCharges()` déjà chargé, aucun appel backend supplémentaire. Utilise `UserService.getProfile()` pour l'en-tête (nom société, adresse, `invoiceFooter`), comme les factures.
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

### Import photos — Scraper Beds24 (`Beds24ScraperService`)
- Scrape `https://beds24.com/booking.php?propid={id}` en HTTP statique (Jsoup, pas d'exécution JS) — fonctionne car **toutes** les photos sont déjà présentes dans le HTML brut, y compris celles du carousel
- **Piège** : le carousel Bootstrap de Beds24 (`bootstrap-carousel-img`) n'utilise `src` classique que pour les 2 premières diapositives — toutes les suivantes utilisent l'attribut **`data-lazy-load-src`**, absent de `LAZY_ATTRS` avant correctif → seules 2 photos étaient trouvées au lieu de la galerie complète. Toujours vérifier le HTML brut (`curl` + `grep`) avant de conclure qu'un scraping incomplet vient du JS côté client — souvent c'est juste un attribut lazy-load non couvert.

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
- **Lien "Paiement" vs "Caution" (dialog réservation, onglet Détails)** : `generatePayLink()` dans `BookingDetailDialogComponent` — les deux passent par Stripe Connect FlowlyRent, plus aucune dépendance à Beds24 (`bookpay.php`, ancien flow legacy). Différence uniquement dans `captureMethod` :
  - `captureMethod=automatic` (bouton "Paiement") : débit immédiat, comportement standard
  - `captureMethod=manual` (bouton "Caution") : `PaymentIntentCreateParams.CaptureMethod.MANUAL` côté backend — bloque les fonds sur la carte du voyageur **sans débiter**. L'hôte capture (débite) ou annule (libère) ensuite **directement depuis son propre Dashboard Stripe** (Paiements) — FlowlyRent n'a aucune UI de capture/libération, c'est un choix volontaire pour ne pas dupliquer une fonctionnalité déjà native à Stripe
  - ⚠️ Stripe annule automatiquement une autorisation `manual` non capturée après ~7 jours (règle réseaux de cartes) — à rappeler à l'hôte s'il doit capturer une caution après un délai important
  - `BookingSitePaymentComponent` lit `captureMethod` via `history.state`/query param (`isDeposit` getter) pour adapter le texte affiché au voyageur (`payment.title_deposit`, `payment.deposit_notice`, etc.) — le PaymentIntent lui-même reste géré normalement par `create-payment-intent`, qui transmet `captureMethod` au builder Stripe
- **Liens de paiement courts** : `generatePayLink()` n'encode plus les infos dans l'URL (trop long pour SMS/WhatsApp) — `POST /admin/payment-links` persiste la réservation (bookingId, montant, dates, `captureMethod`…) dans `PaymentLink` (`payment_links`, token 12 caractères via `@PrePersist`, même pattern que `LocalProperty.icalFeedToken`) et retourne `{ token }`. Le lien envoyé est `/pay/{token}` (≈15 caractères vs ~200 avant).
- **`GET /public/payment-links/{token}`** (`PublicBookingController`) résout le token en un payload complet incluant `slug` (via `PaymentLink.user.publicSiteSlug`) — consommé par `PayShortLinkComponent` (`/pay/:token`) qui `router.navigate(['/', slug, 'payment'], { state: {...} })` vers `BookingSitePaymentComponent`. Navigation Angular in-app (pas de redirection HTTP), donc `history.state` est bien préservé — contrairement à un lien externe classique.
- Routes `/paiement/:token` et `/caution/:token` (`PaymentRedirectComponent`, redirect vers Beds24) conservées uniquement pour compatibilité avec d'éventuels liens déjà envoyés avant l'introduction de Stripe Connect — plus aucun nouveau lien ne les utilise
- **Variables d'env** : `STRIPE_CLIENT_ID` (`ca_xxx`) + `APP_FRONTEND_URL` (`https://flowlyrent.com`) requis en prod + enregistrer `https://flowlyrent.com/admin/stripe-callback` comme redirect URI dans Stripe Dashboard → Connect
- **Webhook** : `StripeWebhookController` gère `payment_intent.succeeded` (en plus de `checkout.session.completed`) — endpoint : `https://<domaine-backend-railway>/api/webhooks/stripe` (⚠️ pas `flowlyrent.com`, qui pointe vers le frontend Netlify — le backend a `context-path: /api`). Destination Stripe Dashboard configurée sur **"Comptes connectés"** uniquement, événement `payment_intent.succeeded` — cohérent avec le `PaymentIntent` créé via `setStripeAccount()`, qui se déclenche sur le compte de l'hôte, pas sur le compte plateforme.
- **`StripeWebhookController` ne lit qu'un seul `STRIPE_WEBHOOK_SECRET`** : si la facturation SaaS (abonnements Starter/Pro/Agence via `SubscriptionService`) est activée un jour, ses événements (`checkout.session.completed` en mode subscription, `customer.subscription.updated/deleted`, `invoice.payment_failed`) se déclenchent sur le **compte plateforme** (pas de `setStripeAccount`) — donc un endpoint scopé "Comptes connectés" ne les recevra jamais. Il faudrait un second endpoint Stripe scopé "Votre compte" + adapter le contrôleur pour accepter deux secrets. Non fait à ce jour (volontairement, tant que `STRIPE_PRICE_*` n'est pas configuré).
- **`STRIPE_SECRET_KEY` doit être la clé secrète standard, pas une clé restreinte** : une clé `rk_live_...` échoue sur l'échange OAuth (`OAuth.token()`) avec `Unable to authenticate the request; code: invalid_client` — les clés restreintes n'ont pas accès aux endpoints Connect (`/oauth/token`, `/oauth/deauthorize`) sauf permission "Connect" explicitement activée. Utiliser `sk_live_...` standard sur Railway.
- **Erreur `No such API key: sk_test_placeholder`** : survient si `STRIPE_SECRET_KEY` n'est pas correctement lue depuis Railway (variable absente/mal nommée) — le fallback par défaut de `application.yml` (`sk_test_placeholder`) n'est pas une clé Stripe valide.
- **Mismatch Live/Test sur l'OAuth Connect** : l'URI de redirection (`https://flowlyrent.com/admin/stripe-callback`) doit être enregistrée côté Stripe Dashboard → Connect dans le **même mode** (Test ou Live) que `STRIPE_CLIENT_ID`/`STRIPE_SECRET_KEY` utilisés — un code OAuth généré en Live ne peut être échangé qu'avec une clé secrète Live.
- **GitHub Push Protection** : les patterns `sk_live_xxx` / `pk_live_xxx` déclenchent un blocage — ne jamais mettre de vraies clés dans le code, même en placeholder ressemblant à une vraie clé

### Recherche disponibilité — Filtre capacité voyageurs

- `GET /public/{slug}/search?from=&to=&guests=N` filtre les propriétés par `maxPeople >= N`
- **`maxPeople` n'existe ni à la racine de `/properties`, ni via `/inventory/rooms`** (cet endpoint exige des paramètres de contexte calendrier et répond HTTP 500 "Could not process request" en filtrage libre — confirmé par test d'extraction en local). La bonne source : `GET /properties?includeAllRooms=true` embarque un tableau `roomTypes[]` par logement, chaque élément ayant un champ `maxPeople` (string ou number selon le logement) — **un seul appel groupé**, comme `/properties` classique.
- **`PropertyCapacityResolverService.resolveMaxPeople(user, propsWithRoomTypes, extractPropertyId)`** : parse `roomTypes[].maxPeople` (max si plusieurs types de chambre) depuis la réponse déjà chargée — aucun appel Beds24 supplémentaire. Résultat mis en cache dans `PropertyConfig.maxPeople` (même pattern que `roomId`/`RoomIdResolverService`), avec création automatique de la ligne `PropertyConfig` si elle n'existait pas (l'hôte n'a pas forcément configuré ce logement dans `/admin/property-configs`).
- Utilisé à la fois par `GET /{slug}/search` et `GET /{slug}/properties/{propertyId}` — les deux appellent `beds24.getProperties(token, Map.of("includeAllRooms", "true"))` au lieu de `Map.of()`
- Si `maxPeople` reste introuvable pour un logement (champ absent du logement Beds24) : `max=0` → le logement est inclus par défaut (`max == 0 || guests <= max`), jamais exclu par erreur
- **Filtre blackouts** : `searchAvailability()` excluait initialement un logement uniquement en cas de réservation chevauchant `[from, to]`, sans vérifier les dates bloquées manuellement par l'hôte (`override=blackout` dans `/inventory/rooms/calendar`) — un logement blacked-out pouvait donc apparaître comme disponible en recherche alors que la fiche logement (`GET /{slug}/properties/{propertyId}/blocked-dates`, utilisée par le bouton "Vérifier disponibilité") l'aurait affiché comme bloqué. Corrigé : un appel groupé `beds24.getCalendar(token, {startDate, endDate, includeOverride:1})` **sans filtre `propertyId`** (comme `RoomIdResolverService.resolveRoomId`) vérifie les blackouts pour tous les logements en une fois, même logique de chevauchement que `getBlockedDates`.

### Codes promo par logement (site de réservation public)

- **`PromoCode`** (table `promo_codes`, unique par `(user_id, beds24_property_id, code)` — **pas** `(user_id, code)` seul, sinon impossible de réutiliser le même code sur deux logements différents) : `beds24PropertyId`, `code`, `discountPercent` (1-100), `active`, `usageCount`. Géré dans **Logements → Paramètres du logement** (section "Codes promo" sous la Tarification directe, `properties.component.ts`) — CRUD via `AdminPromoCodeController` (`GET/POST /admin/promo-codes`, `PUT/DELETE /admin/promo-codes/{id}`).
- **Piège changement de contrainte unique + `ddl-auto: update`** : Hibernate ne supprime jamais une contrainte unique existante en base, même si l'entité change — il faut la retirer manuellement (`ALTER TABLE ... DROP INDEX`) sur chaque base (dev + Railway prod). De plus, si la colonne fait partie d'une FK (ex. `user_id`), MySQL refuse de dropper l'index avec `ER_DROP_INDEX_FK` tant qu'aucun autre index ne couvre cette FK — créer d'abord un index dédié sur la colonne FK seule avant de supprimer l'ancienne contrainte composite.
- **Application côté site public** : `GET /{slug}/properties/{propertyId}/estimate?promoCode=XXX` — la remise s'applique sur `nightsPrice` **après** les réductions long séjour (`discount7Nights`/`discount28Nights`), multiplicatif (pas cumulé en addition de pourcentages). Réponse enrichie de `promoCodeValid` (true/false/absent) et `promoCodeDiscountPercent`.
- **`booking-site-property.component.ts`** : champ code promo + bouton "Appliquer" qui rappelle `checkAvailability()` (donc `getEstimate`) avec le code — pas d'endpoint de validation séparé. Le code appliqué est transmis dans le payload de `POST /{slug}/bookings` (`promoCode`), retiré avant l'envoi à Beds24 (Beds24 ne connaît pas ce champ) ; `PromoCode.usageCount` est incrémenté après création réussie de la réservation.
- ⚠️ **Comme les réductions long séjour existantes, le prix final n'est pas revérifié côté serveur à la création de la réservation** — le backend fait confiance à `totalPrice` envoyé par le frontend (limite préexistante, pas spécifique aux codes promo).

### Répondeur automatique — Messages voyageurs
- **Webhook** : `POST /webhooks/beds24` reçoit les messages voyageurs Beds24 en temps réel
- **Flux** : message reçu → `AutoResponderService` → Groq (`llama-3.3-70b-versatile`) → réponse postée via `Beds24ApiClient.sendMessage()`
- **Config** : `AutoResponderConfig` par hôte — actif/inactif, prompt personnalisé, secret webhook
- **Logs** : chaque réponse auto est enregistrée dans `AutoResponderLog` (bookingId, question, réponse, modèle)
- **Onglet Tester** : simule une réponse sans envoyer — pour valider le prompt sans impacter les voyageurs

### Assistant IA — Rédaction de message (dialog réservation, onglet Messages)
- **`MessageAssistService.assist(userId, bookingId, propertyId, draft, bookingContext)`** : réutilise Groq comme `AutoResponderService` (même clé, single-shot sans function calling), mais prompt différent — pas d'auto-envoi, l'hôte reste maître du texte final
- **Réutilise les paramètres du répondeur automatique** : `AutoResponderConfig.systemPromptExtra` (instructions personnalisées de l'hôte), `PropertyConfig.shortName`/`accessCode` du logement, et les 8 premières entrées FAQ — même contexte que `AutoResponderService.generateReply()`, pour rester cohérent entre les réponses auto et l'assistance manuelle
- Bouton `auto_awesome` (violet) dans la barre de saisie du chat, à côté du bouton copier : si le champ contient du texte → corrige/améliore (orthographe, ton, clarté, langue préservée) ; si le champ est vide → suggère une réponse basée sur l'historique de conversation (`MessageService.getMessages()`)
- **`POST /admin/messages/{bookingId}/ai-assist`** : body `{ draft, propertyId, bookingContext }` — `bookingContext` (voyageur, arrivée/départ, adultes/enfants) construit côté frontend depuis `this.draft` du dialog, pas de nouvel appel Beds24 pour l'obtenir. Retourne `{ text }` — le texte remplace directement `newMessage`, jamais envoyé automatiquement

### Conciergerie — Page publique B2B pour attirer des propriétaires

- **But** : distincte du site de réservation voyageurs — cible les **propriétaires** qui cherchent à confier la gestion de leur bien à un hôte FlowlyRent exerçant une activité de conciergerie
- **`ConciergeConfig`** (1 ligne/hôte, `concierge_configs`, pattern `PricingEventImpactConfig`) : `enabled`, hero (titre/sous-titre/image Cloudinary), `pitch`, et 4 listes stockées en JSON (`servicesJson`, `statsJson`, `stepsJson`, `testimonialsJson` — pattern `PropertyConfig.photoUrlsJson`, pas de table enfant), `pricingText` libre, `contactWhatsapp`, `ctaButtonText`
- **`ConciergeLead`** (`concierge_leads`) : une ligne par soumission du formulaire de contact public (nom, email, tél, ville du bien, message, statut NEW/CONTACTED/CLOSED)
- **Admin** (`AdminConciergeController`, menu "Conciergerie", `frontend/src/app/admin/concierge/`) : onglet Contenu (CRUD complet du `ConciergeConfig`, upload image hero via `CloudinaryService.uploadBase64`) + onglet Demandes (liste des `ConciergeLead`, changement de statut). Badge de compteur de demandes non traitées dans le menu (`admin-layout.component.ts`), même pattern que les badges messages/notifications
- **Public** (`PublicConciergeController`, sans auth, **même `publicSiteSlug`** que le site voyageurs) :
  - `GET /public/{slug}/concierge/info?lang=` → 404 si config absente ou `enabled=false`
  - `POST /public/{slug}/concierge/leads` → crée le lead + notifie l'hôte (push `WebPushService.sendToUser` + `AdminNotification`, même pattern exact que `AutoResponderService.notifyHost()`)
- **Page publique** : `/{slug}/conciergerie` (`frontend/src/app/concierge-site/`, dossier séparé de `booking-site/`) — design "publicité" distinct (palette navy `#0f1b2d` + accent doré `#c9a24b`), sections Hero → Pitch → Services → Stats → Comment ça marche → Tarification → Témoignages (masqué si vide) → Formulaire de contact → Footer
- **Traduction automatique du contenu paramétré** (`ConciergeTranslationService`) : contrairement aux libellés d'interface (i18n statique), le contenu saisi par l'hôte (hero, pitch, services, stats, étapes, tarification, témoignages) est traduit automatiquement via MyMemory — **même service et même principe async que `FaqTranslationService`**, mais sur un bundle de contenu plus riche. Déclenché après chaque `PUT /admin/concierge/config` touchant un champ traduisible, stocké dans `ConciergeConfig.translationsJson` (`{"en": {...}, "es": {...}, "de": {...}, "it": {...}}`, un objet par langue reprenant la même structure que le contenu français). `PublicConciergeController.resolveContent()` sert la traduction demandée (`?lang=`) avec repli sur le français **champ par champ** si une traduction est absente/vide (ex. traduction pas encore terminée juste après sauvegarde). Le sélecteur de langue du site public (`switchLang()`) redemande `/concierge/info` avec la nouvelle langue — ce n'est pas une traduction côté navigateur.
- **Champs jamais traduits** : `icon` (nom Material), `number` (chiffre brut), `authorName` (nom propre) — seuls les champs texte (`title`, `description`, `label`, `text`) passent par MyMemory.
- **Lien depuis le site de réservation voyageurs** : `booking-site-home.component.ts` appelle `GET /public/{slug}/concierge/info` au chargement — si la réponse n'est pas 404 (donc `enabled=true`), un lien "Vous êtes propriétaire ? Découvrez nos services de conciergerie" apparaît dans le footer de la page d'accueil du site public, vers `/{slug}/conciergerie`. Aucun nouvel endpoint : réutilise directement `ConciergeSiteService` déjà existant.

---

## Documentation détaillée

| Fichier | Contenu |
|---------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Structure complète des répertoires, schéma BDD réel (40+ entités), services, contrôleurs, règles métier |
| [`docs/API.md`](docs/API.md) | Tous les endpoints REST + WebSocket |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Objectifs MVP et statut d'avancement |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Variables d'environnement, lancer le projet, déploiement Netlify/Railway |
