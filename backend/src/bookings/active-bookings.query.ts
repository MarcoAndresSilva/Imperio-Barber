import { Prisma } from '../../generated/prisma/client';

/**
 * "Ocupado" = CONFIRMED (siempre cuenta) O (PENDING y todavía no expiró).
 * Se usa tanto para calcular disponibilidad como para el chequeo anti-doble-reserva
 * al crear una reserva nueva — mismo criterio en los dos lugares, a propósito.
 */
export function activeBookingsWhere(
  barberId: string,
  date: Date,
  now: Date,
): Prisma.BookingWhereInput {
  return {
    barberId,
    date,
    OR: [{ status: 'CONFIRMED' }, { status: 'PENDING', expiresAt: { gt: now } }],
  };
}
