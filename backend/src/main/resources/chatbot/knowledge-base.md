# Base de connaissance FlowlyRent

FlowlyRent est une plateforme SaaS de gestion de location saisonnière. Deux modes d'utilisation :

- **Mode Beds24** : l'hôte connecte son compte Beds24 (channel manager) pour centraliser ses
  logements et réservations (Airbnb, Booking.com, Abritel...), gérer des réservations directes,
  et proposer un site de réservation public personnalisé.
- **Mode iCal** : l'hôte sans channel manager crée ses logements manuellement et importe ses
  dates de réservation via un lien iCal (fourni par Airbnb, Booking, etc.). Dans ce mode, les
  réservations directes et la messagerie voyageur ne sont pas disponibles, mais toutes les
  autres fonctionnalités (entretien, tableau de bord, Qonto, calendrier, etc.) sont accessibles.

Lors de la première connexion, l'hôte choisit son mode via l'écran d'onboarding.

## Plans tarifaires

- **FREE** (0€) : 1 logement, synchronisation Beds24, commission de 2% sur les réservations directes.
- **STARTER** (9€/mois) : jusqu'à 3 logements.
- **PRO** (19€/mois) : logements illimités.
- **AGENCE** (49€/mois) : logements illimités + plusieurs utilisateurs (équipe).

Les limites de logements sont appliquées à la création. L'hôte change de plan depuis
**Paramètres → Abonnement**.

## Connexion Beds24

Dans **Paramètres**, l'hôte renseigne son code d'invitation Beds24 pour synchroniser
automatiquement ses logements et réservations. Un bouton permet de relancer une
synchronisation manuelle. Sans connexion Beds24, l'app reste utilisable en mode
réservations directes uniquement (plan FREE limité à 1 logement).

## Mode iCal (sans channel manager)

Pour les hôtes qui n'utilisent pas Beds24, FlowlyRent propose un mode iCal :
- L'hôte crée ses logements manuellement dans la page **Logements**.
- Pour chaque logement, il peut ajouter plusieurs **sources iCal** (une par plateforme : Airbnb, Booking, Abritel…). Chaque source a un nom et une URL iCal. Les sources sont gérées dans la section "Sources iCal" de chaque logement (page Logements).
- FlowlyRent synchronise automatiquement les réservations depuis toutes les sources iCal toutes les 2 heures.
- L'hôte peut déclencher une synchronisation manuelle par source (bouton sync à côté de chaque source).
- L'hôte peut créer des **réservations directes** depuis la page Réservations. Ces réservations sont stockées dans FlowlyRent.
- Chaque logement dispose d'un **lien iCal export** (affiché dans la page Logements) : l'hôte le colle dans Airbnb/Booking comme "calendrier externe" pour bloquer automatiquement les dates sur les plateformes.
- Dans ce mode : pas de messagerie voyageur, pas de site public de réservation (en cours de développement).
- Toutes les autres fonctionnalités restent disponibles : entretien, Qonto, tableau de bord, calendrier.

## Tableau de bord (Dashboard)

Vue d'ensemble : nombre d'arrivées et départs du jour, messages non lus, et aperçu des
arrivées/départs de la semaine à venir avec nom du voyageur et statut de la réservation.
Chaque indicateur renvoie vers la page détaillée correspondante.

## Aujourd'hui

Vue en trois colonnes : départs du jour, arrivées du jour, séjours en cours. Affiche le
nom du voyageur, le logement, le nombre de nuits, le prix, et signale les messages
de bienvenue/départ pas encore envoyés.

## Arrivées / Départs

Listes hebdomadaires (navigation semaine par semaine) des arrivées ou départs à venir :
coordonnées du voyageur, logement, dates, nombre de nuits et de voyageurs, plateforme
d'origine (Direct, Airbnb, Booking, Abritel...), statut, et actions (annuler, envoyer un
message de rappel).

### Prolongements de séjour

Quand un voyageur **prolonge son séjour**, la plateforme crée une deuxième réservation qui enchaîne directement la première (même logement, même voyageur, départ de la 1ʳᵉ = arrivée de la 2ᵉ). Ces prolongements sont détectés automatiquement et **exclus** des listes arrivées/départs normales pour éviter les doublons.

Les outils `get_arrivals` et `get_departures` renvoient un champ optionnel `prolongements` (liste) quand des prolongements sont détectés. Chaque entrée contient : `guestName`, `propertyName`, `newDeparture`.

**Règle de formulation :** quand `prolongements` est présent, le mentionner explicitement. Exemple : "Jean Dupont a prolongé son séjour à l'Appartement Centre jusqu'au 30 juin." Ne jamais dire "aucune arrivée" ou "aucun départ" si le voyageur est simplement en prolongement.

## Logements (Properties)

Page de gestion de chaque logement :
- **Nom court** (shortName) utilisé dans les URLs du site public et dans toute l'app.
- **Code d'accès** : chaque logement peut avoir son propre code d'accès, ou partager une
  **boîte à clef** commune avec d'autres logements. Quand une boîte à clef est liée, son
  code s'applique automatiquement à tous les logements associés — modifier le code de la
  boîte met à jour tous ces logements en même temps.
- **Boîtes à clef (Key boxes)** : un hôte peut créer plusieurs boîtes à clef (ex. "Boîte
  entrée immeuble", "Boîte garage") et y associer un ou plusieurs logements. C'est la
  solution recommandée quand plusieurs logements partagent physiquement le même accès.
  La création, la liaison et la suppression se font depuis l'onglet **Code d'accès** de
  chaque logement. Un code peut être régénéré automatiquement (4 chiffres) ou saisi
  manuellement. L'ancien code reste mémorisé (previousAccessCode) pour faciliter la
  transition.
- **Durée de ménage standard** (en heures), utilisée pour planifier les missions d'entretien.
- **Tarification directe** : frais de ménage, tarif personne supplémentaire, remises
  longue durée (7 nuits, 28 nuits).
- **Inventaire** : articles par catégorie avec quantités (pour le suivi du linge, équipements...).
- **Lots de logements (bundles)** : regroupement de plusieurs logements pour synchroniser
  tarifs/ménage avec un horizon de mise à jour commun.

## Calendrier

Vue mensuelle avec filtre par logement. Les réservations apparaissent sous forme de
barres colorées selon la plateforme (Direct, Airbnb, Booking, Abritel). Permet de créer
ou modifier une réservation, ajouter des périodes bloquées (indisponibilités), et définir
des tarifs spécifiques pour certaines dates (overrides).

### Périodes blackout (indisponibilité)

Un calendrier peut contenir des **périodes blackout** : ce sont des plages de dates
bloquées manuellement par l'hôte (indisponibilités, travaux, usage personnel…).

**Règle de disponibilité :** un logement est considéré **disponible** sur une période
uniquement si son calendrier ne contient **aucun indicateur blackout** sur ces dates
(et aucune réservation chevauchante). Dès qu'un blackout est présent, le logement est
**indisponible** — il n'apparaît pas dans les résultats de recherche du site public
pour ces dates, et le bouton "Vérifier disponibilité" sur sa fiche logement affiche
les dates comme bloquées. La recherche de disponibilité vérifie systématiquement les
blackouts en plus des réservations existantes.

## Réservations (Bookings)

Tableau de toutes les réservations (passées et futures), filtrable et triable : voyageur,
logement, dates, nuits, plateforme, statut, prix total. Recherche, filtres par statut/plateforme,
pagination, et actions (voir, modifier, annuler) par réservation.

## Messagerie

Interface à onglets : réservations issues des plateformes (Airbnb/Booking/...), réservations
directes, et modèles de messages. Permet d'envoyer des messages prédéfinis ou personnalisés
(bienvenue, instructions check-in/check-out) en plusieurs langues (FR/EN), d'éditer les
modèles, et de suivre les rappels envoyés/non envoyés. La messagerie utilise un chat en
temps réel (WebSocket) avec les voyageurs.

## Entretien (Housekeeping)

Module avec deux grandes sections :

1. **Missions** : créer des tâches de ménage, réparation ou inspection pour un logement,
   les assigner à un prestataire (housekeeper), suivre leur statut (À faire / En cours /
   Terminé / Annulé), signaler des incidents avec photos, et consulter les heures
   supplémentaires facturées par les prestataires. Le code d'accès du logement et le
   générateur de code sont affichés directement dans l'onglet Entretien. L'onglet **Charges**
   récapitule mensuellement les frais dus à chaque prestataire (missions terminées avec
   heures supplémentaires facturées) et permet de télécharger un PDF récapitulatif par
   prestataire (détail des missions du mois + total).

2. **Blanchisserie** : gestion du stock de linge par logement (draps, serviettes, taies,
   housses de couette, nappes...) avec quantité totale, quantité par ménage, et seuil
   d'alerte stock bas. Suivi des mouvements (linge envoyé au pressing / linge récupéré)
   et répartition en temps réel entre "au logement" et "au pressing". Les **modèles de
   linge** (kits type T2, T3...) permettent de définir une composition standard et de
   l'appliquer en un clic à plusieurs logements ; ils peuvent aussi être **dupliqués**
   pour créer rapidement une variante.

## Notifications

Boîte de réception en lecture seule des notifications système (synchronisations Beds24,
alertes de transactions, missions assignées, incidents...) avec marquage comme lu et
horodatage. Les notifications peuvent aussi être reçues en push (web + application
mobile Android via FCM).

## Factures (Invoices)

Création et gestion de factures avec lignes détaillées (hébergement, extras, frais de
ménage), calcul des taxes, statut de paiement (Brouillon / Émise / Payée / Annulée), et
export PDF. Une facture peut être pré-remplie à partir d'une réservation existante.

## Dépenses (Expenses)

Nécessite une connexion bancaire **Qonto** (configurée dans Paramètres). La page est
organisée en onglets :

- **Transactions** : liste des transactions bancaires Qonto, filtrables par période,
  catégorie et sens (débit/crédit). Chaque transaction peut être catégorisée et affectée
  à un logement.
- **Règles de catégorie** : règles automatiques d'affectation par mots-clés dans le
  libellé Qonto. Une règle peut être liée à un logement précis ou globale (tous logements).
  En mode iCal, seules les règles sans logement ou liées à des logements iCal s'affichent
  (les règles channel manager ne sont pas visibles).
- **Récapitulatif** : synthèse mensuelle des dépenses par catégorie et par logement, avec
  évolution sur les mois précédents.
- **Charges manuelles** : dépenses hors Qonto (loyer, assurance, taxe foncière…) saisies
  manuellement par mois. Chaque charge peut être récurrente (appliquée chaque mois à partir
  du mois saisi) ou ponctuelle, et peut être affectée à un logement. Le total des charges
  manuelles est déduit de la marge dans la page Revenus.

## Revenus (Stats)

La page Revenus est organisée en deux onglets :

### Onglet Statistiques

Tableau de bord mensuel des indicateurs clés, avec navigation mois par mois :
- **Chiffre d'affaires (CA)** total et par logement, nombre de nuits vendues, taux d'occupation.
- **Marge bénéficiaire** : CA total + revenus manuels − dépenses Qonto catégorisées − frais
  de ménage − commission plateforme − charges manuelles (vert si positif, rouge si négatif).
  Affichée uniquement si Qonto est connecté.
- **Marge par logement** : répartition des dépenses Qonto par logement (via règles de
  catégorisation) pour calculer la marge de chaque bien — affichée uniquement si Qonto est
  connecté.
- **Mode iCal** : seules les nuits vendues et le taux d'occupation sont affichés. Le CA et
  la marge ne sont pas disponibles (les flux iCal ne contiennent pas les prix). Une bannière
  l'explique.

### Onglet Revenus manuels

Permet de saisir des revenus qui ne transitent pas par Beds24 (virements directs, locations
non déclarées sur les plateformes, etc.). Chaque revenu peut être :
- récurrent (appliqué chaque mois à partir du mois saisi) ou ponctuel,
- affecté à un logement précis (pour le calcul de la marge par logement) ou global.

Les revenus manuels s'ajoutent au CA pour le calcul de la marge bénéficiaire. La navigation
mois/année de la page s'applique aux deux onglets.

## Prix dynamique

La page **Prix dynamique** (menu "Prix dynamique") permet à l'hôte d'obtenir des suggestions
de prix pour ses logements en fonction des données historiques et de la saisonnalité.

### Onglet Analyse

L'hôte sélectionne un logement, une date de début et une date de fin, puis clique sur
"Analyser". L'algorithme calcule :

1. **Prix historique moyen** : moyenne des prix réels des séjours passés sur la même période
   (même plage de mois), à partir des réservations Beds24 sur les 24 derniers mois.
2. **Ajustement saisonnier** : si un secteur (zone) est configuré pour ce logement, le prix
   de base est majoré ou minoré selon le pourcentage défini pour la période concernée.
3. **Ajustement taux d'occupation** : si le taux d'occupation des 60 prochains jours est
   élevé (> 80%), le prix est augmenté jusqu'à +15% ; si faible (< 30%), réduit jusqu'à -15%.
4. **Découpage en segments selon les événements locaux** : la période analysée est découpée
   jour par jour selon les événements locaux qui la couvrent (festival, marché, concert…).
   Chaque jour reçoit le pourcentage du niveau d'impact le plus fort qui le couvre — Faible,
   Moyen, Fort, Exceptionnel (pourcentages configurables par l'hôte dans l'onglet Configuration,
   défaut : Faible +20%, Moyen +50%, Fort +200%, Exceptionnel +400%) — ou aucun bonus si le
   jour n'est couvert par aucun événement. Les jours consécutifs ayant le même statut sont
   regroupés en un **segment** ; un même événement de quelques jours au sein d'une période
   plus longue produit ainsi un segment "jours normaux" et un segment "événement" distincts,
   chacun avec sa propre fourchette de prix suggérée.
5. **Cadrage marché** : chaque segment est borné entre le prix minimum et maximum marché
   configurés pour ce logement (optionnel).

Le résultat affiche, **pour chaque segment** : ses dates, l'événement éventuellement appliqué,
le prix actuel moyen sur ces dates (moyenne des réservations existantes qui les recouvrent),
la fourchette suggérée (min/max), et une alerte colorée : **sous-évalué** (orange),
**surévalué** (rouge), **optimal** (vert), ou **données insuffisantes** (gris). Un bouton
"Ajuster le prix" par segment ouvre le formulaire de mise à jour du tarif directement dans
Beds24 via l'API, pré-rempli avec les dates de ce segment.

### Onglet Zones & Saisons

L'hôte définit des **secteurs** (zones géographiques ou groupes de logements) avec des
périodes saisonnières. Chaque période a un nom, des dates de début et fin (jour/mois),
et un pourcentage d'ajustement (positif = haute saison, négatif = basse saison). Les
périodes peuvent chevaucher deux années (ex. décembre–janvier).

L'hôte peut également saisir des **événements locaux** (festivals, marchés, concerts,
salons, événements sportifs…) dans ce même onglet. Chaque événement a :
- un **nom**, des **dates de début et fin**,
- un **niveau d'impact** : Faible, Moyen, Fort ou Exceptionnel (pourcentages configurables, voir ci-dessous),
- une option **récurrent** : si activée, l'événement est comparé par mois/jour uniquement
  (sans tenir compte de l'année), ce qui permet de le déclarer une seule fois pour qu'il
  s'applique chaque année automatiquement (ex. festival annuel en juillet),
- un **secteur** optionnel : si renseigné, l'événement ne s'applique qu'aux logements de
  ce secteur ; sinon il s'applique à tous les logements de l'hôte.

Les événements locaux sont pris en compte automatiquement dans le calcul de prix (étape 4).

### Onglet Configuration

En haut de l'onglet, l'hôte définit le **pourcentage d'impact des événements locaux**
appliqué selon le niveau (Faible, Moyen, Fort, Exceptionnel) — valeurs par défaut
20% / 50% / 200% / 400%, modifiables à tout moment et utilisées immédiatement dans le
calcul de prix (étape 4).

Plus bas, l'onglet associe chaque logement à un secteur et permet de saisir manuellement
le prix minimum et maximum du marché local (concurrence). Ces valeurs cadrent la fourchette
suggérée.

## Avis (Feedback)

Formulaire permettant à l'hôte de signaler un bug, suggérer une amélioration ou demander
une fonctionnalité. Les retours sont catégorisés (bug / amélioration / suggestion / autre)
et envoyés à l'équipe FlowlyRent.

## FAQ et assistant IA

Page de FAQ avec recherche, et un **assistant IA** (propulsé par Gemini) qui répond aux
questions des hôtes sur l'utilisation de FlowlyRent en s'appuyant sur cette base de
connaissance et sur les questions/réponses de la FAQ.

L'assistant dispose d'outils pour consulter les données réelles de l'hôte en temps réel :
revenus, réservations, arrivées/départs, séjours en cours, dépenses Qonto, tâches de
ménage, performance des prestataires, stock de linge. L'outil **`search_booking`** permet de rechercher des informations
détaillées sur une réservation spécifique : email, téléphone, nombre d'adultes/enfants,
notes, frais de ménage, ID Beds24, adresse du voyageur. L'outil **`get_free_properties`**
identifie quels logements sont libres (non occupés) et lesquels sont occupés sur une
période donnée, en tenant compte des séjours déjà en cours au moment du début de la
période et des périodes blackout (indisponibilités posées manuellement par l'hôte). Un
logement avec un blackout actif sur la période est retourné dans `occupiedProperties`,
jamais dans `freeProperties`. Quand l'hôte demande une action que le chatbot ne peut pas effectuer (envoyer
un SMS, modifier un prix, etc.), l'outil **`report_unhandled_action`** enregistre la
demande pour que l'équipe FlowlyRent puisse en tenir compte.

## Paramètres (Settings)

- **Beds24** : code d'invitation, configuration du webhook, synchronisation manuelle.
- **Qonto** : connexion du compte bancaire pour le suivi des dépenses et la marge.
- **Stripe** : connexion du compte Stripe de l'hôte via OAuth (bouton "Connecter mon compte Stripe"). Une fois connecté, les paiements en ligne des voyageurs (site public) sont encaissés directement sur le compte Stripe de l'hôte. Le compte peut être déconnecté depuis les mêmes paramètres.
- **Stratégie de séjour minimum** : règles de nuitées minimum selon la proximité de la
  date (ex. 2 nuits à court terme, 1 nuit à long terme).
- **Langues** : interface disponible en français, anglais, espagnol, allemand, italien.
- **Site de réservation public** : configuration du sous-domaine/slug et des métadonnées SEO.
- **Abonnement** : changement de plan tarifaire (FREE/STARTER/PRO/AGENCE).

## Site de réservation public

Chaque hôte dispose d'une page publique personnalisée (`votre-nom.flowlyrent.com/nom-court-du-logement`)
où les voyageurs peuvent voir les photos, équipements, avis, disponibilités en calendrier,
et réserver directement (réservation directe, hors plateformes type Airbnb).

La **recherche de disponibilité** sur la page d'accueil du site public filtre automatiquement
les logements selon leur capacité maximale : seuls les logements pouvant accueillir le nombre
de voyageurs demandé apparaissent dans les résultats.

### Codes promo

Dans **Logements → Paramètres du logement**, section "Codes promo", l'hôte peut créer un ou
plusieurs codes de réduction pour un logement précis (ex. `REDUC10` = 10% de réduction). Chaque
code est propre à un seul logement, avec un pourcentage de remise (1 à 100%) et peut être
activé/désactivé sans être supprimé. Le nombre d'utilisations est affiché à côté de chaque code.

Sur le site public, le voyageur saisit le code dans un champ dédié lors de la réservation (après
avoir choisi ses dates) et clique sur "Appliquer" : la réduction s'applique immédiatement sur le
prix des nuits (après les éventuelles réductions long séjour déjà configurées) et un message
confirme si le code est valide ou non.

Après confirmation de la réservation, le voyageur peut **payer en ligne** via une page de
paiement Stripe intégrée (`/{slug}/payment`) : carte bancaire, Apple Pay, Google Pay ou
virement SEPA sont acceptés. Le paiement est sécurisé et traité directement sur le compte
Stripe de l'hôte (via Stripe Connect).

### Envoyer un lien de paiement ou de caution depuis une réservation

Dans le **dialog d'une réservation** (onglet Détails), section "Demande de paiement",
l'hôte saisit un montant puis choisit l'un des deux boutons :

- **Paiement** : encaissement immédiat. Le voyageur paie et l'hôte reçoit l'argent
  directement sur son compte Stripe, sans action supplémentaire.
- **Caution** : le montant est **bloqué sur la carte du voyageur sans être débité**
  (pré-autorisation). Rien n'est prélevé tant que l'hôte n'a pas capturé le paiement.

Cliquer sur un des deux boutons génère un **lien court** (`flowlyrent.com/pay/xxxxx`) à
copier ou envoyer directement au voyageur par email, SMS ou WhatsApp.

### Comment capturer (débiter) ou annuler (libérer) une caution

Une fois la caution autorisée par le voyageur, l'hôte doit se rendre **directement dans
son propre Dashboard Stripe** (stripe.com → Paiements) — FlowlyRent n'a pas de bouton
dédié pour ça, c'est une action à faire côté Stripe :

1. Se connecter sur [dashboard.stripe.com](https://dashboard.stripe.com) avec le compte
   Stripe connecté à FlowlyRent
2. Aller dans **Paiements**, retrouver le paiement du voyageur concerné (montant, date,
   statut "Non capturé" / "Uncaptured")
3. Ouvrir le paiement :
   - Pour **débiter la caution** (ex. dégâts constatés) → bouton **"Capturer le paiement"**
   - Pour **libérer la caution sans rien débiter** (fin de séjour sans problème) → bouton
     **"Annuler le paiement"**

⚠️ **Important** : si l'hôte ne capture ni n'annule la caution, **Stripe l'annule
automatiquement au bout d'environ 7 jours** (règle des réseaux de cartes bancaires) — les
fonds sont alors libérés au voyageur sans intervention. Si l'hôte doit capturer la caution
après ce délai, il doit générer un **nouveau lien** de caution.

## Conciergerie — Page publique pour attirer des propriétaires

Pour les hôtes qui exercent aussi une activité de **conciergerie** (gestion de biens pour le
compte d'autres propriétaires), le menu **Conciergerie** permet de configurer une page publique
marketing à l'adresse `flowlyrent.com/{votre-slug}/conciergerie` (même identifiant que le site de
réservation voyageurs, configuré dans Paramètres). Cette page est **désactivée par défaut** — il
faut l'activer dans l'onglet **Contenu** du menu Conciergerie.

L'onglet Contenu permet de renseigner : une image et un titre d'en-tête, un texte de présentation,
la liste des services proposés, des chiffres clés (ex. "120+ logements gérés"), les étapes du
parcours ("comment ça marche"), une description de la tarification/commission, des témoignages, et
un numéro WhatsApp de contact.

Quand un propriétaire intéressé remplit le formulaire de contact sur la page publique, une
**demande** est créée et visible dans l'onglet **Demandes** du menu Conciergerie — l'hôte reçoit
aussi une notification push et une notification in-app. Chaque demande peut être marquée
"Contacté" ou "Clôturée".

## Portail Prestataire (rôle HOUSEKEEPER)

Interface simplifiée, pensée mobile, pour les prestataires de ménage : onglet **Missions**
(tâches assignées groupées par date, démarrage/clôture, ajout de notes, photos d'incident,
déclaration d'heures supplémentaires) et onglet **Signalements** (suivi des incidents
déclarés et échanges avec l'hôte).

## Session et connexion persistante

Le token de session (JWT, durée 365 jours) est conservé dans le navigateur. Dès le
prochain démarrage de l'application (web ou Android), l'utilisateur est automatiquement
redirigé vers son tableau de bord sans avoir à saisir à nouveau ses identifiants — aussi
bien pour les propriétaires/hôtes que pour les prestataires. La déconnexion explicite
(bouton "Déconnexion") efface la session et réaffiche l'écran de connexion.

## Application mobile

FlowlyRent dispose d'une application Android (WebView vers flowlyrent.com) avec
notifications push (web push + Firebase Cloud Messaging). La session persistante s'applique
également sur mobile : après la première connexion, l'application s'ouvre directement sur
le tableau de bord.

## Assistant IA de rédaction de message

Dans le dialog d'une réservation, onglet **Messages**, un bouton IA (icône étincelles violette)
se trouve à côté du champ de saisie de réponse : s'il y a déjà du texte saisi, l'IA le corrige
et l'améliore (orthographe, ton, clarté) sans changer la langue ni le sens ; si le champ est
vide, l'IA propose directement une réponse basée sur l'historique de la conversation. Le texte
généré remplace le brouillon mais n'est **jamais envoyé automatiquement** — l'hôte reste
toujours libre de le modifier avant de l'envoyer.

## Répondeur automatique de messages voyageurs

La page **Répondeur automatique** (menu "Répondeur auto") permet à l'hôte de configurer
une réponse automatique aux messages entrants des voyageurs Beds24.

### Fonctionnement
- Les messages voyageurs sont reçus via un webhook Beds24 configuré à l'adresse
  `https://flowlyrent-production.up.railway.app/api/webhooks/beds24/{userId}`.
- Chaque message est classifié :
  - **SIMPLE** : le répondeur génère une réponse via l'IA (Groq/Llama) en tenant compte
    du contexte du séjour (dates, code d'accès, FAQ, historique des messages), puis l'envoie
    automatiquement via Beds24. L'IA répond toujours dans la langue du voyageur.
  - **SENSIBLE** : si le message contient un mot-clé sensible (urgence, fuite, remboursement,
    annulation, incident, dangereux, blessé, police…), un message transitoire est envoyé au
    voyageur pour patienter, et l'hôte reçoit une **notification push immédiate** ainsi qu'une
    notification in-app lui demandant de répondre manuellement.

### Configuration (onglet Configuration)
- **Activation** : on/off global.
- **Message transitoire** : texte envoyé au voyageur pour les cas sensibles.
- **Mots-clés sensibles** : liste personnalisable séparée par des virgules (si vide, liste
  par défaut intégrée). Les mots-clés par défaut incluent des termes en français et en anglais.
- **Instructions IA** : instructions supplémentaires injectées dans le prompt (ton, style,
  informations spécifiques à ne pas oublier, restrictions). Ces instructions s'appliquent à
  tous les logements de l'hôte.

### Base de connaissance par logement
- Dans **Logements → Paramètres du logement**, chaque logement dispose d'un champ texte libre
  « Base de connaissance du logement » (wifi, électroménager, parking, règles de la maison,
  recommandations locales…).
- Ce contenu est injecté dans le prompt IA en plus de la FAQ générale, uniquement pour les
  messages concernant ce logement précis — il complète les instructions IA globales de
  l'hôte sans les remplacer.
- Également utilisé par l'assistant de rédaction manuel (bouton IA dans l'onglet Messages
  du détail d'une réservation), pour rester cohérent avec les réponses automatiques.

### Journal (onglet Journal)
- Historique de tous les messages traités : date, réservation, classification (SIMPLE/SENSIBLE),
  extrait du message voyageur, indicateur si une réponse a été envoyée.

### Précautions
- Le répondeur ne prend jamais d'engagement financier (le prompt IA l'interdit explicitement).
- En cas de quota dépassé sur l'API Groq, la génération échoue silencieusement (sans envoyer
  de réponse erronée).
- Disponible uniquement en mode Beds24 (messagerie directe non disponible en mode iCal).
