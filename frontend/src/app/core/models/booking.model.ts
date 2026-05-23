export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type BookingSource = 'DIRECT' | 'BOOKING_COM' | 'AIRBNB' | 'ABRITEL';
export type Platform = 'BOOKING_COM' | 'AIRBNB' | 'ABRITEL';

export interface Guest {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  language?: string;
}

export interface Property {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  maxGuests?: number;
  pricePerNight?: number;
  cleaningFee?: number;
  images?: string[];
  active?: boolean;
}

export interface PropertySummary {
  id: number;
  name: string;
  address?: string;
  city?: string;
}

export interface PaymentSummary {
  id: number;
  status: string;
  amount: number;
  paidAt?: string;
}

export interface Booking {
  id?: number;
  confirmationCode?: string;
  property?: PropertySummary;
  guest?: Guest;
  checkIn: string;
  checkOut: string;
  nightsCount?: number;
  guestCount?: number;
  status?: BookingStatus;
  source?: BookingSource;
  totalAmount?: number;
  notes?: string;
  createdAt?: string;
  payment?: PaymentSummary;
}

export interface BookingRequest {
  propertyId: number;
  guest: Guest;
  checkIn: string;
  checkOut: string;
  guestCount?: number;
  totalAmount?: number;
  source?: BookingSource;
  notes?: string;
}

export interface Channel {
  id?: number;
  platform: Platform;
  propertyId: number;
  icalUrl?: string;
  apiKey?: string;
  active?: boolean;
  lastSync?: string;
  lastSyncBookingsCount?: number;
  lastSyncStatus?: string;
}
