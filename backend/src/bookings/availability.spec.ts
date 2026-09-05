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

  it('día laboral sin reservas: genera slots cada hora en punto, todos disponibles', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [],
      serviceDurationMinutes: 30,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots[0]).toEqual({ startMinute: 600, endMinute: 630, available: true }); // 10:00
    expect(slots[1]).toEqual({ startMinute: 660, endMinute: 690, available: true }); // 11:00
    expect(slots[slots.length - 1]).toEqual({ startMinute: 1140, endMinute: 1170, available: true }); // 19:00
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it('día completamente ocupado: los horarios siguen apareciendo, todos marcados no disponibles (no desaparecen)', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [{ startMinute: 600, endMinute: 1200 }],
      serviceDurationMinutes: 30,
      isToday: false,
      nowMinute: 0,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.available === false)).toBe(true);
  });

  it('hueco parcial: los horarios ocupados quedan en la lista marcados no disponibles, no se descartan', () => {
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

    const available = slots.filter((s) => s.available);
    const taken = slots.filter((s) => !s.available);

    expect(available.length).toBeGreaterThan(0);
    expect(taken.length).toBeGreaterThan(0);
    expect(available.every((s) => s.startMinute >= 660 && s.endMinute <= 900)).toBe(true);
    // El primer y el último candidato del día caen dentro de un tramo ocupado.
    expect(slots[0].available).toBe(false);
    expect(slots[slots.length - 1].available).toBe(false);
  });

  it('reservas superpuestas se fusionan correctamente al marcar disponibilidad', () => {
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [
        { startMinute: 600, endMinute: 700 },
        { startMinute: 650, endMinute: 750 }, // se superpone con la anterior -> fusionado 600-750
      ],
      serviceDurationMinutes: 30,
      isToday: false,
      nowMinute: 0,
    });

    // Con slots cada hora (600, 660, 720, 780…), el primero que cae fuera del
    // tramo ocupado fusionado (600-750) es el de las 13:00 (780).
    const firstAvailable = slots.find((s) => s.available);
    expect(firstAvailable?.startMinute).toBe(780);
    expect(slots.filter((s) => s.startMinute < 780).every((s) => !s.available)).toBe(true);
  });

  it('corte por "hoy": no ofrece horarios que ya pasaron ni dentro del margen mínimo', () => {
    // Son las 14:32 (872 min) -> nada antes de 14:42, redondeado a la próxima hora en punto -> 15:00
    const slots = computeAvailableSlots({
      schedule: FULL_DAY,
      busy: [],
      serviceDurationMinutes: 30,
      isToday: true,
      nowMinute: 14 * 60 + 32,
    });

    expect(slots[0]).toEqual({ startMinute: 900, endMinute: 930, available: true }); // 15:00
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
