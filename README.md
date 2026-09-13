# 💈 Imperio Barber — Sistema de Reservas + Panel de Administración

Sistema de reservas online para **Imperio Barber**, barbería en Santiago de Chile. Reemplaza el sitio estático original —un `wa.me` con mensaje pre-armado a un número fijo, sin disponibilidad real— por un flujo completo por barbero: elegir profesional → ver su valoración → elegir servicio → ver calendario con horarios realmente disponibles → reservar (bloqueando el horario) → notificar al barbero por WhatsApp con un link de un solo toque para confirmar o rechazar, **sin necesidad de login del cliente**. Incluye además un **panel de administración** con login real para que el dueño gestione reservas, barberos, servicios y horarios sin tocar la base de datos a mano.

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Deploy](https://img.shields.io/badge/Deploy-Netlify%20%2B%20Render%20%2B%20Neon-1a1a1a)](#-demo-en-vivo)

---

## 🚀 Demo en Vivo

El proyecto está **desplegado y funcionando en producción**:

- 🌐 **Sitio público:** [imperio-barber.netlify.app](https://imperio-barber.netlify.app)
- 🔌 **API:** [imperio-barber-api.onrender.com](https://imperio-barber-api.onrender.com) (Render plan free — la primera request puede demorar ~50s por cold start, es una demo de portafolio)
- 🎬 **Video demo completo** (reserva pública → WhatsApp → confirmación del barbero → panel de administración): [`demo-imperio-barber.mp4`](./demo-imperio-barber.mp4)

> El panel de administración (`/admin/login`) requiere una cuenta real — no hay credenciales públicas de prueba por ahora (solo existe un rol con permisos totales, ver [Autenticación](#-autenticación)). Las capturas de abajo y el video muestran su funcionamiento completo.

---

## 📸 Capturas

| Landing | Reserva por barbero |
|---|---|
| ![Landing](./docs/screenshots/landing.png) | ![Profesionales](./docs/screenshots/profesionales.png) |

| Panel — Dashboard | Panel — Barberos |
|---|---|
| ![Dashboard](./docs/screenshots/admin-dashboard.png) | ![Barberos](./docs/screenshots/admin-barbers.png) |

---

## ✨ Funcionalidades

**Sitio público**
- **Reserva por barbero, sin cuenta ni login:** grilla de los 6 barberos siempre visible, con panel fijo (foto + rating, servicio + calendario + horarios + formulario) que cambia con un fundido suave al elegir otro barbero.
- **Disponibilidad real, no simulada:** algoritmo puro que calcula los horarios libres de cada barbero según su horario semanal, sus reservas activas y sus días libres puntuales, particionados en slots según la duración del servicio elegido.
- **Los horarios tomados quedan visibles:** un horario ya reservado no desaparece de la grilla — sigue mostrándose tachado, atenuado y con la etiqueta "Tomado".
- **Anti-doble-reserva real:** la creación de una reserva corre dentro de una transacción Postgres `Serializable` que revalida el solapamiento antes de insertar.
- **Confirmación por token, sin login del barbero:** cada reserva genera un link único (`/confirmar/:token`) para que el barbero acepte o rechace desde su teléfono.
- **Notificación automática por WhatsApp:** al reservar se abre un link `wa.me` pre-armado con los datos de la reserva y el link de confirmación.
- **Expiración automática de reservas pendientes:** doble resguardo (chequeo al consultar disponibilidad + cron cada 5 minutos).
- **Hora de Chile calculada correctamente en el servidor:** el backend corre en UTC (Render), pero "hoy" y el corte de horarios pasados se calculan siempre en hora de Santiago.

**Panel de administración** (`/admin`, con login JWT)
- **Dashboard** con reservas de hoy, contadores por estado, e **ingresos del mes y servicio más pedido** (calculados en vivo sobre reservas confirmadas).
- **Reservas:** filtrar por fecha/estado/barbero, confirmar/rechazar/cancelar, cargar reservas manuales (walk-in o teléfono).
- **Barberos y Servicios:** CRUD completo, con subida de fotos directa a **Cloudinary** (firma generada en el backend, el archivo va directo del navegador a Cloudinary, sin pasar por el servidor).
- **Horarios:** editar el horario semanal de cada barbero y cargar días libres puntuales (vacaciones, feriados).
- **Cuenta:** cambiar contraseña, administrar usuarios del panel.

---

## 🛠️ Stack Tecnológico

| Área         | Tecnología                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| **Backend**  | NestJS 11, Prisma 7 (driver adapter `pg`), PostgreSQL, class-validator, JWT (passport-jwt) + argon2 |
| **Frontend** | Angular 22 (Standalone Components + Signals), SCSS                          |
| **Deploy**   | Netlify (frontend) · Render (API, plan free) · Neon (Postgres serverless) · Cloudinary (fotos) |
| **DevOps**   | Docker Compose (DB local), Playwright (verificación end-to-end real, no solo build) |

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
│       ├── admin/         # panel: reservas, barberos, servicios, horarios, usuarios, dashboard, uploads
│       ├── auth/          # login JWT, guard, estrategia
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
│           ├── booking-confirm/  # página pública /confirmar/:token
│           └── admin/         # login + dashboard, reservas, barberos, servicios, horarios, cuenta
├── legacy/            # sitio estático original (referencia de copy/assets, no se sirve)
├── docs/screenshots/  # capturas usadas en este README
└── docker-compose.yml # Postgres local
```

---

## 🖥️ Cómo Empezar (Setup Local)

### Prerrequisitos

- **Node 22.23.1** — el repo trae un `.nvmrc` en la raíz; corré `nvm use` antes de instalar dependencias (no toca el Node global del sistema).
- [Docker](https://www.docker.com/) (para levantar Postgres localmente).
- Antes de levantar backend o frontend, revisar `ps aux` por procesos de sesiones anteriores compitiendo por el mismo puerto. Este proyecto usa `3001`/`4201`/`5433` en desarrollo local (para no chocar con otros proyectos en `3000`/`4200`/`5432`).

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
npx tsx prisma/seed-admin.ts   # crea el usuario ADMIN del panel, usando ADMIN_EMAIL/ADMIN_PASSWORD del .env
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

Queda disponible en `http://localhost:4201` (sitio público) y `http://localhost:4201/admin/login` (panel).

---

## 🔑 Variables de Entorno

**`backend/.env`** — ver [`backend/.env.example`](./backend/.env.example) para la lista completa y comentada:

```env
DATABASE_URL="postgresql://user:password@host/imperio_barber?sslmode=require"   # connection string pooled
DIRECT_URL="postgresql://user:password@host/imperio_barber?sslmode=require"     # connection string directa (Prisma Migrate)
FRONTEND_URL="http://localhost:4201"    # origen permitido por CORS
BOOKING_PENDING_TTL_MINUTES=25          # minutos que una reserva PENDING bloquea el horario antes de expirar sola
JWT_SECRET="..."                        # firma de los tokens del panel
ADMIN_EMAIL="..."                       # cuenta que crea `seed-admin.ts`
ADMIN_PASSWORD="..."
CLOUDINARY_CLOUD_NAME="..."             # subida de fotos de barberos
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

**`frontend/src/environments/environment.ts`** — URL del API para desarrollo local (ya configurado, apunta a `http://localhost:3001`).

---

## 🔒 Autenticación

Dos mecanismos separados, a propósito:

- **Cliente final:** no necesita cuenta. La única "autorización" es el **token único de confirmación** que recibe cada reserva (`Booking.confirmationToken`), usado en `/confirmar/:token` para que el barbero acepte o rechace su propia reserva desde el celular.
- **Panel de administración:** login real con JWT (`POST /auth/login`, token de 8h, passwords con `argon2`). Hoy existe **un solo rol** (`ADMIN`, permisos totales) — cualquier usuario del panel puede editar todo. Cuentas por barbero con permisos acotados a su propia agenda está identificado como mejora futura (ver `ARCHITECTURE.md`).

---

## 🧪 Tests

```bash
# Backend (Jest)
cd backend
npm test           # unit tests

# Frontend
cd frontend
npm test
```

---

## 📋 Fuera de alcance (por ahora)

Decidido explícitamente con el cliente — no se construye sin que lo priorice primero (ver `ARCHITECTURE.md`, sección "Estado actual y próximos pasos"):

- Sistema de reseñas reales de clientes + ranking "mejor barbero del mes"
- Tasa de asistencia/no-show real (requiere un estado nuevo en `Booking`, no existe hoy)
- Cuentas por barbero con permisos acotados a su propia agenda
- Bot de WhatsApp con IA conversacional, cobro de abonos online, micrositio autogenerado por negocio — quedan como base para un futuro pivote a SaaS multi-tenant, no para este proyecto
- PWA instalable + notificaciones automáticas

---

## Licencia

Proyecto privado — todos los derechos reservados.
