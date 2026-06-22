INSERT INTO faq_items (question, answer, display_order, created_at, updated_at)
VALUES (
  'Comment est calculé le prix suggéré en tarification dynamique ?',
  'Le prix suggéré est calculé en 5 étapes successives à partir de vos données historiques Beds24 (24 derniers mois).

Exemple de calcul :

Étape                              Calcul              Résultat
──────────────────────────────────────────────────────────────────
1. Prix historique moyen           Moyenne réservations      74 €
2. Ajustement saisonnier (+20%)    74 × 1,20                 89 €
3. Taux d''occupation 23% (−15%)   89 × 0,85                 75 €
4. Événement local Fort (+75%)     75 × 1,75                132 €  ← prix médian
5. Fourchette ±10%                 132 × 0,90 / × 1,10  119 – 146 €
──────────────────────────────────────────────────────────────────

Le résultat est ensuite cadré par les prix min/max marché que vous avez saisis dans l''onglet Configuration (si renseignés).

Niveaux d''impact des événements locaux :
• Faible → +25 %
• Moyen  → +50 %
• Fort   → +75 %

L''alerte affichée (sous-évalué / surévalué / optimal) compare votre prix actuel (moyenne des réservations déjà en place sur la période) à la fourchette suggérée.',
  (SELECT COALESCE(MAX(display_order), -1) + 1 FROM faq_items f2),
  NOW(),
  NOW()
);
