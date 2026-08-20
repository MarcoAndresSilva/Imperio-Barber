export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceClp: number;
  durationMinutes: number;
}
