/**
 * Todas estas funciones trabajan con el string "YYYY-MM-DD" tal cual llega del
 * cliente/frontend, usando Date.UTC para evitar que el timezone del servidor
 * (Render corre en UTC) desplace el día calendario en ningún cálculo.
 */

export function weekdayFromDateStr(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function dateFromDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatMinutesToHHMM(minute: number): string {
  const h = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0');
  const m = (minute % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDateEsCl(dateStr: string): string {
  const date = dateFromDateStr(dateStr);
  // timeZone: 'UTC' (no 'America/Santiago'): `date` ya es una medianoche UTC que
  // codifica exactamente el Y/M/D del string — convertirla a hora de Santiago acá
  // la haría retroceder al día anterior (Santiago va detrás de UTC).
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
