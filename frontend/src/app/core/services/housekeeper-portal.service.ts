import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface PortalTask {
  id: number;
  type: string;
  status: string;
  scheduledDate: string;
  propertyName?: string;
  beds24PropertyId?: string;
  notes?: string;
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
  data: string;
  caption?: string;
  uploadedAt: string;
}

@Injectable({ providedIn: 'root' })
export class HousekeeperPortalService {
  private base = `${environment.apiUrl}/housekeeper`;

  constructor(private http: HttpClient) {}

  getMe(): Observable<{ id: number; name: string; email?: string; phone?: string }> {
    return this.http.get<any>(`${this.base}/me`);
  }

  getTasks(): Observable<PortalTask[]> {
    return this.http.get<PortalTask[]>(`${this.base}/tasks`);
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
    return this.http.post<TaskPhoto>(`${this.base}/tasks/${taskId}/photos`, { photoType, data, caption });
  }

  deletePhoto(taskId: number, photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/tasks/${taskId}/photos/${photoId}`);
  }
}
