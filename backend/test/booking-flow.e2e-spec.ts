import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface BookingResponseBody {
  status: string;
  whatsappUrl: string | null;
  confirmationToken: string;
}

/**
 * Cubre el ciclo completo de una reserva contra una base real (no mocks):
 * disponibilidad -> crear -> anti-doble-reserva -> confirmar por token -> re-confirmar (409).
 * Usa un barbero/servicio propios (slug/whatsapp únicos con timestamp) para no chocar
 * con datos del seed ni con otra corrida en paralelo, y los borra al terminar.
 */
describe('Ciclo de reserva (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const barberId = randomUUID();
  const serviceId = randomUUID();
  const suffix = Date.now();
  const dateStr = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  })();
  const START_MINUTE = 600; // 10:00 — múltiplo de SLOT_STEP_MINUTES (60)

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.barber.create({
      data: {
        id: barberId,
        name: 'Barbero E2E',
        slug: `e2e-barbero-${suffix}`,
        photoUrl: '',
        whatsappPhone: `569${suffix}`.slice(0, 11),
        active: true,
      },
    });
    await prisma.service.create({
      data: {
        id: serviceId,
        name: 'Servicio E2E',
        slug: `e2e-servicio-${suffix}`,
        priceClp: 10000,
        durationMinutes: 30,
        active: true,
      },
    });
    // Abierto los 7 días, todo el día, para no depender de qué weekday caiga la fecha de prueba.
    await prisma.barberSchedule.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({
        barberId,
        weekday,
        isWorkingDay: true,
        startMinute: 0,
        endMinute: 1440,
      })),
    });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { barberId } });
    await prisma.barberSchedule.deleteMany({ where: { barberId } });
    await prisma.barber.delete({ where: { id: barberId } });
    await prisma.service.delete({ where: { id: serviceId } });
    await app.close();
  });

  it('GET /health responde ok con la base arriba', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  it('GET /barbers incluye el barbero recién creado', async () => {
    const res = await request(app.getHttpServer()).get('/barbers');
    expect(res.status).toBe(200);
    expect(
      (res.body as Array<{ id: string }>).some((b) => b.id === barberId),
    ).toBe(true);
  });

  it('GET /barbers/:id/availability muestra el horario elegido como disponible', async () => {
    const res = await request(app.getHttpServer())
      .get(`/barbers/${barberId}/availability`)
      .query({ date: dateStr, serviceId });

    expect(res.status).toBe(200);
    const slot = (
      res.body as Array<{ startMinute: number; available: boolean }>
    ).find((s) => s.startMinute === START_MINUTE);
    expect(slot).toBeDefined();
    expect(slot?.available).toBe(true);
  });

  let confirmationToken: string;

  it('POST /bookings crea una reserva PENDING con link de WhatsApp', async () => {
    const res = await request(app.getHttpServer()).post('/bookings').send({
      barberId,
      serviceId,
      date: dateStr,
      startMinute: START_MINUTE,
      customerName: 'Cliente E2E',
      customerPhone: '+56911112222',
    });

    expect(res.status).toBe(201);
    const body = res.body as BookingResponseBody;
    expect(body.status).toBe('PENDING');
    expect(body.whatsappUrl).toContain('https://wa.me/');
    expect(typeof body.confirmationToken).toBe('string');
    confirmationToken = body.confirmationToken;
  });

  it('POST /bookings en el mismo horario devuelve 409 (anti-doble-reserva)', async () => {
    const res = await request(app.getHttpServer()).post('/bookings').send({
      barberId,
      serviceId,
      date: dateStr,
      startMinute: START_MINUTE,
      customerName: 'Otro Cliente',
      customerPhone: '+56933334444',
    });

    expect(res.status).toBe(409);
  });

  it('ese horario ya no aparece disponible tras la reserva', async () => {
    const res = await request(app.getHttpServer())
      .get(`/barbers/${barberId}/availability`)
      .query({ date: dateStr, serviceId });

    const slot = (
      res.body as Array<{ startMinute: number; available: boolean }>
    ).find((s) => s.startMinute === START_MINUTE);
    expect(slot?.available).toBe(false);
  });

  it('GET /bookings/confirm/:token devuelve la reserva pendiente', async () => {
    const res = await request(app.getHttpServer()).get(
      `/bookings/confirm/${confirmationToken}`,
    );
    expect(res.status).toBe(200);
    expect((res.body as BookingResponseBody).status).toBe('PENDING');
  });

  it('POST /bookings/confirm/:token/accept confirma la reserva', async () => {
    const res = await request(app.getHttpServer()).post(
      `/bookings/confirm/${confirmationToken}/accept`,
    );
    expect(res.status).toBe(200);
    expect((res.body as BookingResponseBody).status).toBe('CONFIRMED');
  });

  it('confirmar de nuevo devuelve 409 (ya no está PENDING)', async () => {
    const res = await request(app.getHttpServer()).post(
      `/bookings/confirm/${confirmationToken}/accept`,
    );
    expect(res.status).toBe(409);
  });

  it('confirmar un token inexistente devuelve 404', async () => {
    const res = await request(app.getHttpServer()).get(
      '/bookings/confirm/token-que-no-existe',
    );
    expect(res.status).toBe(404);
  });
});
