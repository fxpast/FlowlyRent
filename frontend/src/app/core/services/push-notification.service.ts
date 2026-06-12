import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  constructor(private swPush: SwPush, private http: HttpClient) {}

  init(): void {
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
}
