import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private pendingFcmToken: string | null = null;

  constructor(private swPush: SwPush, private http: HttpClient) {
    this.exposeFcmBridge();
  }

  init(): void {
    if (this.pendingFcmToken) this.sendFcmToken(this.pendingFcmToken);

    if (!this.swPush.isEnabled) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return;
    this.swPush.requestSubscription({ serverPublicKey: environment.vapidPublicKey })
      .then(sub => {
        const payload = sub.toJSON();
        console.log('[Push] Souscription créée, envoi au backend');
        this.http.post(`${environment.apiUrl}/user/push/subscribe`, payload).subscribe({
          next: () => console.log('[Push] Souscription enregistrée'),
          error: (e) => console.error('[Push] Échec enregistrement souscription', e)
        });
      })
      .catch(err => console.warn('[Push] requestSubscription échoué :', err));
  }

  /**
   * Expose un pont JS appelé par l'app Flutter (window.registerFcmToken)
   * pour transmettre le token FCM de l'appareil au backend.
   */
  private exposeFcmBridge(): void {
    (window as any).registerFcmToken = (token: string) => {
      this.pendingFcmToken = token;
      this.sendFcmToken(token);
    };
  }

  private sendFcmToken(token: string): void {
    if (!localStorage.getItem('flr_token')) return;
    this.http.post(`${environment.apiUrl}/user/push/subscribe-fcm`, { token }).subscribe({
      next: () => {
        this.pendingFcmToken = null;
        console.log('[Push] Token FCM enregistré');
      },
      error: (e) => console.error('[Push] Échec enregistrement token FCM', e)
    });
  }
}
