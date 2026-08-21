export interface Barber {
  id: string;
  name: string;
  slug: string;
  photoUrl: string;
  bio: string | null;
  ratingAverage: number;
  ratingCount: number;
}

export interface BarberSchedule {
  id: string;
  barberId: string;
  weekday: number; // 0 = domingo .. 6 = sábado
  isWorkingDay: boolean;
  startMinute: number;
  endMinute: number;
}
