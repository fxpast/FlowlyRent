import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PropertyConfig {
  id?: number;
  beds24PropertyId: string;
  shortName?: string | null;
  accessCode?: string;
  previousAccessCode?: string;
  keyBoxId?: number | null;
  keyBoxName?: string | null;
  cleaningHours?: number | null;
  cleaningFee?: number | null;
  extraPersonThreshold?: number | null;
  extraPersonFee?: number | null;
  discount7Nights?: number | null;
  discount28Nights?: number | null;
  coverPhotoUrl?: string | null;
  photoUrls?: string[];
  updatedAt?: string;
}

export interface KeyBox {
  id: number;
  name: string;
  accessCode?: string;
  previousAccessCode?: string;
}

@Injectable({ providedIn: 'root' })
export class PropertyConfigService {
  private base = `${environment.apiUrl}/admin/property-configs`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<PropertyConfig[]> {
    return this.http.get<PropertyConfig[]>(this.base);
  }

  updateShortName(propId: string, shortName: string): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { shortName });
  }

  updateAccessCode(propId: string, code: string): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { accessCode: code });
  }

  updateCleaningHours(propId: string, hours: string): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { cleaningHours: hours });
  }

  updatePricing(propId: string, pricing: {
    cleaningFee?: string;
    extraPersonThreshold?: string;
    extraPersonFee?: string;
    discount7Nights?: string;
    discount28Nights?: string;
  }): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, pricing);
  }

  updateCoverPhoto(propId: string, url: string): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { coverPhotoUrl: url });
  }

  scrapePhotos(propId: string): Observable<{ photos: string[] }> {
    return this.http.post<{ photos: string[] }>(`${this.base}/${propId}/scrape-photos`, {});
  }

  regenerate(propId: string): Observable<PropertyConfig> {
    return this.http.post<PropertyConfig>(`${this.base}/${propId}/regenerate`, {});
  }

  linkKeyBox(propId: string, keyBoxId: number): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { keyBoxId: String(keyBoxId) });
  }

  unlinkKeyBox(propId: string): Observable<PropertyConfig> {
    return this.http.put<PropertyConfig>(`${this.base}/${propId}`, { keyBoxId: '' });
  }

  getKeyBoxes(): Observable<KeyBox[]> {
    return this.http.get<KeyBox[]>(`${environment.apiUrl}/admin/key-boxes`);
  }

  createKeyBox(name: string, accessCode?: string): Observable<KeyBox> {
    return this.http.post<KeyBox>(`${environment.apiUrl}/admin/key-boxes`, { name, accessCode: accessCode ?? '' });
  }

  deleteKeyBox(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/key-boxes/${id}`);
  }
}
