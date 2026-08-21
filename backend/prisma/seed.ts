import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Copy real, migrado del sitio estático viejo (legacy/index.html).
const SERVICES = [
  {
    name: 'Corte Clásico',
    slug: 'corte-clasico',
    description:
      'Corte a tijera y máquina, ajustado a tu estilo, incluye lavado.',
    priceClp: 12000,
    durationMinutes: 30,
    sortOrder: 0,
  },
  {
    name: 'Corte + Barba',
    slug: 'corte-mas-barba',
    description:
      'Corte completo más perfilado y arreglo de barba con navaja.',
    priceClp: 18000,
    durationMinutes: 50,
    sortOrder: 1,
  },
  {
    name: 'Afeitado Premium',
    slug: 'afeitado-premium',
    description: 'Afeitado tradicional con toalla caliente, espuma y aceites.',
    priceClp: 14000,
    durationMinutes: 35,
    sortOrder: 2,
  },
  {
    name: 'Diseño de Barba',
    slug: 'diseno-de-barba',
    description: 'Perfilado y definición de líneas con acabado en navaja.',
    priceClp: 9000,
    durationMinutes: 20,
    sortOrder: 3,
  },
  {
    name: 'Corte Niño',
    slug: 'corte-nino',
    description:
      'Corte para los más pequeños, en un ambiente cómodo y relajado.',
    priceClp: 9000,
    durationMinutes: 25,
    sortOrder: 4,
  },
  {
    name: 'Coloración',
    slug: 'coloracion',
    description: 'Coloración y disimulo de canas con productos profesionales.',
    priceClp: 20000,
    durationMinutes: 45,
    sortOrder: 5,
  },
];

// PLACEHOLDER: nombres y WhatsApp reales de cada barbero pendientes del cliente (ver
// ARCHITECTURE.md, Paso 2). Fotos: los primeros 3 ya son reales (frontend/public/barbers/);
// falta el resto.
const REAL_PHOTOS = 3;
const BARBERS = Array.from({ length: 6 }, (_, i) => ({
  name: `Barbero ${i + 1}`,
  slug: `barbero-${i + 1}`,
  photoUrl:
    i < REAL_PHOTOS ? `barbers/barbero-${i + 1}.jpg` : `barbers/placeholder-${i + 1}.jpg`,
  whatsappPhone: `5690000000${i + 1}`,
  ratingAverage: 4.8,
  ratingCount: 0,
}));

// Lunes–Viernes 10:00–20:00, Sábado 10:00–18:00, Domingo cerrado (igual al sitio viejo / flyer).
const WEEKDAY_HOURS: Record<number, { start: number; end: number } | null> = {
  0: null,
  1: { start: 10 * 60, end: 20 * 60 },
  2: { start: 10 * 60, end: 20 * 60 },
  3: { start: 10 * 60, end: 20 * 60 },
  4: { start: 10 * 60, end: 20 * 60 },
  5: { start: 10 * 60, end: 20 * 60 },
  6: { start: 10 * 60, end: 18 * 60 },
};

async function main() {
  for (const service of SERVICES) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }

  for (const barber of BARBERS) {
    const created = await prisma.barber.upsert({
      where: { slug: barber.slug },
      update: barber,
      create: barber,
    });

    for (let weekday = 0; weekday <= 6; weekday++) {
      const hours = WEEKDAY_HOURS[weekday];
      const data = {
        isWorkingDay: hours !== null,
        startMinute: hours?.start ?? 0,
        endMinute: hours?.end ?? 0,
      };

      await prisma.barberSchedule.upsert({
        where: { barberId_weekday: { barberId: created.id, weekday } },
        update: data,
        create: { barberId: created.id, weekday, ...data },
      });
    }
  }

  console.log(
    `Seed OK: ${SERVICES.length} servicios, ${BARBERS.length} barberos (placeholder) con su horario semanal.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
