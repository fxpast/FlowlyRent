import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-account',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="card">
        <h1>Suppression de compte FlowlyRent</h1>

        <div class="alert">
          <span class="icon">⚠</span>
          La suppression de votre compte est définitive et irréversible.
        </div>

        <h2>Comment demander la suppression de votre compte</h2>
        <p>
          Pour demander la suppression de votre compte et de vos données personnelles,
          envoyez un e-mail à l'adresse suivante :
        </p>
        <div class="email-box">
          <a href="mailto:contact&#64;flowlyrent.com?subject=Demande%20de%20suppression%20de%20compte%20FlowlyRent&body=Bonjour%2C%0A%0AJe%20souhaite%20supprimer%20mon%20compte%20FlowlyRent%20ainsi%20que%20toutes%20les%20donn%C3%A9es%20associ%C3%A9es.%0A%0AAdresse%20e-mail%20de%20mon%20compte%20%3A%20%0A%0AMerci.">
            contact&#64;flowlyrent.com
          </a>
        </div>
        <p class="hint">
          Objet conseillé : <em>Demande de suppression de compte FlowlyRent</em><br>
          Indiquez l'adresse e-mail associée à votre compte dans le corps du message.
        </p>

        <h2>Délai de traitement</h2>
        <p>
          Votre demande sera traitée dans un délai maximum de <strong>30 jours</strong>
          à compter de sa réception. Vous recevrez une confirmation par e-mail une fois
          la suppression effectuée.
        </p>

        <h2>Données supprimées</h2>
        <p>Suite à la suppression de votre compte, les données suivantes sont définitivement effacées :</p>
        <ul>
          <li>Vos informations de compte (nom, adresse e-mail, mot de passe)</li>
          <li>Vos configurations de propriétés et noms courts</li>
          <li>Vos réservations directes saisies manuellement</li>
          <li>Vos modèles de messages et préférences de l'application</li>
          <li>Vos photos de propriétés hébergées sur Cloudinary</li>
          <li>Vos données de notifications et blanchisserie</li>
        </ul>

        <h2>Données conservées temporairement</h2>
        <p>Certaines données peuvent être conservées au-delà de la suppression pour des raisons légales :</p>
        <ul>
          <li>
            <strong>Données de facturation et transactions Stripe</strong> — conservées
            <strong>10 ans</strong> conformément aux obligations comptables françaises.
          </li>
          <li>
            <strong>Journaux d'accès serveur</strong> — conservés <strong>12 mois</strong>
            conformément à la loi française (LCEN).
          </li>
        </ul>

        <h2>Données non détenues par FlowlyRent</h2>
        <p>
          Les réservations et données de propriétés synchronisées depuis <strong>Beds24</strong>
          restent dans votre compte Beds24 et doivent être supprimées directement auprès de ce service.
        </p>

        <div class="contact">
          <p>Pour toute question : <a href="mailto:contact&#64;flowlyrent.com">contact&#64;flowlyrent.com</a></p>
          <p><a href="/public/privacy">Politique de confidentialité complète →</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 720px; margin: 40px auto; padding: 0 16px 60px; font-family: sans-serif; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); padding: 40px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 24px; color: #111; }
    h2 { font-size: 16px; font-weight: 600; margin-top: 28px; margin-bottom: 10px; color: #1976d2; }
    p, li { font-size: 15px; line-height: 1.7; color: #333; }
    ul { padding-left: 20px; margin: 8px 0 16px; }
    li { margin-bottom: 4px; }
    a { color: #1976d2; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .alert {
      background: #fff3e0; border-left: 4px solid #f57c00; border-radius: 4px;
      padding: 14px 16px; margin: 0 0 24px; font-size: 15px; color: #e65100;
      display: flex; align-items: center; gap: 10px;
    }
    .icon { font-size: 18px; }
    .email-box {
      background: #e3f2fd; border-radius: 6px; padding: 16px 20px;
      margin: 12px 0; font-size: 18px; font-weight: 600; text-align: center;
    }
    .hint { font-size: 13px; color: #666; margin-top: 8px; }
    .contact { margin-top: 36px; padding-top: 20px; border-top: 1px solid #eee; }
    .contact p { margin: 4px 0; font-size: 14px; }
  `]
})
export class DeleteAccountComponent {}
