# Arquitectura de Imperio Barber — Diario de Decisiones

Este archivo documenta, paso a paso y en orden cronológico, por qué nació este proyecto, qué problema resuelve, y el camino real de decisiones técnicas tomadas para construirlo (incluyendo los errores encontrados y cómo se resolvieron). Se actualiza con un "Paso" nuevo cada vez que se cierra un hito importante — una feature funcionando de punta a punta, una decisión de arquitectura relevante, o un problema real que costó resolver.

## Origen y problema a resolver

Imperio Barber (barbería en Santiago, Chile) tenía un sitio web estático de una sola página (`index.html` + `css/styles.css` + `js/script.js`, sin backend) con dos problemas centrales:

1. **No representaba la marca real.** Usaba una paleta dorada inventada y datos de contacto ficticios, sin relación con el logo real de la barbería ni con el flyer de servicios que efectivamente usan para promocionarse (ambos en blanco/negro/gris, con una identidad visual propia — columna jónica, tipografía serif de alto contraste).
2. **No permitía reservar hora de verdad.** El único mecanismo era un formulario genérico que armaba un mensaje y abría WhatsApp a un número fijo — sin elegir barbero, sin ver disponibilidad real, sin confirmación: el cliente escribía "a ciegas" y esperaba respuesta manual.

El objetivo de este proyecto es reconstruir el sitio desde cero con la identidad visual real de la marca, y agregar un sistema de reservas real por barbero: elegir profesional → ver su valoración → elegir servicio → ver un calendario con horarios efectivamente disponibles → reservar (bloqueando el horario) → notificar al barbero por WhatsApp con un link de un solo toque para que confirme o rechace, sin necesidad de login.

El plan completo de arquitectura está en `/home/msilvap/.claude/plans/analiosa-primeor-los-archivos-crystalline-oasis.md` (contexto, modelo de datos, endpoints, fases). Este documento es el registro de cómo se fue construyendo esa idea en la práctica.

---

## Parte 1: Fundaciones

### Paso 1: Diagnóstico del sitio existente y alcance del proyecto

- **Objetivo:** entender qué había construido y decidir, junto con el cliente, cómo encarar la reconstrucción.
- **Hallazgo:** el sitio estático no tenía backend, base de datos, ni sistema de reservas real — solo un `wa.me` con mensaje pre-armado a un número fijo.
- **Decisiones tomadas con el cliente (no se reabren sin motivo):**
  - Envío del mensaje de reserva vía **link `wa.me` pre-llenado** (el cliente final presiona "enviar"), no la API oficial de WhatsApp Business de Meta — esa alternativa requiere cuenta verificada, número dedicado y tiene costo por mensaje, y el cliente prefirió evitarla.
  - Aprobación del barbero vía **link con token único, sin login** — más simple de construir y de usar que un panel de administración con autenticación.
  - Alcance: **un proyecto nuevo único** (no fases de negocio separadas) que descarta el sitio estático viejo pero reutiliza su copy (servicios, precios, horarios) como base de contenido.
  - Stack elegido explícitamente por el cliente: **NestJS + TypeScript + PostgreSQL** en el backend, **Angular standalone + Signals** en el frontend, desplegado en **Render** (backend), **Neon** (base de datos) y **Netlify** (frontend) — cuentas que el cliente ya tenía listas.

### Paso 2: Identidad visual real — logo y flyer

- **Objetivo:** reemplazar la paleta dorada inventada por la identidad real de la marca.
- **Insumos revisados:** `logo.jpeg` (insignia circular, fondo hueso, columna jónica, "IMPERIO" en serif de alto contraste tipo Bodoni/Didone, "BARBER FOR MEN") y `flayer servicios.jpeg` (fondo negro puro, corona, navaja de barbero, tagline "Tu estilo, nuestro imperio", datos reales de contacto).
- **Decisión de paleta:** se abandona el dorado (`--gold`) del sitio viejo; la marca real es **estrictamente blanco/negro/gris**, con el hueso del fondo del logo (`#f2ede4`) como acento cálido puntual.
- **Datos reales incorporados** (reemplazan placeholders): teléfono +56994620439, ubicación "Manzo 520", atención Lunes–Sábado.
- **Pendiente explícito:** el logo entregado es una foto de un sticker físico, no un archivo vectorial — se recreará como un lockup en SVG (ícono + wordmark) hasta que exista un archivo transparente real.

### Paso 3: Diseño de arquitectura y modelo de datos

- **Objetivo:** antes de escribir código, definir el modelo de datos y el flujo técnico completo del sistema de reservas (la parte más compleja del proyecto).
- **Resultado (documentado en el plan):** un monorepo `backend/` + `frontend/`; modelo de datos con `Barber`, `Service`, `BarberSchedule` (horario semanal recurrente) y `Booking` (con estados `PENDING/CONFIRMED/REJECTED/EXPIRED`, snapshot de precio/duración, y token único de confirmación); un algoritmo puro de disponibilidad (ventana de trabajo del barbero menos reservas activas, particionado en slots de 15 min según duración del servicio); expiración de reservas `PENDING` con estrategia híbrida (chequeo *lazy* al leer disponibilidad + cron de barrido cada 5 min); prevención de doble reserva con una transacción Prisma que revalida el slot antes de insertar.

### Paso 4: Estructura del repositorio

- **Objetivo:** dejar el repo listo para alojar dos proyectos (backend/frontend) sin perder el trabajo de diseño previo (logo, flyer, sitio viejo).
- **Implementación:** `git init` (rama `main`), sitio estático viejo + imágenes de marca movidos a `legacy/` (no se borran, quedan como referencia de copy y assets), `.gitignore` con `node_modules/`, `dist/`, `.env` y los `*.Zone.Identifier` que WSL deja al descargar archivos desde Windows.

### Paso 5: Elección de versión de Angular — 19 vs. "la más moderna"

- **Objetivo:** el cliente había pedido explícitamente Angular 19, pero también "lo más moderno posible".
- **Verificación:** `npm view @angular/cli dist-tags` mostró que la versión estable real (`latest`) ya era **Angular 22.1.4**, no la 19 — Angular saca una versión mayor cada ~6 meses y para la fecha del proyecto (agosto 2026) la 19 ya quedó dos versiones atrás.
- **Decisión (confirmada con el cliente):** usar la más moderna disponible, Angular 22, en vez de fijarse a la 19 pedida originalmente, ya que era lo coherente con el pedido de "stack lo más moderno posible".

### Paso 6: Scaffolding de backend y frontend — el bloqueo de versión de Node

- **Objetivo:** generar los proyectos base con `@nestjs/cli` (backend) y `@angular/cli` (frontend).
- **Backend:** `nest new backend` generó NestJS 11 sin problemas con el Node instalado (v20.19.2).
- **Desafío real:** `ng new frontend` con Angular 22 falló (`exit code 3`) — Angular 22 exige Node **`^22.22.3 || ^24.15.0 || >=26.0.0`**, y el Node activo en la máquina era v20.19.2, muy por debajo.
- **Solución:** la máquina ya tenía `nvm` instalado. En vez de cambiar el Node por defecto de todo el sistema (que afectaría otros proyectos del usuario, como `financial_tracker_db`), se instaló Node **22.23.1** (LTS "Jod") vía `nvm install`, acotado a este proyecto con un archivo **`.nvmrc`** en la raíz — cualquier `nvm use` dentro de esta carpeta toma automáticamente esa versión, sin tocar el default global.
- Con Node 22.23.1 activo, `ng new frontend --style=scss --routing=true --ssr=false` se generó correctamente: Angular 22, 100% standalone (ni siquiera existe ya un `app.module.ts` por defecto), y con `vitest` como test runner en vez de Karma/Jasmine.

### Paso 7: Prisma 7 y el cambio de arquitectura de conexión a la base de datos

- **Objetivo:** agregar Prisma como ORM del backend (`npx prisma init --datasource-provider postgresql`).
- **Desafío real:** al escribir el `schema.prisma` con `url = env("DATABASE_URL")` y `directUrl = env("DIRECT_URL")` en el bloque `datasource` (la forma clásica de Prisma durante años), la migración falló con `P1012`: en la versión instalada, **Prisma 7**, esas propiedades **ya no se declaran en `schema.prisma`**. Prisma 7 movió la URL usada por Migrate/introspección a `prisma.config.ts`, y para el cliente en tiempo de ejecución ahora exige un **driver adapter** explícito en el código (en vez de conectarse solo con una URL implícita).
- **Solución:**
  - `schema.prisma`: el bloque `datasource` quedó solo con `provider = "postgresql"`.
  - `prisma.config.ts`: se configuró `datasource.url = process.env.DIRECT_URL` — esta es la URL que usan las migraciones, y para Neon debe ser la conexión **directa** (sin pooler), como recomienda su propia documentación.
  - Se instalaron `@prisma/adapter-pg` y `pg` (+ `@types/pg`), que se usarán en el próximo paso para construir el `PrismaService` de NestJS conectado con la URL **pooled** (`DATABASE_URL`), reservando la URL directa exclusivamente para migraciones.
- **Lección:** con un stack "lo más moderno posible", cambios de arquitectura entre versiones mayores (no solo de API superficial) son esperables — conviene verificar contra la documentación/tipos instalados en vez de asumir que un patrón de hace 1-2 años mayores sigue vigente.

### Paso 8: Modelo de datos completo

- **Objetivo:** traducir el diseño del Paso 3 a un `schema.prisma` real.
- **Modelos:** `Barber` (con `whatsappPhone` único por barbero, `ratingAverage`/`ratingCount` fijos/editables manualmente — no se construye un sistema de reseñas, no fue pedido), `Service` (precio y duración en DB, no hardcodeados en el frontend), `BarberSchedule` (horario semanal recurrente, un row único por `barberId`+`weekday`), `Booking` (con `priceClpSnapshot` y `endMinute` calculado como snapshot al momento de crear la reserva — así un cambio futuro de precio o duración del servicio no altera reservas ya hechas; índice compuesto `[barberId, date, status]` pensado directamente para la query que arma la disponibilidad; `confirmationToken` único para el link de aprobación sin login).

### Paso 9: Base de datos de desarrollo local con Docker

- **Objetivo:** poder correr y probar migraciones sin bloquear el avance mientras el cliente prepara las credenciales reales de Neon.
- **Decisión:** Postgres local vía Docker Compose (`docker-compose.yml` en la raíz) en vez de esperar a Neon — se migrará el `.env` a la connection string real de Neon cuando esté disponible, sin tocar el modelo de datos.
- **Desafío real:** al levantar el contenedor, `docker compose up` falló — el puerto 5432 ya estaba ocupado por `financial_tracker_db`, un contenedor de **otro proyecto** del mismo usuario en esta máquina. Se verificó con `docker ps` antes de tocar nada, y se remapeó este contenedor al puerto **5433** en el host (`docker-compose.yml` y `backend/.env` actualizados), dejando el otro contenedor intacto.
- **Resultado:** `npx prisma migrate dev --name init` corrió con éxito contra `localhost:5433` — se crearon las 4 tablas (`barbers`, `services`, `barber_schedules`, `bookings`), el enum `BookingStatus`, los índices y las foreign keys, tal como estaba diseñado en el Paso 3.

---

### Nota: alcance single-tenant (decisión explícita)

El cliente planteó una visión de largo plazo para este tipo de proyectos (sitios de reserva para negocios pequeños): convertirlos en un **SaaS multi-tenant** — una sola infraestructura/código compartido (analogía del edificio de apartamentos: zonas comunes = código y servidores compartidos; cada apartamento = un tenant, con sus propios datos aislados). Se decidió explícitamente **no** llevar esa arquitectura a Imperio Barber ahora — este proyecto sigue siendo **single-tenant** (sin modelo `Tenant`, sin `tenantId` en `Barber`/`Service`/`Booking`/`BarberSchedule`). El pivote a multi-tenant queda para un **proyecto futuro aparte**, una vez que Imperio Barber esté lo bastante avanzado como para servir de base de la que derivar el modelo de tenant.

## Parte 2: Backend — endpoints y lógica de negocio

### Paso 10: `PrismaService`/`PrismaModule` — y el choque CommonJS vs. ESM del cliente generado

- **Objetivo:** exponer `PrismaClient` como provider inyectable en NestJS (`PrismaService extends PrismaClient`, con `onModuleInit`/`onModuleDestroy` llamando `$connect`/`$disconnect`), usando el driver adapter del Paso 7 (`PrismaPg`, con la URL **pooled** `DATABASE_URL` — a diferencia de `prisma.config.ts`, que usa la directa).
- **Desafío real:** el cliente que generó Prisma 7 por defecto es **ESM puro** (`import.meta.url`, `globalThis['__dirname']`), pero el backend NestJS compila como **CommonJS** (su `tsconfig.json` usa `module: "nodenext"` y el `package.json` no declara `"type": "module"`). Mezclar los dos formatos es la causa clásica del error `ERR_REQUIRE_ESM`.
- **Solución:** en vez de convertir todo el backend a ESM (más fricción conocida con Jest/decoradores de NestJS, sin beneficio real para este proyecto), se le pidió al generador de Prisma que emita CommonJS directamente: `moduleFormat = "cjs"` en el bloque `generator client` de `schema.prisma`, y se regeneró el cliente (`npx prisma generate`). Documentado como decisión consciente, no como una limitación.

### Paso 11: Primeros endpoints de lectura — `ServicesModule` y `BarbersModule`

- **Objetivo:** exponer `GET /health`, `GET /services` y `GET /barbers` / `GET /barbers/:id/schedule`, siguiendo el patrón estándar de NestJS (`Controller` → `Service`, inyectando `PrismaService`).
- **`ConfigModule.forRoot({ isGlobal: true })`** y **`ScheduleModule.forRoot()`** (este último preparado para el cron de expiración de reservas del Paso 14 en adelante, aunque todavía no tiene ningún `@Cron` real) se registraron en `AppModule` desde ahora, junto con `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`) y CORS restringido a `FRONTEND_URL` en `main.ts`.
- **Seed de datos reales:** `prisma/seed.ts` inserta los 6 servicios reales (migrados del sitio viejo) y 6 barberos **placeholder** con su horario semanal (Lunes–Viernes 10:00–20:00, Sábado 10:00–18:00, Domingo cerrado — igual al flyer). Usa `upsert` por `slug`/`barberId+weekday`, así se puede re-correr sin duplicar datos.
- **Desafío real:** correr el seed con `npx ts-node prisma/seed.ts` (la herramienta que ya traía el scaffold de NestJS) falló con `Cannot find module './internal/class.js'` — el cliente generado usa imports con extensión `.js` que en realidad apuntan a archivos `.ts` (una convención de TypeScript para `moduleResolution: nodenext` pensada para cuando el compilador `tsc` reescribe las rutas al compilar, no para ejecución directa). `ts-node` no resuelve ese mapeo `.js` → `.ts` al vuelo. **Solución:** se reemplazó `ts-node` por **`tsx`** (basado en esbuild) solo para correr el seed — resuelve esa extensión sin configuración extra y es, en la práctica, el reemplazo más usado hoy para este caso puntual. Configurado en `prisma.config.ts` → `migrations.seed`.

### Paso 12: Verificación end-to-end y otro conflicto de puerto

- **Objetivo:** levantar el backend (`npm run start:dev`) y confirmar que los endpoints responden con datos reales desde Postgres.
- **Desafío real (de nuevo, otro proyecto del mismo usuario):** igual que con el puerto 5432 de Postgres (Paso 9), el puerto **3000** — el default de NestJS — ya estaba ocupado por otro backend NestJS del usuario corriendo en esta misma máquina (confirmado porque devolvía un 404 con el formato de error estándar de Nest, pero sin ninguna de las rutas nuevas). Se movió este backend al puerto **3001** vía `PORT=3001` en `.env`, sin tocar el otro proceso.
- **Resultado:** `GET /health` → `{"status":"ok"}`; `GET /services` → los 6 servicios reales con sus precios/duraciones; `GET /barbers` → los 6 barberos placeholder; `GET /barbers/:id/schedule` → el horario semanal correcto (domingo `isWorkingDay: false`, resto de días con los minutos esperados). Todo verificado con `curl` contra el servidor real antes de darlo por cerrado.

### Paso 13: `BookingsModule` — disponibilidad, anti-doble-reserva y confirmación por token

- **Objetivo:** implementar la parte central del proyecto — calcular horarios disponibles de un barbero, crear una reserva sin que se pise con otra, y el flujo de confirmar/rechazar por link sin login.
- **Hora de Chile en un servidor que corre en UTC:** antes de tocar el algoritmo, se resolvió un problema de fondo — Render corre los procesos en UTC, pero "hoy" y "qué hora es ahora" tienen que calcularse en hora de Chile para que el corte de horarios pasados tenga sentido. Se creó `src/common/chile-time.ts`, que usa `Intl.DateTimeFormat` con `timeZone: 'America/Santiago'` (nativo de Node, sin dependencias) para obtener la fecha y minuto del día reales en Chile, sin importar el TZ del proceso.
- **Algoritmo puro (`src/bookings/availability.ts`):** función `computeAvailableSlots` sin ninguna dependencia de NestJS/Prisma — recibe el horario del día, los intervalos ocupados, la duración del servicio, y si la fecha es "hoy" + el minuto actual; devuelve los huecos libres particionados en slots cada 15 minutos que alcanzan a completar el servicio. Se probó con 8 tests unitarios (`availability.spec.ts`) cubriendo día cerrado, día sin reservas, día completamente ocupado, huecos parciales, reservas superpuestas que hay que fusionar antes de calcular huecos, y el corte por "hoy" (incluyendo el caso límite de que ya no quede tiempo hábil).
- **Criterio de "ocupado" centralizado (`active-bookings.query.ts`):** `CONFIRMED` siempre cuenta como ocupado; `PENDING` solo cuenta si no expiró (`expiresAt > now`) — este es el chequeo *lazy* de expiración. Se centralizó en una sola función (`activeBookingsWhere`) para que la disponibilidad y el chequeo anti-doble-reserva usen exactamente el mismo criterio y no diverjan con el tiempo.
- **Anti-doble-reserva:** `POST /bookings` corre dentro de una transacción Prisma con `isolationLevel: 'Serializable'` que revalida que no haya un booking activo solapado antes de insertar; si Postgres igual detecta un conflicto de escritura bajo ese aislamiento (error `P2034`), se traduce a un `409 Conflict` igual que el chequeo explícito.
- **Confirmación sin login:** `GET /bookings/confirm/:token` (idempotente, aplica el mismo chequeo lazy de expiración), `POST /bookings/confirm/:token/accept` y `/reject` — ambos rechazan con `409` si la reserva ya no está `PENDING` (evita doble-aceptación o aceptar algo ya rechazado/expirado).
- **Cron de respaldo:** `@Cron(CronExpression.EVERY_5_MINUTES)` en `BookingsService` marca `EXPIRED` cualquier `PENDING` vencido — respaldo del chequeo lazy para que el estado en la base quede correcto aunque nadie vuelva a consultar disponibilidad.
- **Ruta de disponibilidad:** se montó como `GET /barbers/:id/availability` (no dentro de `/bookings`), así que `BarbersModule` pasó a importar `BookingsModule` (que exporta `AvailabilityService`) — dependencia en un solo sentido, sin ciclos.

### Paso 14: Bug real encontrado probando el flujo completo — fecha desplazada un día en el mensaje de WhatsApp

- **Cómo se encontró:** al probar de punta a punta (disponibilidad → crear reserva → confirmar), el mensaje de WhatsApp generado para una reserva del **lunes 24 de agosto** decía **"domingo, 23 de agosto"** — un día atrás y con el día de la semana equivocado.
- **Causa:** `formatDateEsCl` tomaba la fecha (construida como medianoche UTC del día pedido, con `Date.UTC` a propósito para que `weekdayFromDateStr` fuera estable) y la formateaba pidiéndole a `Intl.DateTimeFormat` que la exprese en `timeZone: 'America/Santiago'`. Santiago está detrás de UTC, así que "medianoche UTC del 24" cae en "la tarde/noche del 23" en hora de Santiago — el formateador la corría un día hacia atrás.
- **Fix:** cambiar el `timeZone` de `formatDateEsCl` a `'UTC'` en vez de `'America/Santiago'` — como la fecha ya está construida para que sus componentes UTC (año/mes/día) sean exactamente los del string original, hay que leerla de vuelta en UTC, no reconvertirla a otro huso horario. Se agregó `date.util.spec.ts` con un test específico para este caso (fecha 2026-08-24 no debe contener "domingo" ni "23" en el resultado formateado), para que no se repita.
- **Lección:** con dos usos de timezone en el mismo módulo (uno correcto — `chile-time.ts` para "ahora" — y otro que no debía tener timezone en absoluto — formatear una fecha ya fija), es fácil aplicar el mismo patrón donde no corresponde. Se verificó con una prueba end-to-end real (`curl` contra el servidor, no solo tests unitarios) antes de dar el módulo por cerrado — así se encontró este bug, que los tests unitarios del algoritmo puro no cubrían porque no tocaban el formateo del mensaje.
- **Verificación final:** flujo completo probado con `curl` contra Postgres local — crear reserva en un horario libre, intentar crear otra que se solapa (**409 Conflict** correcto), ver por token, confirmar (**200**, pasa a `CONFIRMED`), reintentar confirmar la misma reserva (**409**, ya no está `PENDING`), y disponibilidad recalculada mostrando exactamente el hueco libre restante entre las dos reservas activas.

_(se sigue completando a medida que se construye)_
