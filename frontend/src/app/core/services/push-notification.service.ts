import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  constructor(private swPush: SwPush, private http: HttpClient) {}

  init(): void {
    if (!this.swPush.isEnabled) return;
    this.swPush.requestSubscription({ serverPublicKey: environment.vapidPublicKey })
      .then(sub => this.http.post(`${environment.apiUrl}/user/push/subscribe`, sub).subscribe())
      .catch(() => {});
  }
}
