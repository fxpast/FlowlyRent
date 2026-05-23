export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'FAILED' | 'CANCELLED';

export interface Payment {
  id: number;
  bookingId?: number;
  amount: number;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  currency?: string;
  paidAt?: string;
  createdAt?: string;
}
