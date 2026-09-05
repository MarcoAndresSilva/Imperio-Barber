export interface CreateBookingRequest {
  barberId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  startMinute: number;
  customerName: string;
  customerPhone: string;
}

export interface CreateBookingResponse {
  bookingId: string;
  confirmationToken: string;
  expiresAt: string;
  whatsappUrl: string;
}

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface BookingDetail {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // ISO datetime
  startMinute: number;
  endMinute: number;
  priceClpSnapshot: number;
  status: BookingStatus;
  confirmationToken: string;
  expiresAt: string;
  barber: { id: string; name: string; photoUrl: string };
  service: { id: string; name: string };
}
