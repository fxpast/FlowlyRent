export type InvoiceStatus   = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
export type InvoiceLineType = 'BOOKING' | 'CLEANING' | 'TOURIST_TAX' | 'CUSTOM';

export interface InvoiceLine {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineType: InvoiceLineType;
  sortOrder: number;
}

export interface Invoice {
  id?: number;
  invoiceNumber?: string;
  invoiceYear?: number;
  invoiceSeq?: number;
  beds24BookingId?: string;
  beds24PropertyId?: string;
  guestName?: string;
  guestEmail?: string;
  guestAddress?: string;
  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  notes?: string;
  lines: InvoiceLine[];
  createdAt?: string;
  updatedAt?: string;
}
