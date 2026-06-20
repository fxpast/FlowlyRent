import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PricingZonePeriod {
  id?: number; name: string;
  startMonth: number; startDay: number;
  endMonth: number; endDay: number;
  adjustmentPercent: number;
}

export interface PricingZone {
  id?: number; name: string;
  periods: PricingZonePeriod[];
}

export interface PropertyPricingConfig {
  id?: number; beds24PropertyId: string;
  zoneId: number | null; marketMin: number | null; marketMax: number | null;
}

export interface PricingSuggestion {
  propertyId: string; startDate: string; endDate: string;
  currentPrice: number | null;
  basePrice: number | null; suggestedMin: number | null; suggestedMax: number | null;
  seasonName: string | null; seasonalAdjustmentPercent: number;
  occupancyRate: number; occupancyAdjustmentPercent: number;
  marketMin: number | null; marketMax: number | null;
  alert: 'underpriced' | 'overpriced' | 'ok' | 'no_data' | 'no_current_price';
  historicalBookingsCount: number;
}

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class DynamicPricingService {
  constructor(private http: HttpClient) {}

  getSuggestion(propId: string, startDate: string, endDate: string): Observable<PricingSuggestion> {
    return this.http.get<PricingSuggestion>(`${BASE}/admin/dynamic-pricing/suggestion`, {
      params: { propId, startDate, endDate }
    });
  }

  listZones(): Observable<PricingZone[]> {
    return this.http.get<PricingZone[]>(`${BASE}/admin/pricing-zones`);
  }

  createZone(zone: PricingZone): Observable<PricingZone> {
    return this.http.post<PricingZone>(`${BASE}/admin/pricing-zones`, zone);
  }

  updateZone(id: number, zone: PricingZone): Observable<PricingZone> {
    return this.http.put<PricingZone>(`${BASE}/admin/pricing-zones/${id}`, zone);
  }

  deleteZone(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/admin/pricing-zones/${id}`);
  }

  listPropertyConfigs(): Observable<PropertyPricingConfig[]> {
    return this.http.get<PropertyPricingConfig[]>(`${BASE}/admin/dynamic-pricing/property-configs`);
  }

  savePropertyConfig(config: PropertyPricingConfig): Observable<PropertyPricingConfig> {
    return this.http.post<PropertyPricingConfig>(`${BASE}/admin/dynamic-pricing/property-configs`, config);
  }
}
