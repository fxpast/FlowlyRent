# FlowlyRent — Endpoints API

Contexte path : `/api` — toutes les routes sont préfixées.

## Authentification (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | Créer un compte (retourne JWT) |
| POST | `/auth/login` | Se connecter (retourne JWT) |

## Paramètres utilisateur (JWT requis)

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

## Admin (JWT requis)

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
| GET | `/admin/property-configs` | Configs des propriétés (accessCode, shortName, cleaningHours) |
| PUT | `/admin/property-configs/{beds24PropertyId}` | Mettre à jour la config d'une propriété |
| POST | `/admin/property-configs/{beds24PropertyId}/regenerate` | Régénérer le code d'accès |
| GET | `/admin/property-inventory?beds24PropertyId=` | Inventaire équipements d'une propriété |
| POST | `/admin/property-inventory` | Ajouter un équipement |
| PUT | `/admin/property-inventory/{id}` | Modifier un équipement |
| DELETE | `/admin/property-inventory/{id}` | Supprimer un équipement |
| GET | `/admin/booking-time-overrides/{beds24BookingId}` | Horaires custom d'une réservation (404 si défaut) |
| PUT | `/admin/booking-time-overrides/{beds24BookingId}` | Créer/modifier override horaires |
| DELETE | `/admin/booking-time-overrides/{beds24BookingId}` | Supprimer override (retour horaires défaut) |
| GET | `/admin/message-templates` | Liste des modèles de messages |
| POST | `/admin/message-templates` | Créer un modèle |
| PUT | `/admin/message-templates/{id}` | Modifier un modèle |
| DELETE | `/admin/message-templates/{id}` | Supprimer un modèle (soft delete active=false) |
| GET | `/admin/payments` | Liste des paiements |
| POST | `/admin/payments/checkout-session` | Créer un lien Stripe Checkout |
| POST | `/admin/payments/payment-intent` | Créer un Payment Intent Stripe |
| GET | `/admin/housekeeping?from=&to=` | Tâches ménage (filtrées par date) |
| POST | `/admin/housekeeping` | Créer une tâche manuelle (accepte `housekeeperId`, `linenUsages`) |
| PATCH | `/admin/housekeeping/{id}/status` | Changer le statut — déclenche déduction linge si DONE |
| GET | `/admin/housekeeping/{id}/photos` | Photos d'une tâche (vérifié par user_id) |
| GET | `/admin/housekeeping/{id}/linen` | Sets de linge assignés à une tâche |
| DELETE | `/admin/housekeeping/{id}` | Supprimer une tâche (cascade linen usages + photos) |
| GET | `/admin/linen/items?beds24PropertyId=` | Articles de linge d'un logement |
| POST | `/admin/linen/items` | Ajouter un article |
| PUT | `/admin/linen/items/{id}` | Modifier un article |
| DELETE | `/admin/linen/items/{id}` | Supprimer un article (cascade usages + mouvements) |
| GET | `/admin/linen/movements?beds24PropertyId=` | Mouvements de stock d'un logement |
| POST | `/admin/linen/movements` | Enregistrer un mouvement manuel |
| DELETE | `/admin/linen/movements/{id}` | Supprimer un mouvement |
| GET | `/admin/notifications` | Notifications visibles pour l'utilisateur courant (avec isRead) |
| GET | `/admin/notifications/unread-count` | Nombre de notifications non lues |
| POST | `/admin/notifications/{id}/read` | Marquer une notification comme lue |
| POST | `/admin/notifications/read-all` | Marquer toutes les notifications visibles comme lues |
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

## Public (sans authentification)

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

## Analytics (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/analytics/track` | Enregistrer un événement `{type, page}` — userId null si non connecté |

## Portail prestataire (ROLE_HOUSEKEEPER requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/housekeeper/me` | Profil du prestataire connecté |
| GET | `/housekeeper/tasks?from=YYYY-MM-DD` | Tâches assignées à partir d'une date |
| PATCH | `/housekeeper/tasks/{id}/status` | Changer le statut (PENDING/IN_PROGRESS/DONE/SKIPPED) |
| POST | `/housekeeper/tasks/{id}/report` | Sauvegarder rapport (commentaire + incident) |
| GET | `/housekeeper/tasks/{id}/photos` | Lister les photos d'une tâche |
| POST | `/housekeeper/tasks/{id}/photos` | Ajouter une photo (base64 → Cloudinary, fallback base64) |
| DELETE | `/housekeeper/tasks/{id}/photos/{photoId}` | Supprimer une photo (+ suppression Cloudinary) |

## Superadmin (ROLE_ADMIN requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/superadmin/stats` | KPIs (users, logins, clics, visiteurs anonymes) |
| GET | `/superadmin/users` | Liste de tous les utilisateurs |
| DELETE | `/superadmin/users/{id}` | Supprimer définitivement un compte |
| PATCH | `/superadmin/users/{id}/password` | Réinitialiser le mot de passe d'un user |
| GET | `/superadmin/feedbacks` | Liste des feedbacks |
| PATCH | `/superadmin/feedbacks/{id}/status` | Changer le statut d'un feedback |
| GET | `/superadmin/notifications` | Liste des notifications envoyées (avec readCount) |
| POST | `/superadmin/notifications` | Envoyer une notification (ciblée ou globale via targetUserIds) |
| DELETE | `/superadmin/notifications/{id}` | Supprimer une notification (cascade reads + targets) |

> **Comptes exclus des KPIs** : variable d'environnement `ANALYTICS_INTERNAL_EMAILS` (liste séparée par virgules)

## Webhooks & WebSocket

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/webhooks/stripe` | Webhook Stripe (signature vérifiée) |

- Endpoint STOMP : `/ws` (SockJS)
- Topic messages : `/topic/messages/{bookingId}`
