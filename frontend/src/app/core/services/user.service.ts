import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface Beds24Status {
  connected: boolean;
  lastSync?: string;
  lastSyncStatus?: string;
}

export interface Beds24SyncResult {
  propertiesSynced?: number;
  bookingsSynced?: number;
  status?: string;
  error?: string;
}

export interface UserProfile {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  publicSiteSlug: string;
  phone?: string;
  listingsSlug?: string;
  beds24OwnerId?: string;
  siret?: string;
  companyName?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
}

export interface SubscriptionInfo {
  plan: string;
  stripeSubscriptionId: string | null;
  planExpiresAt: string | null;
  maxProperties: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/user/profile`);
  }

  updateProfile(data: Partial<Pick<UserProfile, 'firstName' | 'lastName' | 'publicSiteSlug' | 'phone' | 'listingsSlug' | 'beds24OwnerId' | 'siret' | 'companyName' | 'companyAddress' | 'companyLogoUrl'>>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/user/profile`, data);
  }

  getBeds24Status(): Observable<Beds24Status> {
    return this.http.get<Beds24Status>(`${this.base}/user/beds24/status`);
  }

  connectBeds24WithToken(setupToken: string): Observable<{ status: string; connected: boolean; error?: string }> {
    return this.http.post<{ status: string; connected: boolean; error?: string }>(
      `${this.base}/user/beds24/connect-token`,
      { setupToken }
    );
  }

  syncBeds24(): Observable<Beds24SyncResult> {
    return this.http.post<Beds24SyncResult>(`${this.base}/user/beds24/sync`, {});
  }

  disconnectBeds24(): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/user/beds24/disconnect`);
  }

  getSubscription(): Observable<SubscriptionInfo> {
    return this.http.get<SubscriptionInfo>(`${this.base}/admin/subscription`);
  }

  startSubscriptionCheckout(plan: string): Observable<{ url: string; sessionId: string }> {
    const successUrl = `${window.location.origin}/admin/settings?subscription=success`;
    const cancelUrl = `${window.location.origin}/admin/settings?subscription=cancelled`;
    return this.http.post<{ url: string; sessionId: string }>(
      `${this.base}/admin/subscription/checkout`,
      { plan, successUrl, cancelUrl }
    );
  }

  cancelSubscription(): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/admin/subscription`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ status?: string; error?: string }> {
    return this.http.patch<{ status?: string; error?: string }>(
      `${this.base}/user/password`,
      { currentPassword, newPassword }
    );
  }
}
