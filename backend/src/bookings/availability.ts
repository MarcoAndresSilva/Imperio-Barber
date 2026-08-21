export interface BusyInterval {
  startMinute: number;
  endMinute: number;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  startMinute: number;
  endMinute: number;
}

export interface AvailabilitySlot {
  startMinute: number;
  endMinute: number;
  available: boolean;
}

const SLOT_STEP_MINUTES = 15;
const MIN_LEAD_MINUTES = 10;

function mergeBusyIntervals(
  busy: BusyInterval[],
  windowStart: number,
  windowEnd: number,
): BusyInterval[] {
  const clipped = busy
    .map((b) => ({
      startMinute: Math.max(b.startMinute, windowStart),
      endMinute: Math.min(b.endMinute, windowEnd),
    }))
    .filter((b) => b.startMinute < b.endMinute)
    .sort((a, b) => a.startMinute - b.startMinute);

  const merged: BusyInterval[] = [];
  for (const b of clipped) {
    const last = merged[merged.length - 1];
    if (last && b.startMinute <= last.endMinute) {
      last.endMinute = Math.max(last.endMinute, b.endMinute);
    } else {
      merged.push({ ...b });
    }
  }
  return merged;
}

/**
 * Función pura: calcula TODOS los horarios candidatos de un barbero para un día
 * (cada 15 min, dentro de su horario de trabajo), marcando cuáles ya están
 * ocupados por una reserva activa — no los descarta, para que el frontend pueda
 * mostrarlos igual (deshabilitados) en vez de hacerlos desaparecer. No toca la
 * base de datos ni conoce nada de NestJS/Prisma.
 */
export function computeAvailableSlots(params: {
  schedule: DaySchedule;
  busy: BusyInterval[];
  serviceDurationMinutes: number;
  isToday: boolean;
  nowMinute: number;
}): AvailabilitySlot[] {
  const { schedule, busy, serviceDurationMinutes, isToday, nowMinute } = params;

  if (!schedule.isWorkingDay) return [];

  const windowStart = isToday
    ? Math.max(schedule.startMinute, nowMinute + MIN_LEAD_MINUTES)
    : schedule.startMinute;
  const windowEnd = schedule.endMinute;

  if (windowStart >= windowEnd) return [];

  const merged = mergeBusyIntervals(busy, windowStart, windowEnd);

  const slots: AvailabilitySlot[] = [];
  let start = Math.ceil(windowStart / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
  while (start + serviceDurationMinutes <= windowEnd) {
    const end = start + serviceDurationMinutes;
    const overlapsBusy = merged.some((b) => start < b.endMinute && end > b.startMinute);
    slots.push({ startMinute: start, endMinute: end, available: !overlapsBusy });
    start += SLOT_STEP_MINUTES;
  }

  return slots;
}
