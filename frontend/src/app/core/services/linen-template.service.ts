import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface LinenTemplateItem {
  id?: number;
  label: string;
  category: string;
  totalQuantity: number;
  minThreshold: number | null;
  defaultPerCleaning: number | null;
  sortOrder?: number;
}

export interface LinenTemplate {
  id?: number;
  name: string;
  items: LinenTemplateItem[];
}

@Injectable({ providedIn: 'root' })
export class LinenTemplateService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  list(): Observable<LinenTemplate[]> {
    return this.http.get<LinenTemplate[]>(`${this.base}/admin/linen/templates`);
  }

  create(template: LinenTemplate): Observable<LinenTemplate> {
    return this.http.post<LinenTemplate>(`${this.base}/admin/linen/templates`, template);
  }

  update(id: number, template: LinenTemplate): Observable<LinenTemplate> {
    return this.http.put<LinenTemplate>(`${this.base}/admin/linen/templates/${id}`, template);
  }

  delete(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/admin/linen/templates/${id}`);
  }

  apply(id: number, beds24PropertyIds: string[], propertyNames: Record<string, string>): Observable<{ success: boolean; itemsUpdated?: number; error?: string }> {
    return this.http.post<{ success: boolean; itemsUpdated?: number; error?: string }>(
      `${this.base}/admin/linen/templates/${id}/apply`,
      { beds24PropertyIds, propertyNames }
    );
  }
}
