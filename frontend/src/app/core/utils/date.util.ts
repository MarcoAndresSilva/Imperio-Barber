export function formatMinutesToHHMM(minute: number): string {
  const h = Math.floor(minute / 60)
    .toString()
    .padStart(2, '0');
  const m = (minute % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Acepta "YYYY-MM-DD" o un ISO datetime completo (usa solo la parte de fecha). */
export function formatDateEsCl(dateStr: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  // UTC de punta a punta: evita que el timezone del navegador corra la fecha un día
  // (mismo criterio que backend/src/bookings/date.util.ts).
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
