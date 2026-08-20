import { formatDateEsCl, weekdayFromDateStr, formatMinutesToHHMM } from './date.util';

describe('date.util', () => {
  it('weekdayFromDateStr: 2026-08-24 es lunes (1)', () => {
    expect(weekdayFromDateStr('2026-08-24')).toBe(1);
  });

  it('weekdayFromDateStr: 2026-08-23 es domingo (0)', () => {
    expect(weekdayFromDateStr('2026-08-23')).toBe(0);
  });

  it('formatDateEsCl: no debe correrse al día anterior por conversión de timezone', () => {
    const formatted = formatDateEsCl('2026-08-24');
    expect(formatted).toContain('lunes');
    expect(formatted).toContain('24');
    expect(formatted).not.toContain('domingo');
    expect(formatted).not.toContain('23');
  });

  it('formatMinutesToHHMM: 600 -> 10:00', () => {
    expect(formatMinutesToHHMM(600)).toBe('10:00');
  });
});
