// `todayInChileStr`/`weekdayFromDateStr` viven en core/utils (Fase 4): el panel de
// administración también los necesita. Acá quedan solo los re-exports para no tener
// que tocar los imports de `professionals.ts`/`calendar.ts`/`time-slots.ts`.
export {
  formatMinutesToHHMM,
  todayInChileStr,
  weekdayFromDateStr,
} from '../../core/utils/date.util';

export interface CalendarCell {
  dateStr: string;
  day: number;
  inCurrentMonth: boolean;
  isPast: boolean;
}

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Grilla de semanas (lunes a domingo) para el mes dado, con días de relleno de los meses vecinos. */
export function buildMonthGrid(year: number, month: number, todayStr: string): CalendarCell[][] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // getUTCDay(): 0=domingo..6=sábado -> lo convertimos a offset lunes=0..domingo=6
  const firstWeekday = (firstOfMonth.getUTCDay() + 6) % 7;

  const cells: CalendarCell[] = [];

  const prevMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = toDateStr(prevYear, prevMonth, day);
    cells.push({ dateStr, day, inCurrentMonth: false, isPast: dateStr < todayStr });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toDateStr(year, month, day);
    cells.push({ dateStr, day, inCurrentMonth: true, isPast: dateStr < todayStr });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = toDateStr(nextYear, nextMonth, nextDay);
    cells.push({ dateStr, day: nextDay, inCurrentMonth: false, isPast: dateStr < todayStr });
    nextDay++;
  }

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
