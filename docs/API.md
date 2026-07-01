# FlowlyRent — Endpoints API

Contexte path : `/api` — toutes les routes sont préfixées.

---

## Authentification (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/auth/register` | Créer un compte (retourne JWT) |
| POST | `/auth/login` | Se connecter (retourne JWT) |
| POST | `/auth/refresh` | Renouveler le JWT (auto-appelé si < 30j restants) |

---

## Paramètres utilisateur (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/user/profile` | Profil de l'utilisateur connecté |
| PUT | `/user/profile` | Modifier firstName, lastName, publicSiteSlug, invoiceFooter, companyName… |
| GET | `/user/beds24/status` | Statut connexion Beds24 + dernière sync |
| POST | `/user/beds24/connect-token` | Connecter compte Beds24 via setup token |
| POST | `/user/beds24/sync` | Déclencher une sync manuelle Beds24 |
| DELETE | `/user/beds24/disconnect` | Déconnecter le compte Beds24 |
| PATCH | `/user/password` | Changer son mot de passe (vérifie l'ancien) |
| POST | `/user/feedback` | Soumettre un feedback |
| GET | `/user/push/vapid-public-key` | Clé publique VAPID pour Web Push |
| POST | `/user/push/subscribe` | Enregistrer une subscription Web Push |
| DELETE | `/user/push/unsubscribe` | Supprimer une subscription Web Push |
| POST | `/user/push/subscribe-fcm` | Enregistrer un token FCM (mobile) |
| DELETE | `/user/push/unsubscribe-fcm` | Supprimer un token FCM |
| GET | `/user/stripe-connect/url` | URL d'autorisation OAuth Stripe Connect |
| POST | `/user/stripe-connect/callback` | Échanger le code OAuth → enregistre `stripeAccountId` |
| DELETE | `/user/stripe-connect/disconnect` | Déconnecter le compte Stripe Connect |

---

## Abonnements (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/subscription` | Plan actuel + statut Stripe |
| POST | `/admin/subscription/checkout` | Créer une session Stripe Checkout pour upgrade |
| DELETE | `/admin/subscription` | Annuler l'abonnement |

---

## Réservations (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/bookings` | Liste des réservations (scopé user) |
| GET | `/admin/bookings/{id}` | Détail d'une réservation |
| POST | `/admin/bookings` | Créer une réservation Beds24 |
| DELETE | `/admin/bookings` | Supprimer une réservation Beds24 |
| GET | `/admin/bookings/today` | Arrivées + départs du jour (filtre prolongation) |
| GET | `/admin/bookings/arrivals?weekStart=` | Arrivées de la semaine (filtre prolongation) |
| GET | `/admin/bookings/departures?weekStart=` | Départs de la semaine (filtre prolongation) |
| GET | `/admin/bookings/overlap?from=&to=&propId=` | Chevauchements de dates (mode iCal) |
| GET | `/admin/bookings/estimate` | Estimation de prix avant réservation directe |
| POST | `/admin/bookings/direct` | Créer une réservation directe iCal (`icalUid = "direct-*"`) |
| PUT | `/admin/bookings/direct/{id}` | Modifier une réservation directe |
| DELETE | `/admin/bookings/direct/{id}` | Supprimer une réservation directe |
| POST | `/admin/bookings/mark-sent` | Marquer un message comme envoyé |
| GET | `/admin/bookings/sent-ids` | IDs des messages déjà envoyés |

---

## Messages (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/messages/{bookingId}` | Messages d'une réservation |
| POST | `/admin/messages/{bookingId}` | Envoyer un message (hôte) |
| GET | `/admin/messages/unread-count` | Nombre de messages non lus |

---

## Modèles de messages (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/message-templates` | Liste des modèles |
| POST | `/admin/message-templates` | Créer un modèle |
| PUT | `/admin/message-templates/{id}` | Modifier un modèle |
| DELETE | `/admin/message-templates/{id}` | Supprimer (soft delete `active=false`) |

---

## Propriétés & configuration (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/properties` | Liste des logements (Beds24 ou iCal, inclut `icalFeedToken`) |
| GET | `/admin/property-configs` | Configs du mode actif (accessCode, shortName, cleaningHours, keyBoxId) |
| PUT | `/admin/property-configs/{beds24PropertyId}` | Mettre à jour la config |
| POST | `/admin/property-configs/{beds24PropertyId}/regenerate` | Régénérer le code d'accès |
| GET | `/admin/property-inventory?beds24PropertyId=` | Inventaire équipements |
| POST | `/admin/property-inventory` | Ajouter un équipement |
| PUT | `/admin/property-inventory/{id}` | Modifier un équipement |
| DELETE | `/admin/property-inventory/{id}` | Supprimer un équipement |
| GET | `/admin/booking-time-overrides/{beds24BookingId}` | Horaires custom (404 si défaut) |
| PUT | `/admin/booking-time-overrides/{beds24BookingId}` | Créer/modifier override horaires |
| DELETE | `/admin/booking-time-overrides/{beds24BookingId}` | Supprimer override |

---

## Boîtes à clé (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/key-boxes` | Liste des boîtes à clé |
| POST | `/admin/key-boxes` | Créer une boîte |
| PUT | `/admin/key-boxes/{id}` | Modifier une boîte |
| POST | `/admin/key-boxes/{id}/regenerate` | Régénérer le code |
| DELETE | `/admin/key-boxes/{id}` | Supprimer (supprime aussi si orpheline) |

---

## Logements iCal — mode iCal uniquement (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/local-properties` | Liste des logements iCal |
| POST | `/admin/local-properties` | Créer un logement iCal |
| PUT | `/admin/local-properties/{id}` | Modifier un logement |
| DELETE | `/admin/local-properties/{id}` | Supprimer un logement |
| POST | `/admin/local-properties/{id}/sync` | Forcer la sync iCal |
| POST | `/admin/local-properties/{id}/regenerate-token` | Régénérer le token du flux iCal |
| GET | `/admin/local-properties/{propId}/ical-sources` | Sources iCal d'un logement |
| POST | `/admin/local-properties/{propId}/ical-sources` | Ajouter une source iCal |
| PUT | `/admin/local-properties/{propId}/ical-sources/{sourceId}` | Modifier une source |
| DELETE | `/admin/local-properties/{propId}/ical-sources/{sourceId}` | Supprimer une source (cascade IcalBooking) |
| POST | `/admin/local-properties/{propId}/ical-sources/{sourceId}/sync` | Sync manuelle d'une source |

---

## Bundles de logements (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/property-bundles` | Liste des bundles |
| POST | `/admin/property-bundles` | Créer un bundle |
| PUT | `/admin/property-bundles/{id}` | Modifier un bundle |
| DELETE | `/admin/property-bundles/{id}` | Supprimer un bundle |
| POST | `/admin/property-bundles/{id}/run` | Forcer la sync d'un bundle |

---

## Disponibilité & calendrier (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/availability/calendar?from=&to=` | Données calendrier (logements, réservations, blocages) |
| POST | `/admin/availability/calendar` | Mettre à jour le calendrier Beds24 |
| POST | `/admin/availability/blackout` | Bloquer des dates |
| POST | `/admin/availability/price` | Mettre à jour les prix sur une plage |
| GET | `/admin/availability/availability?from=&to=` | Vérifier la disponibilité |

---

## Entretien (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/housekeeping?from=&to=` | Tâches ménage (filtrées par date) |
| GET | `/admin/housekeeping/by-booking/{bookingId}` | Tâche liée à une réservation |
| POST | `/admin/housekeeping` | Créer une tâche manuelle |
| PATCH | `/admin/housekeeping/{id}` | Modifier une tâche |
| PATCH | `/admin/housekeeping/{id}/status` | Changer le statut (DONE déclenche déduction linge) |
| GET | `/admin/housekeeping/{id}/linen` | Sets de linge d'une tâche |
| GET | `/admin/housekeeping/{id}/photos` | Photos d'une tâche |
| POST | `/admin/housekeeping/{id}/photos` | Ajouter une photo (base64 → Cloudinary) |
| DELETE | `/admin/housekeeping/{id}/photos/{photoId}` | Supprimer une photo |
| DELETE | `/admin/housekeeping/{id}` | Supprimer une tâche |
| GET | `/admin/housekeeping/staff` | Personnel interne ménage |
| POST | `/admin/housekeeping/staff` | Ajouter un membre du personnel |
| PUT | `/admin/housekeeping/staff/{id}` | Modifier un membre du personnel |
| GET | `/admin/housekeepers` | Prestataires externes |
| POST | `/admin/housekeepers` | Créer un prestataire |
| PUT | `/admin/housekeepers/{id}` | Modifier un prestataire |
| DELETE | `/admin/housekeepers/{id}` | Supprimer (soft delete) |
| POST | `/admin/housekeepers/{id}/activate` | Créer compte portail (AppUser HOUSEKEEPER) |
| DELETE | `/admin/housekeepers/{id}/deactivate` | Désactiver compte portail |

---

## Linge (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/linen/items?beds24PropertyId=` | Articles de linge d'un logement |
| POST | `/admin/linen/items` | Ajouter un article |
| PUT | `/admin/linen/items/{id}` | Modifier un article |
| DELETE | `/admin/linen/items/{id}` | Supprimer (cascade usages + mouvements) |
| GET | `/admin/linen/movements?beds24PropertyId=` | Mouvements de stock |
| POST | `/admin/linen/movements` | Enregistrer un mouvement |
| DELETE | `/admin/linen/movements/{id}` | Supprimer un mouvement |
| GET | `/admin/linen/templates` | Modèles de dotation linge |
| POST | `/admin/linen/templates` | Créer un modèle |
| PUT | `/admin/linen/templates/{id}` | Modifier un modèle |
| DELETE | `/admin/linen/templates/{id}` | Supprimer un modèle |
| POST | `/admin/linen/templates/{id}/apply` | Appliquer un modèle à un logement |

---

## Paiements (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/payments` | Liste des paiements |
| POST | `/admin/payments/checkout-session` | Créer un lien Stripe Checkout |
| POST | `/admin/payments/payment-intent` | Créer un Payment Intent Stripe |

---

## Factures (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/invoices` | Liste des factures |
| GET | `/admin/invoices/{id}` | Détail d'une facture |
| POST | `/admin/invoices` | Créer une facture |
| PUT | `/admin/invoices/{id}` | Modifier une facture |
| PATCH | `/admin/invoices/{id}/status` | Changer le statut (DRAFT/SENT/PAID/CANCELLED) |
| DELETE | `/admin/invoices/{id}` | Supprimer une facture |

---

## Dépenses & revenus manuels (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/manual-expenses` | Liste des dépenses manuelles |
| POST | `/admin/manual-expenses` | Créer une dépense |
| PUT | `/admin/manual-expenses/{id}` | Modifier une dépense |
| DELETE | `/admin/manual-expenses/{id}` | Supprimer une dépense |
| GET | `/admin/manual-revenues` | Liste des revenus manuels |
| POST | `/admin/manual-revenues` | Créer un revenu |
| PUT | `/admin/manual-revenues/{id}` | Modifier un revenu |
| DELETE | `/admin/manual-revenues/{id}` | Supprimer un revenu |

---

## Qonto (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/qonto/transactions?from=&to=` | Transactions Qonto (avec catégorie) |
| GET | `/admin/qonto/summary?from=&to=` | Résumé débits (total + `byProperty`) |
| GET | `/admin/expense-rules` | Règles de catégorisation |
| POST | `/admin/expense-rules` | Créer une règle |
| PUT | `/admin/expense-rules/{id}` | Modifier une règle |
| DELETE | `/admin/expense-rules/{id}` | Supprimer une règle |

---

## Statistiques & rapports (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/stats/revenue?year=&month=` | CA mensuel Beds24 (+ iCal) + taux d'occupation |
| GET | `/admin/stats/housekeeping-costs?from=&to=` | Total coûts ménage + `byProperty` (DONE + prestataire assigné) |
| GET | `/admin/reports/hk/month-by-staff?from=&to=` | Ménage — détail par agent |
| GET | `/admin/reports/hk/annual-by-property?year=` | Ménage — résumé annuel par propriété |
| GET | `/admin/reports/hk/annual-detail?year=` | Ménage — détail complet de l'année |
| GET | `/admin/reports/hk/by-staff?staffId=&from=&to=` | Ménage — tâches d'un agent |
| GET | `/admin/reports/hk/by-property?propId=&from=&to=` | Ménage — tâches d'un logement |
| GET | `/admin/reports/b24/ca-annual?year=` | CA annuel Beds24 |
| GET | `/admin/reports/b24/ca-annual-by-property?year=` | CA annuel par logement |
| GET | `/admin/reports/b24/ca-by-property?propId=&from=&to=` | CA d'un logement |
| GET | `/admin/reports/b24/stats-platform?from=&to=` | Stats par plateforme |
| GET | `/admin/reports/b24/occupancy?year=` | Taux d'occupation annuel |
| GET | `/admin/reports/***/export` | Export CSV (même routes avec `/export` suffixe) |

---

## Prix dynamique (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/dynamic-pricing/suggestion?propId=&from=&to=` | Suggestion de prix (segmentée par événements) |
| GET | `/admin/dynamic-pricing/property-configs` | Configs prix (min/max/base) par logement |
| POST | `/admin/dynamic-pricing/property-configs` | Créer/modifier config prix |
| GET | `/admin/dynamic-pricing/event-impact-config` | Config impact événements (4 niveaux) |
| PUT | `/admin/dynamic-pricing/event-impact-config` | Modifier config impact |
| GET | `/admin/pricing-zones` | Zones de prix dynamique |
| POST | `/admin/pricing-zones` | Créer une zone |
| PUT | `/admin/pricing-zones/{id}` | Modifier une zone (avec ses périodes) |
| DELETE | `/admin/pricing-zones/{id}` | Supprimer une zone |
| GET | `/admin/local-events` | Événements locaux |
| POST | `/admin/local-events` | Créer un événement |
| PUT | `/admin/local-events/{id}` | Modifier un événement |
| DELETE | `/admin/local-events/{id}` | Supprimer un événement |
| GET | `/admin/min-stay` | Stratégies durée minimum séjour |
| PUT | `/admin/min-stay` | Mettre à jour les stratégies |
| POST | `/admin/min-stay/run` | Appliquer les stratégies sur Beds24 |

---

## Répondeur automatique (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/auto-responder/config` | Config du répondeur (actif, prompt, secret webhook) |
| PUT | `/admin/auto-responder/config` | Modifier la config |
| GET | `/admin/auto-responder/logs` | Historique des réponses auto envoyées |
| GET | `/admin/auto-responder/default-keywords` | Mots-clés prédéfinis suggérés |
| POST | `/admin/auto-responder/test` | Simuler une réponse sans envoyer |

---

## Chatbot IA (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/admin/chatbot/message` | Envoyer un message au chatbot (Gemini → Groq fallback) |

---

## Notifications (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/notifications` | Notifications visibles (avec `isRead`) |
| GET | `/admin/notifications/unread-count` | Nombre non lues |
| POST | `/admin/notifications/{id}/read` | Marquer comme lue |
| POST | `/admin/notifications/read-all` | Tout marquer comme lu |

---

## Public (sans authentification)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/public/{slug}/properties` | Logements actifs d'un hôte (par slug) |
| GET | `/public/{slug}/properties/{id}` | Détail d'un logement |
| GET | `/public/{slug}/properties/{id}/availability` | Vérifier la disponibilité |
| GET | `/public/{slug}/search?from=&to=&guests=` | Recherche disponibilité avec filtre capacité voyageurs |
| POST | `/public/{slug}/bookings` | Créer une réservation (client) |
| GET | `/public/{slug}/bookings/{bookingId}` | Voir sa réservation |
| POST | `/public/{slug}/bookings/{bookingId}/messages` | Envoyer un message (voyageur) |
| GET | `/public/{slug}/stripe-key` | Clé publique Stripe + stripeAccountId de l'hôte |
| POST | `/public/{slug}/create-payment-intent` | Créer un Payment Intent (Stripe Connect) |
| GET | `/public/ical/{token}.ics` | Flux iCal public (bloquer dates sur Airbnb/Booking) |
| GET | `/public/faq?lang=fr` | FAQ publique (fallback FR) |
| GET | `/public/privacy` | Politique de confidentialité (Play Store) |
| GET | `/public/delete-account` | Procédure suppression de compte (Play Store) |

---

## Analytics (public)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/analytics/track` | Enregistrer un événement `{type, page}` — userId null si non connecté |

---

## Portail prestataire (ROLE_HOUSEKEEPER requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/housekeeper/me` | Profil du prestataire connecté |
| GET | `/housekeeper/tasks?from=YYYY-MM-DD` | Tâches assignées à partir d'une date |
| PATCH | `/housekeeper/tasks/{id}/status` | Changer le statut |
| POST | `/housekeeper/tasks/{id}/report` | Sauvegarder rapport (commentaire + incident) |
| GET | `/housekeeper/tasks/{id}/photos` | Lister les photos |
| POST | `/housekeeper/tasks/{id}/photos` | Ajouter une photo (base64 → Cloudinary) |
| DELETE | `/housekeeper/tasks/{id}/photos/{photoId}` | Supprimer une photo |

---

## FAQ (Superadmin — ROLE_ADMIN requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/superadmin/faq` | Liste des entrées FAQ |
| POST | `/superadmin/faq` | Créer une entrée |
| PUT | `/superadmin/faq/{id}` | Modifier une entrée |
| DELETE | `/superadmin/faq/{id}` | Supprimer une entrée |
| POST | `/superadmin/faq/retranslate` | Forcer la re-traduction de toutes les entrées |
| POST | `/superadmin/faq-import` | Import en masse (CSV/JSON) |
| GET | `/superadmin/faq-suggestions` | Questions sans réponse enregistrées par le chatbot |
| POST | `/superadmin/faq-suggestions/{id}/approve` | Convertir une suggestion en entrée FAQ |
| DELETE | `/superadmin/faq-suggestions/{id}` | Supprimer une suggestion |

---

## Superadmin (ROLE_ADMIN requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/superadmin/stats` | KPIs (users, logins, clics, visiteurs anonymes) |
| GET | `/superadmin/users` | Liste de tous les utilisateurs |
| DELETE | `/superadmin/users/{id}` | Supprimer définitivement un compte |
| PATCH | `/superadmin/users/{id}/password` | Réinitialiser le mot de passe |
| GET | `/superadmin/feedbacks` | Feedbacks (inclut category="chatbot" pour actions non gérées) |
| PATCH | `/superadmin/feedbacks/{id}/status` | Changer le statut |
| GET | `/superadmin/notifications` | Notifications envoyées (avec `readCount`) |
| POST | `/superadmin/notifications` | Envoyer une notification (ciblée ou globale) |
| DELETE | `/superadmin/notifications/{id}` | Supprimer une notification |

> **Comptes exclus des KPIs** : variable d'env `ANALYTICS_INTERNAL_EMAILS` (liste séparée par virgules)

---

## Webhooks & WebSocket

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/webhooks/stripe` | Webhook Stripe (signature vérifiée) |
| POST | `/webhooks/beds24/{userId}` | Webhook Beds24 — messages voyageurs → répondeur auto |

- Endpoint STOMP : `/ws` (SockJS)
- Topic messages : `/topic/messages/{bookingId}`
