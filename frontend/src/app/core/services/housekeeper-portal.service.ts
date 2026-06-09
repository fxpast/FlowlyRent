import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';

export interface PortalTask {
  id: number;
  type: string;
  status: string;
  scheduledDate: string;
  propertyName?: string;
  beds24PropertyId?: string;
  notes?: string;
  extraHours?: number | null;
  reportComment?: string;
  hasIncident?: boolean;
  incidentDescription?: string;
  reportedAt?: string;
  completedAt?: string;
  housekeeper?: { id: number; name: string };
}

export interface TaskPhoto {
  id: number;
  photoType: string;
  url?: string;   // Cloudinary (nouveaux uploads)
  data?: string;  // base64 legacy
  caption?: string;
  uploadedAt: string;
}

@Injectable({ providedIn: 'root' })
export class HousekeeperPortalService {
  readonly baseUrl = `${environment.apiUrl}/housekeeper`;
  private base = this.baseUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  token(): string | null { return this.auth.getToken(); }

  private authHeaders(): HttpHeaders {
    const t = this.auth.getToken();
    return t ? new HttpHeaders({ Authorization: `Bearer ${t}` }) : new HttpHeaders();
  }

  getMe(): Observable<{ id: number; name: string; email?: string; phone?: string }> {
    return this.http.get<any>(`${this.base}/me`);
  }

  getTasks(from?: string): Observable<PortalTask[]> {
    const params = from ? `?from=${from}` : '';
    return this.http.get<PortalTask[]>(`${this.base}/tasks${params}`);
  }

  updateStatus(taskId: number, status: string): Observable<PortalTask> {
    return this.http.patch<PortalTask>(`${this.base}/tasks/${taskId}/status`, { status });
  }

  saveReport(taskId: number, data: { reportComment: string; hasIncident: boolean; incidentDescription: string }): Observable<PortalTask> {
    return this.http.post<PortalTask>(`${this.base}/tasks/${taskId}/report`, data);
  }

  getPhotos(taskId: number): Observable<TaskPhoto[]> {
    return this.http.get<TaskPhoto[]>(`${this.base}/tasks/${taskId}/photos`);
  }

  addPhoto(taskId: number, photoType: string, data: string, caption: string): Observable<TaskPhoto> {
    return this.http.post<TaskPhoto>(
      `${this.base}/tasks/${taskId}/photos`,
      { photoType, data, caption },
      { headers: this.authHeaders() }
    );
  }

  deletePhoto(taskId: number, photoId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/tasks/${taskId}/photos/${photoId}`,
      { headers: this.authHeaders() }
    );
  }

  getArrivals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/arrivals`);
  }

  getDepartures(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/departures`);
  }
}
