export type SenderType = 'GUEST' | 'HOST';

export interface Message {
  id?: number;
  bookingId: number;
  sender: SenderType;
  content: string;
  read?: boolean;
  createdAt?: string;
}
