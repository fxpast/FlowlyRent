import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface InventoryItem {
  id?: number;
  beds24PropertyId: string;
  category: string;
  label: string;
  details?: string | null;
  quantity: number;
  sortOrder?: number;
}

export const INVENTORY_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'BEDS',       label: 'Literie',          icon: 'bed'              },
  { value: 'APPLIANCES', label: 'Électroménager',   icon: 'kitchen'          },
  { value: 'TECH',       label: 'High-tech',         icon: 'devices'          },
  { value: 'KITCHEN',    label: 'Cuisine',           icon: 'coffee_maker'     },
  { value: 'BATHROOM',   label: 'Salle de bain',     icon: 'bathtub'          },
  { value: 'OUTDOOR',    label: 'Extérieur',         icon: 'deck'             },
  { value: 'OTHER',      label: 'Autre',             icon: 'category'         },
];

export const QUICK_ITEMS: { category: string; label: string; details?: string }[] = [
  // Literie
  { category: 'BEDS', label: 'Lit double',  details: '160x200' },
  { category: 'BEDS', label: 'Lit double',  details: '140x190' },
  { category: 'BEDS', label: 'Lit simple',  details: '90x200'  },
  { category: 'BEDS', label: 'Lit simple',  details: '90x190'  },
  { category: 'BEDS', label: 'Canapé-lit',  details: '140x190' },
  { category: 'BEDS', label: 'Lit bébé'                        },
  // Électroménager
  { category: 'APPLIANCES', label: 'Réfrigérateur'   },
  { category: 'APPLIANCES', label: 'Lave-linge'      },
  { category: 'APPLIANCES', label: 'Lave-vaisselle'  },
  { category: 'APPLIANCES', label: 'Micro-ondes'     },
  { category: 'APPLIANCES', label: 'Four'            },
  { category: 'APPLIANCES', label: 'Sèche-linge'     },
  { category: 'APPLIANCES', label: 'Climatisation'   },
  // High-tech
  { category: 'TECH', label: 'Télévision' },
  { category: 'TECH', label: 'WiFi'       },
  // Cuisine
  { category: 'KITCHEN', label: 'Cafetière'    },
  { category: 'KITCHEN', label: 'Nespresso'    },
  { category: 'KITCHEN', label: 'Grille-pain'  },
  { category: 'KITCHEN', label: 'Bouilloire'   },
];

@Injectable({ providedIn: 'root' })
export class PropertyInventoryService {
  private base = `${environment.apiUrl}/admin/property-inventory`;

  constructor(private http: HttpClient) {}

  getAll(beds24PropertyId: string): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(this.base, { params: { beds24PropertyId } });
  }

  create(item: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(this.base, item);
  }

  update(id: number, item: Partial<InventoryItem>): Observable<InventoryItem> {
    return this.http.put<InventoryItem>(`${this.base}/${id}`, item);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
