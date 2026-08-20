import { computeAvailableSlots } from './availability';

const FULL_DAY = { isWorkingDay: true, startMinute: 600, endMinute: 1200 }; // 10:00-20:00

describe('computeAvailableSlots', () => {
  it('día no laboral: no devuelve ningún horario', () => {
    const slots = computeAvailableSlots({
      schedule: { isWorkingDay: false, startMinute: 0, endMinute: 0 },
      busy: [],
      serviceDurationMinutes: 30,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots).toEqual([]);
  });

  it('día laboral sin reservas: genera slots cada 15 min que alcanzan la duración', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [],
      serviceDurationMinutes: 30,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots[0]).toEqual({ startMinute: 600, endMinute: 630 });
    expect(slots[1]).toEqual({ startMinute: 615, endMinute: 645 });
    expect(slots[slots.length - 1]).toEqual({ startMinute: 1170, endMinute: 1200 });
  });

  it('día completamente ocupado: no devuelve horarios', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [{ startMinute: 600, endMinute: 1200 }],
      serviceDurationMinutes: 30,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots).toEqual([]);
  });

  it('hueco parcial: solo ofrece slots que caben en el espacio libre', () => {
    // Ocupado 10:00-11:00 y 15:00-20:00 -> libre 11:00-15:00
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [
        { startMinute: 600, endMinute: 660 },
        { startMinute: 900, endMinute: 1200 },
      ],
      serviceDurationMinutes: 60,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots[0]).toEqual({ startMinute: 660, endMinute: 720 });
    expect(slots[slots.length - 1]).toEqual({ startMinute: 840, endMinute: 900 });
    expect(slots.every((s) => s.startMinute >= 660 && s.endMinute <= 900)).toBe(true);
  });

  it('reservas superpuestas se fusionan correctamente antes de calcular huecos', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [
        { startMinute: 600, endMinute: 700 },
        { startMinute: 650, endMinute: 750 }, // se superpone con la anterior
      ],
      serviceDurationMinutes: 30,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots[0].startMinute).toBe(750);
  });

  it('corte por "hoy": no ofrece horarios que ya pasaron ni dentro del margen mínimo', () => {
    // Son las 14:32 (872 min) -> nada antes de 14:42, redondeado a slot de 15 min -> 14:45
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [],
      serviceDurationMinutes: 30,
      isToday: true,
      nowMinute: 14 * 60 + 32,
    });

    expect(slots[0]).toEqual({ startMinute: 885, endMinute: 915 }); // 14:45
  });

  it('corte por "hoy" cuando ya no queda tiempo hábil en el día: no devuelve horarios', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [],
      serviceDurationMinutes: 30,
      isToday: true,
      nowMinute: 19 * 60 + 55, // 19:55, casi cerrando a las 20:00
    });

    expect(slots).toEqual([]);
  });

  it('ningún slot puede empezar antes del horario de apertura ni terminar después del cierre', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [],
      serviceDurationMinutes: 50,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots.every((s) => s.startMinute >= FULL_DAY.startMinute)).toBe(true);
    expect(slots.every((s) => s.endMinute <= FULL_DAY.endMinute)).toBe(true);
  });
});
