const CHILE_TZ = 'America/Santiago';

/**
 * El servidor (Render) corre en UTC, pero el negocio opera en hora de Chile.
 * Usamos Intl (nativo de Node, sin dependencias) para no depender del TZ del servidor.
 */
export function nowInChile(): { dateStr: string; minuteOfDay: number } {
  const now = new Date();

  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHILE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CHILE_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  return { dateStr, minuteOfDay: hour * 60 + minute };
}
