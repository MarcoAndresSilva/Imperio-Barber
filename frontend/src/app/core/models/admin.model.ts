import { BookingStatus } from './booking.model';

/** Barbero visto por el panel: incluye campos que el sitio público no necesita
 * (whatsappPhone, active) y a diferencia del público lista también inactivos. */
export interface AdminBarber {
  id: string;
  name: string;
  slug: string;
  photoUrl: string;
  whatsappPhone: string;
  bio: string | null;
  ratingAverage: number;
  ratingCount: number;
  active: boolean;
}

export interface AdminService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceClp: number;
  durationMinutes: number;
  sortOrder: number;
  active: boolean;
}

export interface ScheduleDay {
  weekday: number; // 0 = domingo .. 6 = sábado
  isWorkingDay: boolean;
  startMinute: number;
  endMinute: number;
}

export interface BarberScheduleRow extends ScheduleDay {
  id: string;
  barberId: string;
}

export interface ScheduleException {
  id: string;
  barberId: string;
  date: string; // ISO
  reason: string | null;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface AdminBooking {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string; // ISO
  startMinute: number;
  endMinute: number;
  priceClpSnapshot: number;
  status: BookingStatus;
  barber: { id: string; name: string; slug: string };
  service: { id: string; name: string; priceClp: number; durationMinutes: number };
}
