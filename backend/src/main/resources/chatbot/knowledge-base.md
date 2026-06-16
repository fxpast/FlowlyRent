# Base de connaissance FlowlyRent

FlowlyRent est une plateforme SaaS de gestion de location saisonnière. Chaque hôte connecte
son compte Beds24 (channel manager) pour centraliser ses logements et réservations
(Airbnb, Booking.com, Abritel...), gérer des réservations directes, et proposer un site
de réservation public personnalisé.

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
   générateur de code sont affichés directement dans l'onglet Entretien.

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

Nécessite une connexion bancaire **Qonto** (configurée dans Paramètres). Permet de
catégoriser les transactions bancaires par type, logement et période, de saisir
manuellement des dépenses hors banque (main d'œuvre, fournitures), et de visualiser
la répartition des dépenses par catégorie et par logement.

## Revenus (Stats)

Tableau de bord mensuel des indicateurs clés :
- **Chiffre d'affaires (CA)** total et par logement, nombre de nuits vendues, taux d'occupation.
- **Marge bénéficiaire** : CA total moins le total des débits Qonto du mois (vert si
  positif, rouge si négatif).
- **Marge par logement** : répartition des dépenses Qonto par logement (via les règles
  de catégorisation) pour calculer la marge de chaque bien — affichée uniquement si
  Qonto est connecté.

## Avis (Feedback)

Formulaire permettant à l'hôte de signaler un bug, suggérer une amélioration ou demander
une fonctionnalité. Les retours sont catégorisés (bug / amélioration / suggestion / autre)
et envoyés à l'équipe FlowlyRent.

## FAQ et assistant IA

Page de FAQ avec recherche, et un **assistant IA** (propulsé par Gemini) qui répond aux
questions des hôtes sur l'utilisation de FlowlyRent en s'appuyant sur cette base de
connaissance et sur les questions/réponses de la FAQ.

## Paramètres (Settings)

- **Beds24** : code d'invitation, configuration du webhook, synchronisation manuelle.
- **Qonto** : connexion du compte bancaire pour le suivi des dépenses et la marge.
- **Stratégie de séjour minimum** : règles de nuitées minimum selon la proximité de la
  date (ex. 2 nuits à court terme, 1 nuit à long terme).
- **Langues** : interface disponible en français, anglais, espagnol, allemand, italien.
- **Site de réservation public** : configuration du sous-domaine/slug et des métadonnées SEO.
- **Abonnement** : changement de plan tarifaire (FREE/STARTER/PRO/AGENCE).

## Site de réservation public

Chaque hôte dispose d'une page publique personnalisée (`votre-nom.flowlyrent.com/nom-court-du-logement`)
où les voyageurs peuvent voir les photos, équipements, avis, disponibilités en calendrier,
et réserver directement (réservation directe, hors plateformes type Airbnb).

## Portail Prestataire (rôle HOUSEKEEPER)

Interface simplifiée, pensée mobile, pour les prestataires de ménage : onglet **Missions**
(tâches assignées groupées par date, démarrage/clôture, ajout de notes, photos d'incident,
déclaration d'heures supplémentaires) et onglet **Signalements** (suivi des incidents
déclarés et échanges avec l'hôte).

## Application mobile

FlowlyRent dispose d'une application Android (WebView vers flowlyrent.com) avec
notifications push (web push + Firebase Cloud Messaging).
