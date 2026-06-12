import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="page">
      <mat-card>
        <mat-card-content>
          <h1>Politique de confidentialité — FlowlyRent</h1>
          <p class="date">Dernière mise à jour : juin 2025</p>

          <h2>1. Présentation</h2>
          <p>
            FlowlyRent (ci-après « l'Application ») est un service de gestion de locations saisonnières
            accessible via <strong>flowlyrent.com</strong> et via son application Android.
            L'Application est éditée et exploitée par FlowlyRent, joignable à
            <a href="mailto:contact@flowlyrent.com">contact@flowlyrent.com</a>.
          </p>

          <h2>2. Données collectées</h2>
          <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
          <ul>
            <li><strong>Données de compte</strong> : prénom, nom, adresse e-mail, mot de passe chiffré.</li>
            <li><strong>Données de propriété</strong> : noms et configurations des logements synchronisés via Beds24.</li>
            <li><strong>Données de réservation</strong> : noms de voyageurs, dates de séjour, montants — transmises par Beds24 ou saisies manuellement.</li>
            <li><strong>Données de paiement</strong> : traitées exclusivement par <strong>Stripe</strong>. FlowlyRent ne stocke aucune donnée de carte bancaire.</li>
            <li><strong>Données bancaires Qonto</strong> : transactions importées depuis l'API Qonto pour la gestion des dépenses. Aucune donnée bancaire n'est revendue.</li>
            <li><strong>Données de navigation</strong> : pages consultées, date et heure — à des fins statistiques internes uniquement.</li>
          </ul>

          <h2>3. Finalité du traitement</h2>
          <ul>
            <li>Fourniture et amélioration du service de gestion locative.</li>
            <li>Authentification et sécurité des comptes.</li>
            <li>Traitement des paiements via Stripe.</li>
            <li>Envoi de notifications internes à l'application.</li>
            <li>Production de rapports financiers (chiffre d'affaires, dépenses).</li>
          </ul>

          <h2>4. Base légale (RGPD)</h2>
          <p>
            Le traitement repose sur l'exécution du contrat de service (Art. 6.1.b RGPD)
            et, pour les statistiques, sur l'intérêt légitime de l'éditeur (Art. 6.1.f RGPD).
          </p>

          <h2>5. Partage des données</h2>
          <p>Vos données ne sont jamais vendues. Elles peuvent être transmises aux sous-traitants suivants :</p>
          <ul>
            <li><strong>Beds24</strong> — synchronisation des propriétés et réservations.</li>
            <li><strong>Stripe</strong> — traitement des paiements.</li>
            <li><strong>Qonto</strong> — import des transactions bancaires (si connecté).</li>
            <li><strong>Cloudinary</strong> — hébergement des photos de propriétés.</li>
            <li><strong>Railway / Netlify</strong> — hébergement de l'infrastructure.</li>
          </ul>

          <h2>6. Durée de conservation</h2>
          <p>
            Les données sont conservées pendant toute la durée d'utilisation du compte,
            puis supprimées dans un délai de <strong>30 jours</strong> après résiliation ou demande de suppression.
          </p>

          <h2>7. Sécurité</h2>
          <p>
            Les mots de passe sont stockés sous forme hachée (bcrypt).
            Les communications sont chiffrées via HTTPS/TLS.
            Les tokens d'authentification ont une durée de validité limitée à 7 jours.
          </p>

          <h2>8. Vos droits (RGPD)</h2>
          <p>Vous disposez des droits suivants sur vos données :</p>
          <ul>
            <li>Droit d'accès, de rectification et d'effacement.</li>
            <li>Droit à la portabilité.</li>
            <li>Droit d'opposition au traitement.</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à
            <a href="mailto:contact@flowlyrent.com">contact@flowlyrent.com</a>.
          </p>

          <h2>9. Application Android</h2>
          <p>
            L'application Android FlowlyRent est une interface vers <strong>flowlyrent.com</strong>.
            Elle ne collecte aucune donnée supplémentaire par rapport à la version web.
            Elle ne requiert aucune permission système (caméra, localisation, contacts, etc.).
          </p>

          <h2>10. Cookies</h2>
          <p>
            L'application utilise le stockage local du navigateur (localStorage) pour maintenir
            la session de l'utilisateur. Aucun cookie tiers de tracking n'est utilisé.
          </p>

          <h2>11. Modifications</h2>
          <p>
            Toute modification de la présente politique sera notifiée via une notification
            dans l'application et/ou par e-mail. La version en vigueur est toujours accessible
            à l'adresse <strong>flowlyrent.com/public/privacy</strong>.
          </p>

          <h2>12. Contact</h2>
          <p>
            FlowlyRent — <a href="mailto:contact@flowlyrent.com">contact@flowlyrent.com</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 40px auto; padding: 0 16px 60px; }
    mat-card { padding: 8px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .date { color: #888; font-size: 13px; margin-bottom: 32px; }
    h2 { font-size: 17px; font-weight: 600; margin-top: 28px; margin-bottom: 8px; color: #1976d2; }
    p, li { font-size: 15px; line-height: 1.7; color: #333; }
    ul { padding-left: 20px; margin: 8px 0; }
    a { color: #1976d2; }
  `]
})
export class PrivacyComponent {}
