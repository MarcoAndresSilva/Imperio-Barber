# 💈 Imperio Barber — Sistema de Reservas

Sistema de reservas online para **Imperio Barber**, barbería en Santiago de Chile. Reemplaza el sitio estático original —un `wa.me` con mensaje pre-armado a un número fijo, sin disponibilidad real— por un flujo completo por barbero: elegir profesional → ver su valoración → elegir servicio → ver calendario con horarios realmente disponibles → reservar (bloqueando el horario) → notificar al barbero por WhatsApp con un link de un solo toque para confirmar o rechazar, **sin necesidad de login**.

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 🚀 Demo en Vivo

> 🔜 **Despliegue en curso.** El proyecto todavía corre en local con Docker — el paso siguiente es Neon (DB) + Render (backend) + Netlify (frontend). Esta sección se completa con los links reales apenas quede arriba.

---

## ✨ Funcionalidades

- **Reserva por barbero, sin cuenta ni login:** grilla de los 6 barberos siempre visible, con panel fijo (foto + rating, servicio + calendario + horarios + formulario) que cambia con un fundido suave al elegir otro barbero.
- **Disponibilidad real, no simulada:** algoritmo puro que calcula los horarios libres de cada barbero según su horario semanal y sus reservas activas, particionados en slots de 15 minutos según la duración del servicio elegido.
- **Los horarios tomados quedan visibles:** un horario ya reservado no desaparece de la grilla — sigue mostrándose tachado, atenuado y con la etiqueta "Tomado", en vez de simplemente no listarse.
- **Anti-doble-reserva real:** la creación de una reserva corre dentro de una transacción Postgres `Serializable` que revalida el solapamiento antes de insertar — dos personas no pueden quedarse con el mismo horario aunque reserven al mismo tiempo.
- **Confirmación por token, sin panel de administración:** cada reserva genera un link único (`/confirmar/:token`) para que el barbero acepte o rechace desde su teléfono, sin crear cuenta ni loguearse.
- **Notificación automática por WhatsApp:** al reservar se abre un link `wa.me` pre-armado con los datos de la reserva y el link de confirmación, directo al WhatsApp del barbero elegido.
- **Expiración automática de reservas pendientes:** una reserva `PENDING` que nadie confirma libera su horario solo, con doble resguardo (chequeo al consultar disponibilidad + barrido con cron cada 5 minutos).
- **Hora de Chile calculada correctamente en el servidor:** el backend corre en UTC (Render), pero "hoy" y el corte de horarios pasados se calculan siempre en hora de Santiago, sin dependencias externas.
- **Landing con datos reales:** hero, servicios (cargados en vivo desde el API, no hardcodeados), nosotros y horario, con la identidad visual real de la marca (paleta blanco/negro/gris/hueso, logo recreado en SVG).
- **Diseño responsive**, verificado con pruebas reales en navegador (Playwright) en desktop y mobile, no solo compilación.

---

## 🛠️ Stack Tecnológico

| Área         | Tecnología                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| **Backend**  | NestJS 11, Prisma 7 (driver adapter `pg`), PostgreSQL, class-validator        |
| **Frontend** | Angular 22 (Standalone Components + Signals), SCSS                          |
| **DevOps**   | Docker Compose (DB local) · despliegue planeado en Render (API), Netlify (frontend) y Neon (DB) |

---

## 🏗️ Documentación de Arquitectura

Todo el proceso de construcción está documentado paso a paso —decisiones técnicas, alternativas descartadas, bugs reales encontrados y por qué— en **[ARCHITECTURE.md](./ARCHITECTURE.md)**. Es el diario de desarrollo completo del proyecto y la fuente de verdad sobre el estado actual; léelo antes de asumir qué está construido o qué sigue.

---

## 📂 Estructura del Proyecto

```
ImperioBarber/
├── backend/           # API NestJS + Prisma
│   ├── prisma/          # schema.prisma, migraciones, seed
│   └── src/
│       ├── barbers/       # barberos, horario semanal, disponibilidad
│       ├── bookings/       # algoritmo de disponibilidad, reservas, confirmación por token
│       ├── services/       # catálogo de servicios (precio/duración)
│       ├── prisma/         # PrismaService/PrismaModule
│       └── common/         # hora de Chile, criterio centralizado de "reserva activa"
├── frontend/          # Angular 22 (standalone)
│   └── src/app/
│       ├── design-system/  # logo, header, footer
│       ├── core/            # utils (moneda, fecha), servicios de API, modelos
│       └── features/
│           ├── landing/       # hero, servicios, nosotros, info
│           ├── professionals/ # grilla de barberos, calendario, horarios, formulario de reserva
│           └── booking-confirm/  # página pública /confirmar/:token
├── legacy/            # sitio estático original (referencia de copy/assets, no se sirve)
└── docker-compose.yml # Postgres local
```

---

## 🖥️ Cómo Empezar (Setup Local)

### Prerrequisitos

- **Node 22.23.1** — el repo trae un `.nvmrc` en la raíz; corré `nvm use` antes de instalar dependencias (no toca el Node global del sistema).
- [Docker](https://www.docker.com/) (para levantar Postgres).
- Antes de levantar backend o frontend, revisar `ps aux` por procesos de sesiones anteriores compitiendo por el mismo puerto — recurrente en esta máquina, que también corre otros proyectos en `3000`/`4200`/`5432`. Este proyecto usa `3001`/`4201`/`5433` en desarrollo local.

### 1. Base de datos

```bash
docker compose up -d
```

Levanta Postgres en `localhost:5433`.

### 2. Backend

```bash
cd backend
nvm use
npm install
cp .env.example .env      # los valores por defecto ya apuntan al Postgres local
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run start:dev
```

Queda disponible en `http://localhost:3001`.

### 3. Frontend

```bash
cd frontend
nvm use
npm install
npm start -- --port 4201
```

Queda disponible en `http://localhost:4201`.

---

## 🔑 Variables de Entorno

**`backend/.env`** — ver [`backend/.env.example`](./backend/.env.example) para la lista completa y comentada:

```env
DATABASE_URL="postgresql://user:password@host/imperio_barber?sslmode=require"   # connection string pooled
DIRECT_URL="postgresql://user:password@host/imperio_barber?sslmode=require"     # connection string directa (Prisma Migrate)
FRONTEND_URL="http://localhost:4201"    # origen permitido por CORS
BOOKING_PENDING_TTL_MINUTES=25          # minutos que una reserva PENDING bloquea el horario antes de expirar sola
```

**`frontend/src/environments/environment.ts`** — URL del API para desarrollo local (ya configurado, apunta a `http://localhost:3001`).

---

## 🔒 Autenticación

El proyecto **no tiene sistema de login** — es una decisión de diseño explícita, no una feature pendiente. La única forma de "autorización" es el **token único de confirmación** que recibe cada reserva (`Booking.confirmationToken`), usado en `/confirmar/:token` para que el barbero acepte o rechace su propia reserva desde el celular, sin crear cuenta.

---

## 🧪 Tests

```bash
# Backend (Jest)
cd backend
npm test           # unit tests
npm run test:e2e   # e2e

# Frontend (Vitest)
cd frontend
npm test
```

---

## 📋 Fuera de alcance (por ahora)

Decidido explícitamente con el cliente — no se construye sin que lo priorice primero (ver `ARCHITECTURE.md`, sección "Estado actual y próximos pasos"):

- Sistema de reseñas reales de clientes + ranking "mejor barbero del mes"
- Panel de administración (autogestión de horario, panel del dueño)
- PWA instalable + notificaciones automáticas
- Pivote a SaaS multi-tenant

---

## Licencia

Proyecto privado — todos los derechos reservados.
