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
}

const SLOT_STEP_MINUTES = 15;
const MIN_LEAD_MINUTES = 10;

/**
 * Función pura: calcula los horarios disponibles de un barbero para un día,
 * dado su horario de trabajo, las reservas activas de ese día, y la duración
 * del servicio elegido. No toca la base de datos ni conoce nada de NestJS/Prisma.
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

  const gaps: AvailabilitySlot[] = [];
  let cursor = windowStart;
  for (const b of merged) {
    if (b.startMinute > cursor) {
      gaps.push({ startMinute: cursor, endMinute: b.startMinute });
    }
    cursor = Math.max(cursor, b.endMinute);
  }
  if (cursor < windowEnd) {
    gaps.push({ startMinute: cursor, endMinute: windowEnd });
  }

  const slots: AvailabilitySlot[] = [];
  for (const gap of gaps) {
    let start = Math.ceil(gap.startMinute / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
    while (start + serviceDurationMinutes <= gap.endMinute) {
      slots.push({ startMinute: start, endMinute: start + serviceDurationMinutes });
      start += SLOT_STEP_MINUTES;
    }
  }

  return slots;
}
