# Arquitectura de Imperio Barber — Diario de Decisiones

Este archivo documenta, paso a paso y en orden cronológico, por qué nació este proyecto, qué problema resuelve, y el camino real de decisiones técnicas tomadas para construirlo (incluyendo los errores encontrados y cómo se resolvieron). Se actualiza con un "Paso" nuevo cada vez que se cierra un hito importante — una feature funcionando de punta a punta, una decisión de arquitectura relevante, o un problema real que costó resolver.

## Origen y problema a resolver

Imperio Barber (barbería en Santiago, Chile) tenía un sitio web estático de una sola página (`index.html` + `css/styles.css` + `js/script.js`, sin backend) con dos problemas centrales:

1. **No representaba la marca real.** Usaba una paleta dorada inventada y datos de contacto ficticios, sin relación con el logo real de la barbería ni con el flyer de servicios que efectivamente usan para promocionarse (ambos en blanco/negro/gris, con una identidad visual propia — columna jónica, tipografía serif de alto contraste).
2. **No permitía reservar hora de verdad.** El único mecanismo era un formulario genérico que armaba un mensaje y abría WhatsApp a un número fijo — sin elegir barbero, sin ver disponibilidad real, sin confirmación: el cliente escribía "a ciegas" y esperaba respuesta manual.

El objetivo de este proyecto es reconstruir el sitio desde cero con la identidad visual real de la marca, y agregar un sistema de reservas real por barbero: elegir profesional → ver su valoración → elegir servicio → ver un calendario con horarios efectivamente disponibles → reservar (bloqueando el horario) → notificar al barbero por WhatsApp con un link de un solo toque para que confirme o rechace, sin necesidad de login.

Este documento es el registro de cómo se fue construyendo esa idea en la práctica. **Nota:** el archivo de plan que usa Claude Code en `~/.claude/plans/` se sobreescribe cada vez que se entra a modo plan para una tarea nueva — no sirve como referencia permanente. Este `ARCHITECTURE.md` es la única fuente de verdad estable sobre el estado del proyecto.

---

## Estado actual y próximos pasos

*(Se actualiza cada vez que se cierra un hito — es lo primero que hay que leer al empezar una sesión nueva.)*

**✅ Completado:**
- Rebranding completo (paleta blanco/negro/gris/hueso, tipografías, logo recreado en SVG)
- Backend: modelo de datos (Barber, Service, BarberSchedule, Booking), endpoints de lectura, algoritmo de disponibilidad (horarios tomados quedan visibles, no desaparecen), creación de reservas con anti-doble-reserva, confirmación por token (aceptar/rechazar)
- Frontend: landing completa (hero, servicios, nosotros, horario) consumiendo el API real
- Frontend: sección Profesionales (grilla de barberos, panel con foto grande + calendario + horarios + formulario de reserva, con transición de fundido al cambiar de barbero)
- Frontend: página pública `/confirmar/:token` para que el barbero acepte/rechace
- 3 fotos reales de barberos cargadas (Barbero 1-3; 4-6 siguen con placeholder)
- Probado end-to-end con túnel público (demo real desde celular, con confirmación por WhatsApp)
- **Fase 1 del cierre** (Paso 23): rate limiting, health check con DB, fix de race en la confirmación, CORS que no falla en silencio, rating oculto sin reseñas, fix de `start:prod`
- **Fase 2 del cierre** (Paso 24): modelo `User`, `AuthModule` (`POST /auth/login` + JWT 8 h + `JwtAuthGuard` + `GET /auth/me`), argon2, throttle en login, script `seed:admin`
- **Fase 3 del cierre** (Paso 25): modelo `ScheduleException` (días libres) integrado a la disponibilidad, estado `CANCELLED`, `AdminModule` completo (mantenedores de reservas/barberos/servicios/horarios/días libres + reserva manual), todo protegido por `JwtAuthGuard`
- **Fase 4 del cierre** (Paso 26): **panel de administración real** — `/admin/login` + `/admin` (dashboard, reservas, barberos, servicios, horarios, cuenta), primera vez que el cierre se ve en pantalla
- **Ajustes post-Fase 4** (Paso 27, probando el panel de verdad): Reservas arranca sin filtro de fecha (antes se veía "vacía" si no había nada hoy); sección "Usuarios del panel" en Cuenta (multi-usuario, mismo rol `ADMIN` — "Opción A"); horarios candidatos cada hora en punto en vez de cada 15 min; `BookingsService.create()` ahora también rechaza fecha pasada, horario ya pasado hoy, y días libres (antes la API los aceptaba si le pegabas directo, aunque la UI ya no los ofrecía)

**⚠️ Estado del repo al cerrar esta sesión (2026-09-05):** commiteado y pusheado hasta Fases 2, 3 y 4
completas (commits `01d25c0`, `c99a03b`, `8326307` — este último ya incluye el fix del filtro de Reservas
y "Usuarios del panel"). **Sin commitear:** solo los 3 fixes de `bookings.service.ts`/`availability.ts`
(horarios cada hora + guardas de fecha pasada/día libre) — mensaje de commit sugerido al final del Paso 27.

**🔜 Próximos pasos — Plan de cierre v1** (detalle completo en la *Parte 4* de este archivo):
Terminar Imperio Barber completo y desplegado para portafolio, antes de congelarlo como base de la
plataforma multi-tenant (`../plataforma-reservas/ARCHITECTURE.md`). **El despliegue va al final** —
primero se construye todo, incluido el panel de administración.
- **Fase 5 — Datos reales + despliegue:** seed real (o placeholders limpios), Neon + `render.yaml` + `netlify.toml`, smoke test en producción.
- **Fase 6 — CI/CD + pulido de portafolio:** GitHub Actions, README con links/capturas, OG tags, Lighthouse, tests e2e. También quedó anotado ahí un detalle cosmético menor: la tabla de Reservas corta la última columna en viewports angostos sin indicar que hay scroll horizontal.

**📋 Ideas a futuro** (fuera de alcance del cierre — no construir sin que el cliente las priorice):
- Sistema de reseñas reales de clientes + ranking "mejor barbero del mes/semana" y estimación de ingresos (Paso 20)
- **"Opción B" (pedida, pospuesta a otra sesión):** cuentas por barbero con permisos acotados (cada uno ve/gestiona solo su propia agenda y horario) — hoy todos los usuarios del panel tienen el mismo rol `ADMIN` (Paso 27, "Opción A"). Requiere nuevo rol, permisos por recurso, más pantallas.
- PWA instalable + notificaciones automáticas
- Subida real de fotos a object storage (el cierre usa un campo `photoUrl` de texto) — opcional al final de la Fase 6
- Pivote a SaaS multi-tenant — ya tiene repo y roadmap propios en `../plataforma-reservas/`, deriva de este proyecto una vez cerrado

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

## Parte 3: Frontend — rebranding y landing

### Paso 15: Base del frontend — tokens de diseño, tipografías, y el componente Logo

- **Objetivo:** trasladar la identidad real (Paso 2) a Angular: paleta B/N/gris/hueso, tipografías, y una recreación del logo.
- **Tokens (`src/styles/_tokens.scss`):** custom properties CSS con la paleta real (`--color-bg`, `--color-text`, `--color-accent: #f2ede4`, etc.) — reemplaza por completo el `--gold` del sitio viejo, no quedó ningún dorado en el frontend nuevo.
- **Tipografías:** Playfair Display (serif, títulos) + Inter (sans, cuerpo) + Parisienne (script, acentos tipo firma — usada en "mereces" del hero y en la firma del footer) cargadas vía Google Fonts en `index.html`.
- **`design-system/logo/`:** componente con dos variantes — `wordmark` (texto compacto para header/footer) y `badge` (insignia circular SVG completa, aproximación a mano del sticker real — ver Paso 2, pendiente el archivo vectorial real).
- **`design-system/header/` y `design-system/footer/`:** migrados del `index.html` viejo, con el menú móvil reimplementado con un signal (`mobileMenuOpen`) en vez de manipulación directa del DOM como hacía el `script.js` original.

### Paso 16: Landing consumiendo el API real

- **Objetivo:** construir la landing (`features/landing/`: hero, servicios, nosotros, info) reutilizando el copy del sitio viejo pero con los datos reales (teléfono +56994620439, ubicación "Manzo 520", horario Lunes–Sábado) y la sección de Servicios trayendo los datos en vivo desde `GET /services` (no hardcodeados en el frontend).
- **Estado con signals:** `Servicios` usa `signal<Service[]>` + `signal<boolean>` (loading) + `signal<string|null>` (error) actualizados manualmente en el `subscribe()` de `ServicesApiService` — se evaluó `httpResource()` (la API experimental de Angular 19+) pero se optó por el patrón manual con `HttpClient`, más estable, tal como dejó anotado el plan original como fallback seguro.
- **Ruteo:** `app.routes.ts` con una sola ruta (`''`) que carga `Landing` con `loadComponent` (lazy). La ruta `/confirmar/:token` queda para la Fase 7.
- **Sección "Agendar" del sitio viejo:** no se migró — el plan la reemplaza por el flujo de reserva de Profesionales (Fase 6, siguiente). Mientras tanto, el CTA del hero y el botón flotante apuntan a WhatsApp directo con el número real, como contacto general.

### Paso 17: Verificación visual real (no solo build) — y dos bugs encontrados

Antes de dar la fase por cerrada, se instaló Chromium vía Playwright y se levantaron backend + frontend juntos para probarlo en un navegador real, no solo compilar. Esto encontró dos bugs que ni el build ni los tests unitarios habrían detectado:

- **Puertos 3000/4200 ocupados por otros proyectos del usuario en la misma máquina** (ya visto antes con 5432 y 3000 — Paso 9 y 12): este backend quedó fijo en el 3001 (ya existía) y el frontend de desarrollo se levantó en el **4201** para esta máquina.
- **Bug real: CORS bloqueaba todas las llamadas del navegador al API** — `GET /services` fallaba en el navegador (`Access-Control-Allow-Origin` seguía devolviendo `http://localhost:4200`, el valor por defecto, en vez de la URL real del frontend) aunque `curl` nunca lo detectó porque `curl` no manda cabecera `Origin` a menos que se le pida explícitamente — o sea, **CORS nunca se había ejercitado de verdad** en ninguna prueba anterior. Causa: `main.ts` leía `process.env.FRONTEND_URL` directo, pero `@nestjs/config` no copia las variables del `.env` al `process.env` global — solo quedan accesibles vía `ConfigService` (el mismo patrón que `PrismaService` ya usaba correctamente para `DATABASE_URL`). Se corrigió `main.ts` para leer `FRONTEND_URL` y `PORT` a través de `app.get(ConfigService)`, consistente con el resto del backend.
- **Verificado:** landing completa en desktop y mobile (capturas de pantalla), los 6 servicios cargando datos reales del API, y el menú móvil abriendo/cerrando correctamente.

### Paso 18: Fase 6 — sección "Profesionales" (grilla de barberos + sistema de reservas)

- **Objetivo:** la parte más importante del proyecto — que el cliente elija barbero, servicio, día y horario, y reserve, todo consumiendo el backend real (`GET /barbers`, `GET /barbers/:id/schedule`, `GET /barbers/:id/availability`, `POST /bookings`).
- **UX definida por el cliente (no la que se había propuesto por acordeón):** la grilla de los 6 barberos queda **siempre visible**; debajo hay un panel **fijo** de dos columnas (izquierda = barbero seleccionado con foto/nombre/rating, derecha = servicio + calendario + horarios + formulario) que **no se abre ni se cierra** — al cambiar de barbero simplemente cambia el contenido, con un **fundido breve (~180ms)** en vez de un cambio instantáneo, para que se sienta vivo sin mover el layout. El primer barbero y el primer servicio quedan preseleccionados apenas cargan los datos, así la columna derecha nunca aparece vacía.
- **Estado:** todo con signals locales dentro del componente contenedor `Professionals` (no se creó un servicio store aparte — el estado es de esta sección nomás). Dos `effect()`: uno recarga el horario semanal cuando cambia el barbero elegido (y dispara el fundido), otro recarga la disponibilidad cuando cambia barbero, servicio o fecha.
- **Componentes nuevos** (`features/professionals/`): `BarberCard` (tarjeta de la grilla, con fallback de iniciales si la foto placeholder no existe — `(error)` en el `<img>`), `Calendar` (grilla mensual a mano, sin librería externa; deshabilita días pasados y los días que el barbero no atiende según su horario), `TimeSlots`, `BookingForm`. Un `date.util.ts` propio del frontend, con el mismo criterio de "hora de Chile" (`Intl` + `timeZone: 'America/Santiago'`) que ya se usó en el backend, para que "hoy" y el corte de horarios coincidan con la realidad del negocio sin importar el TZ del navegador.
- **Reutilización:** se extrajo `formatClp` a `core/utils/currency.util.ts` y se actualizó `Servicios` (landing) para usarlo también, en vez de duplicar el formateo de precio.
- **Integración:** `Landing` ahora compone `<app-professionals>` entre Servicios y Nosotros; `Header`/`Footer` suman el link "Profesionales"; el CTA "Agendar cita" del header (desktop y mobile) pasó de abrir WhatsApp directo a anclar a `#profesionales`, ahora que existe un flujo de reserva real.
- **Verificación real, no solo build:** con backend + frontend levantados, se probó con Playwright el flujo completo de punta a punta — cambiar de barbero (confirmando el fundido: opacidad cae a ~0.53 a mitad de camino y vuelve a 1), elegir un horario, completar el formulario, confirmar que se abre la URL de WhatsApp correcta (número del barbero elegido, mensaje con los datos reales, link de confirmación con el token), y que ese horario **desaparece de la lista** al refrescar disponibilidad (confirma que el anti-doble-reserva y el refresh post-reserva funcionan). También se verificó el calendario en detalle: hoy resaltado, domingos deshabilitados, días pasados deshabilitados, botón "mes anterior" bloqueado en el mes actual. Probado en desktop y mobile.

### Paso 19: Primeras 3 fotos reales de barberos, y dos bugs encontrados al usarlas

- **Fotos reales:** el cliente dejó 3 fotos reales (`frontend/src/asset/`, carpeta con nombre mal escrito) — se movieron a `frontend/public/barbers/barbero-{1,2,3}.jpg` y se actualizó `backend/prisma/seed.ts` para que los primeros 3 barberos apunten a ellas (`REAL_PHOTOS = 3`), dejando el resto en `placeholder-N.jpg` hasta que lleguen más. Al re-correr el seed (`upsert` por slug), las fotos quedaron actualizadas en la base ya existente sin perder nada.
- **Bug real encontrado al probarlas:** las fotos no cargaban — el código pedía `'assets/barbers/' + photoUrl`, pero este proyecto (Angular 22, `ng new` reciente) usa la convención nueva `public/` en la raíz, no `src/assets/`, y además el campo `photoUrl` guardado en la base **ya incluye** el prefijo `barbers/` (ej. `barbers/barbero-1.jpg`) — se estaba armando una ruta doblemente mal. Se corrigió a `[src]="barber.photoUrl"` directo, sin concatenar nada, en `barber-card.html` y `professionals.html`.
- **Segundo bug encontrado de paso:** entrar directo a una URL con hash (`/#profesionales`) no scrolleaba a la sección — el navegador intenta saltar al anchor antes de que ese chunk lazy (`loadComponent`) termine de renderizar. Se agregó en `App` una suscripción a `NavigationEnd` del Router que reintenta el `scrollIntoView` después de que la navegación resuelve.

### Paso 20: Estado real del sistema de valoraciones (rating) — y la idea de "mejor barbero del mes"

- **Lo que existe hoy:** `Barber.ratingAverage`/`ratingCount` son campos fijos en la base de datos (hoy `4.8` para los 6, cargados a mano por el seed) — el frontend ya los lee de forma **dinámica** en el sentido de que pinta las estrellas según el valor real que devuelve el API (`GET /barbers`), no un número hardcodeado en el HTML. Si ese valor cambia en la base, la UI lo refleja solo con recargar, sin tocar código.
- **Lo que NO existe:** un mecanismo real para que los clientes dejen una reseña después de su cita, y cualquier cálculo de ranking ("mejor barbero del mes" y similares). Eso es una feature nueva — necesitaría un modelo `Review` (o similar), un flujo de captura (¿desde dónde deja la reseña el cliente? ¿por el mismo link de confirmación, por WhatsApp, por SMS post-cita?), y una consulta de agregación por mes. Se documenta acá como dirección futura, igual que la visión de SaaS multi-tenant (ver nota más arriba) — no se construye todavía, a la espera de que el cliente lo priorice explícitamente frente a lo que falta del flujo core (Fase 7: la página de confirmación del barbero).

### Paso 21: Demo real con túnel público (Cloudflare quick tunnel), y fix de arrastre de procesos zombis

- **Objetivo:** el cliente quería probar el flujo completo desde un celular real — abrir el link, reservar, y que el barbero (en este caso, la esposa del cliente, usada como número de prueba) apruebe desde su propio teléfono. `localhost` no sirve para eso.
- **Solución:** se instaló `cloudflared` (binario directo, sin necesidad de cuenta ni `sudo`) y se levantaron dos túneles rápidos (`cloudflared tunnel --url ...`), uno para el backend y otro para el frontend, cruzando sus URLs (`FRONTEND_URL` del backend → URL del túnel del frontend; `environment.ts` del frontend → URL del túnel del backend). Se necesitó además `ng serve --allowed-hosts` porque el servidor de desarrollo de Angular (Vite) rechaza por defecto peticiones con un `Host` que no reconoce.
- **Aclarado explícitamente al cliente:** estos túneles gratuitos de Cloudflare son para pruebas puntuales, no para dejar corriendo — pueden cortarse solos (de hecho uno se cayó y hubo que reiniciarlo), dependen de que la máquina y la sesión sigan prendidas, y la base de datos detrás sigue siendo la de Docker local. Para algo permanente hace falta el despliegue real (Neon + Render + Netlify), todavía pendiente.
- **Número de WhatsApp de prueba:** se actualizó el `whatsappPhone` de un barbero directo en la base de datos local (script temporal, no en `seed.ts`, borrado después de usarlo) para no dejar números de teléfono personales de nadie en el código ni en git.
- **Orden de la casa:** en el camino se encontraron varias instancias viejas de `nest start --watch` compitiendo por el mismo puerto (arrastradas de sesiones anteriores que no se cerraron bien) — quedó como buena práctica, antes de levantar el backend, revisar `ps aux` y matar cualquier proceso viejo antes de lanzar uno nuevo.

### Paso 22: Los horarios tomados quedan visibles (no desaparecen)

- **Pedido del cliente:** que un horario ya reservado no desaparezca de la grilla — debe seguir viéndose, pero claramente no disponible (tachado, atenuado, o con una etiqueta tipo "Tomado").
- **Cambio real de algoritmo:** `computeAvailableSlots` (`backend/src/bookings/availability.ts`) antes solo calculaba los huecos libres y devolvía slots dentro de esos huecos — los horarios ocupados simplemente no existían en la respuesta. Se reescribió para generar **todos** los horarios candidatos del día (cada 15 min, dentro del horario de trabajo) y marcar cada uno con `available: true/false` según se solape o no con una reserva activa, en vez de descartar los ocupados. Los 8 tests unitarios se actualizaron para reflejar esto (incluyendo un caso nuevo: día completamente ocupado ahora devuelve todos los slots con `available: false`, no un array vacío).
- **Frontend (`TimeSlots`):** ahora renderiza todos los slots recibidos; los no disponibles quedan deshabilitados (no clickeables), con el horario tachado y una etiqueta "Tomado" debajo, atenuados — cubre las tres variantes que el cliente dijo que le servían (tachado, etiqueta, o atenuado) usándolas juntas.
- **Verificado en vivo:** se reservó un horario real y se confirmó que sigue apareciendo en la grilla como "Tomado" tachado, en vez de desaparecer.

---

## Parte 4: Cierre para portafolio y base del SaaS

**Objetivo:** terminar Imperio Barber como proyecto **completo y desplegado**, listo para portafolio,
antes de congelarlo como base de la plataforma multi-tenant (`../plataforma-reservas/ARCHITECTURE.md`).
**El despliegue va al final** — primero se construye todo, incluido el panel de administración; recién
después se despliega, con datos placeholder si los reales de la barbería no llegan a tiempo.

### Decisiones del cierre (confirmadas 2026-09-04, no reabrir)

| # | Tema | Decisión |
|---|------|----------|
| 1 | Alcance del login del panel | **Solo el dueño, 1 cuenta rol `ADMIN`.** Los barberos siguen usando el link con token. Login por barbero = mejora futura. |
| 2 | Fotos de barberos en el panel | **v1: campo `photoUrl` de texto.** Subida real de archivos (Cloudflare R2 / Cloudinary con URL prefirmada) como último paso opcional (Fase 6). |
| 3 | CI/CD | **Incluir** GitHub Actions (lint + tests backend + build frontend en cada push). Deploy lo siguen haciendo Render/Netlify por autodeploy. |

### Fases del cierre

- **Fase 1 — Hardening y bugs (backend):** ✅ completada — ver Paso 23.
- **Fase 2 — Autenticación (backend):** ✅ completada — ver Paso 24.
- **Fase 3 — API de administración (backend):** ✅ completada — ver Paso 25.
- **Fase 4 — Panel de administración (frontend):** ✅ completada — ver Paso 26.
- **Fase 5 — Datos reales + despliegue:**
  - `seed.ts` con datos reales (nombres de pila mínimo; WhatsApp individual o uno único de la barbería como fallback; dirección "Manzo 520" completa). Si no llegan: placeholders limpios y se carga el resto por el panel.
  - **Neon**: crear proyecto → `prisma migrate deploy` → seed → `seed-admin`.
  - **Render** (backend): `render.yaml` — build `npm ci && npx prisma generate && npm run build`; preDeploy `npx prisma migrate deploy`; start `node dist/src/main`; health check `/health`; env vars (`DATABASE_URL`, `DIRECT_URL`, `FRONTEND_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BOOKING_PENDING_TTL_MINUTES`, `NODE_ENV=production`). Plan Starter (sin cold start).
  - **Netlify** (frontend): `netlify.toml` — build `npm ci && npm run build`, publish `dist/frontend/browser`, redirect SPA `/* /index.html 200`. `environment.prod.ts` con la URL real de Render.
  - Actualizar `.env.example`. **Smoke test en producción**: landing · crear reserva · llega WhatsApp · `/confirmar` · `/admin/login` · panel end-to-end.
- **Fase 6 — CI/CD + pulido de portafolio:**
  - **GitHub Actions**: en cada push/PR a `main` → backend `npm ci` + `lint` + `test`; frontend `npm ci` + `build`.
  - **README**: reemplazar "Demo en vivo 🔜" por links reales + GIF/capturas + credenciales de un usuario demo de solo lectura.
  - Meta tags OG/Twitter + `og:image` en `index.html`. Pasada de Lighthouse. Un par de tests e2e (supertest) del ciclo de reserva.
  - **Opcional**: subida real de fotos a object storage (decisión #2).

### Paso 23: Fase 1 — Hardening y bugs previos al panel de administración

- **Objetivo:** endurecer el backend antes de agregarle superficie (auth + panel), y cerrar bugs que
  habrían mordido en producción.
- **Rate limiting (`@nestjs/throttler` 6.5):** `ThrottlerModule.forRoot([{ ttl: 60s, limit: 60 }])` +
  `ThrottlerGuard` global (`APP_GUARD` en `app.module.ts`). `POST /bookings` endurecido con
  `@Throttle({ default: { limit: 5, ttl: 600s } })` — crear reservas bloquea horarios, así que se
  limita fuerte. `/health` marcado `@SkipThrottle()` (Render lo consulta seguido). Storage en memoria:
  suficiente para una sola instancia; si algún día hay más de una, migrar a storage compartido.
- **Fix de race en `accept`/`reject`** (`bookings.service.ts`): el flujo era "leo estado → si es
  PENDING, actualizo" — dos requests casi simultáneos pasaban los dos el chequeo. Se extrajo a un
  método `transition(token, to)` que hace un `updateMany({ where: { confirmationToken, status:
  'PENDING' }, data: { status: to } })` atómico y valida `count === 1`; el segundo request obtiene
  `count: 0` → 409. Se mantiene el `findByTokenOrThrow` + `applyLazyExpiration` previos para el 404 y
  el mensaje correcto cuando ya expiró.
- **`/health` con chequeo real de DB:** antes devolvía `{status:'ok'}` fijo (el proceso vive). Ahora
  `AppService.getHealth()` hace `prisma.$queryRaw\`SELECT 1\``; si falla, `503` con `{status:'error',
  db:'down'}`. Así el health check de Render detecta una DB caída.
- **CORS sin fallo silencioso** (`main.ts`): si falta `FRONTEND_URL` con `NODE_ENV=production`, ahora
  `bootstrap()` lanza error en vez de caer en silencio a `http://localhost:4200` (que dejaba el
  frontend de producción bloqueado sin ningún error visible).
- **Rating oculto sin reseñas** (`barber-card.html`, `professionals.html`): se pintaba "★ 4.8" con
  `ratingCount: 0` (valor fijo del seed, sin reseñas reales detrás). Ahora el bloque de rating solo se
  renderiza si `ratingCount > 0` — coherente con el Paso 20.
- **Bug real encontrado al probar el arranque de producción:** `npm run start:prod` era
  `node dist/main`, pero el build genera `dist/src/main.js`. Causa: `bookings.service.ts` importa el
  cliente Prisma generado desde `../../generated/prisma/client`, así que TS mete `backend/generated/`
  en el programa y la raíz común de salida pasa de `src/` a `backend/`, quedando el entrypoint en
  `dist/src/main.js`. Habría roto el arranque en Render. Corregido a `node dist/src/main`.
- **Jest — `moduleNameMapper` para el cliente Prisma generado:** agregar un test que importa
  `PrismaService` reventaba con `Cannot find module './internal/class.js'` (el mismo choque de
  extensiones `.js`→`.ts` del Paso 11, ahora en los tests — `ts-jest` no resuelve ese mapeo). Se
  agregó `"moduleNameMapper": { "^(\\.{1,2}/.*)\\.js$": "$1" }` al config de Jest en `package.json`.
  Desbloquea los tests que toquen Prisma (los de auth vienen en la Fase 2).
- **Verificación real (no solo build):**
  - `npm run build` OK · `npm test` 15/15 (se sumaron 2 tests de `/health`: DB arriba → `ok`, DB
    caída → `503`).
  - En vivo contra el backend levantado con `start:prod`: `/health` → `{status:'ok',db:'up'}` y sin
    throttle (3×200); `POST /bookings` ×8 rápido → `400 400 400 400 400 429 429 429`; token falso →
    `404`; header `X-RateLimit-Limit: 60` presente en `/barbers`.
  - Ciclo completo: crear reserva real → `accept` #1 → `200` (`CONFIRMED`) → `accept` #2 → `409`
    ("ya está en estado CONFIRMED") → `reject` → `409`. El mensaje de WhatsApp con la fecha en
    español (martes 8 de septiembre) confirmó de paso que el fix de fecha del Paso 14 sigue en pie.

### Paso 24: Fase 2 — Autenticación del panel (backend)

- **Objetivo:** darle al backend un login para el dueño, sobre el que la Fase 3 monta el `AdminModule`.
  Los barberos **no** tienen cuenta — siguen confirmando por el link con token.
- **Modelo `User`** (`prisma/schema.prisma`): `email` único, `passwordHash`, `name`, `role` (enum `Role`,
  hoy solo `ADMIN`), timestamps. Migración `20260904054530_add_user_model`.
- **`AuthModule`** (`src/auth/`):
  - `POST /auth/login` — email + password → `{ accessToken }` (JWT HS256, expira en **8 h**). Mensaje de
    error genérico ("Credenciales inválidas") exista o no el email, para no filtrar qué correos están
    registrados. `argon2.verify` envuelto en try/catch: un hash corrupto se trata como credencial
    inválida, no como 500.
  - `GET /auth/me` — protegido por `JwtAuthGuard`; devuelve el usuario que `JwtStrategy.validate` dejó
    en `request.user` (vía un `@CurrentUser()` param decorator).
  - `JwtStrategy` (`passport-jwt`) **revalida contra la BD** en cada request: si el usuario fue borrado,
    el token deja de servir aunque no haya expirado.
  - Passwords con **argon2** (`argon2.hash` en el seed, `argon2.verify` en el login).
  - `@Throttle({ limit: 5, ttl: 60s })` en `/auth/login` (anti fuerza bruta), por encima del límite
    global.
- **Bootstrap del admin:** `prisma/seed-admin.ts` (`npm run seed:admin`, corre con `tsx`) hace `upsert`
  del usuario dueño desde `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` del entorno — idempotente, sin
  credenciales en git. `JWT_SECRET` + `ADMIN_*` agregados a `.env.example`. También se agregó
  `npm run seed` como alias de `tsx prisma/seed.ts`.
- **Choque ESM (repetición del Paso 10):** `@nestjs/jwt@12` y `@nestjs/passport@12` son **ESM puro**
  (`"type": "module"`, `export * from './x.js'`) — rompían Jest (`ts-jest`/CommonJS) y contradicen la
  decisión del Paso 10 de mantener el backend en CommonJS. Se bajaron ambos a **v11** (CommonJS), que
  es lo consistente con el resto del stack. Además: `@nestjs/jwt` exige `expiresIn` como
  `ms.StringValue`, no `string` genérico → se fijó el literal `'8h'` en `JwtModule` (se descartó
  `JWT_EXPIRES_IN` configurable). Y el `@CurrentUser() user: AuthUser` en un handler decorado obligó a
  importar el tipo con `import { CurrentUser, type AuthUser }` (`isolatedModules` + `emitDecoratorMetadata`).
- **Verificación real (no solo build):**
  - `npm run build` OK · `npm test` **20/20** (5 nuevos: `AuthService` login OK / password mala / email
    inexistente; `JwtStrategy.validate` usuario existe / usuario borrado → 401).
  - `npm run seed:admin` → crea el usuario; correrlo de nuevo → lo actualiza sin duplicar.
  - En vivo: `login` con credenciales buenas → `200` + JWT (payload con `sub`/`email`/`role:ADMIN`,
    `exp = iat + 28800`); password mala → `401`; `/auth/me` sin token → `401`, con token → el usuario,
    con token basura → `401`; 5 intentos de login en un minuto → luego `429`.

### Paso 25: Fase 3 — API de administración (backend)

- **Objetivo:** darle al backend todo lo que el panel (Fase 4) necesita: gestionar reservas, barberos,
  servicios, horarios y días libres, y cargar reservas manuales (walk-in / teléfono).
- **Modelo `ScheduleException`** (`barberId`, `date` `@db.Date`, `reason?`, `@@unique([barberId, date])`)
  — día puntual en que un barbero no atiende (vacaciones, feriado, día libre), por encima de su horario
  semanal recurrente. Bloquea el **día completo**, no horas sueltas — se decidió resolverlo en
  `AvailabilityService` (tratarlo como "no hay horario ese día", igual que si no existiera fila en
  `BarberSchedule`) en vez de meter el concepto en la función pura `computeAvailableSlots` — más simple
  y no le pide nada nuevo al algoritmo ya probado.
- **Estado `CANCELLED`** agregado al enum `BookingStatus`, para cancelar desde el panel una reserva ya
  `CONFIRMED` (una `PENDING` se rechaza, no se cancela).
- **Refactor de `BookingsService`:** `accept`/`reject` (por token, flujo público) y los nuevos
  `confirmById`/`rejectById`/`cancelById` (por id, panel) comparten un único método privado
  `transition(where, from, to)` — mismo `updateMany` atómico de la Fase 1 (Paso 23), generalizado para
  aceptar `{ confirmationToken }` o `{ id }` y cualquier par de estados. `create()` ganó
  `opts.byStaff`: si viene del panel, la reserva nace `CONFIRMED` y sin `whatsappUrl` (el dueño ya sabe
  que la está cargando) — reutiliza toda la validación de horario y el anti-doble-reserva existentes,
  sin duplicar nada.
- **`AdminModule`** (`src/admin/`, todo bajo `@UseGuards(JwtAuthGuard)`, DTOs validados con
  class-validator, `PartialType` de `@nestjs/mapped-types` para los DTO de update):
  - `admin/bookings`: `GET ?date=&status=&barberId=` (con barbero+servicio embebidos), `POST` (reserva
    manual), `PATCH :id/confirm|reject|cancel`.
  - `admin/barbers`: CRUD (`DELETE` = soft, `active:false` — las reservas pasadas conservan su
    `barberId`); `GET/PUT :id/schedule` (upsert transaccional de las 7 filas, valida que cubran
    exactamente los weekdays 0-6 una vez cada uno, y que en un día laboral el inicio sea antes que el
    término); `GET/POST/DELETE :id/time-off` (CRUD de `ScheduleException`, con 409 si ya existe una
    excepción para esa fecha).
  - `admin/services`: mismo patrón CRUD que barberos.
  - A diferencia de `BarbersService`/`ServicesService` (públicos, solo activos, `select` acotado), los
    servicios de `admin/` hablan directo con `PrismaService` y devuelven el registro completo,
    incluyendo inactivos — el panel necesita poder reactivarlos y editar todos los campos.
- **Verificación real (no solo build):**
  - `npm run build` OK · `npm test` **30/30** (10 nuevos: `BookingsService` — confirmById/cancelById
    con éxito y con conflicto de estado, 404 si no existe; `AdminBarbersService` — P2002→409, rechazo
    de horario incompleto o invertido, upsert de los 7 días).
  - En vivo, con el backend recién migrado (`add_cancelled_and_schedule_exceptions`) y un token real:
    `/admin/barbers` sin token → `401`; crear barbero → `201`; slug repetido → `409`; update → `200`;
    `DELETE` → `active:false`.
  - Horario: `PUT` con 6 días → `400`; con los 7 días válidos → `200`.
  - Días libres: disponibilidad de un día real → **39 slots**; se crea el día libre → disponibilidad
    del mismo día → **0 slots**; crear el mismo día libre de nuevo → `409`; se borra → disponibilidad
    vuelve a **39 slots**.
  - Reservas: reserva manual → `CONFIRMED` con `whatsappUrl: null`; `cancel` → `CANCELLED`; `cancel` de
    nuevo → `409` ("ya está en estado CANCELLED"); reserva pública (`PENDING`, con `whatsappUrl` real) →
    el panel la `confirm` → `CONFIRMED`; intentar `reject` después → `409`.
  - Datos de prueba borrados de la base local al terminar.

### Paso 26: Fase 4 — Panel de administración (frontend)

- **Objetivo:** que el dueño pueda entrar con su cuenta y gestionar reservas, barberos, servicios,
  horarios y días libres haciendo clic, en vez de mandar requests a mano — la API ya existía desde la
  Fase 3, acá se le pone pantalla. Primer hito del cierre que se ve visualmente.
- **`AuthService`** (`core/services/auth.service.ts`, signals): `login()`, `logout()`,
  `isAuthenticated` computed, token en `localStorage` (con try/catch — sigue funcionando en memoria si
  el storage está bloqueado, solo no persiste un reload). También `me()` y `changePassword()`.
- **Endpoint nuevo que faltaba:** `PATCH /auth/password` (protegido, verifica la contraseña actual con
  argon2 antes de aceptar la nueva) — la pantalla "Cuenta" de esta fase lo necesitaba y la Fase 2 no lo
  había construido. +2 tests en `auth.service.spec.ts`.
- **`authInterceptor`** (funcional, `HttpInterceptorFn`): agrega `Authorization: Bearer` a las llamadas
  a `/admin/*` y `/auth/*`; si el backend responde `401`, limpia la sesión y manda a `/admin/login`.
  **`authGuard`** (funcional, `CanActivateFn`) protege el árbol de rutas `/admin/**`.
- **Consolidación de `date.util`:** `todayInChileStr`/`weekdayFromDateStr` se movieron a
  `core/utils/date.util.ts` (antes vivían solo en `features/professionals/date.util.ts`); ese archivo
  ahora los re-exporta desde `core/` para no tocar los imports existentes en `professionals.ts` /
  `calendar.ts` / `time-slots.ts`. Así el panel los reutiliza sin duplicar.
- **Rutas** (`app.routes.ts`): `/admin/login` (pública) y `/admin` (con `authGuard`, layout de sidebar
  `AdminShell`) con hijos `dashboard` (default), `bookings`, `barbers`, `services`, `schedule`,
  `account` — los 6 ítems del plan. `app.ts` extendió `isStandalonePage` para que `/admin/**` tampoco
  lleve el header/footer/WhatsApp flotante de la landing (mismo criterio que `/confirmar`).
- **Pantallas** (`features/admin/`), todas con signals + bindings manuales (`[value]`/`(input)`, sin
  `FormsModule`/`ReactiveFormsModule` — mismo patrón que `BookingForm`, ya establecido en el proyecto):
  - **Dashboard:** reservas de hoy + contadores (pendientes/confirmadas/otras).
  - **Reservas:** filtros (fecha/estado/barbero), tabla con confirmar/rechazar/cancelar según el
    estado, y "Nueva reserva manual" — el formulario reutiliza `BarbersApiService.findAvailability`
    (el mismo endpoint público del flujo de reserva) para ofrecer solo horarios reales, con un
    `effect()` que recarga la disponibilidad al cambiar barbero/servicio/fecha.
  - **Barberos** y **Servicios:** mismo patrón CRUD — tabla + formulario inline para crear/editar,
    "Desactivar"/"Reactivar" en vez de borrar de verdad.
  - **Horarios:** selector de barbero → grilla semanal editable (`<input type="time">`, que ya calza
    con el formato `HH:MM` de `formatMinutesToHHMM`) + gestión de días libres (agregar con fecha y
    motivo, quitar).
  - **Cuenta:** datos del usuario (`GET /auth/me`) + cambio de contraseña.
- **Estilos compartidos nuevos en `styles.scss`** (global, prefijo `admin-*`/`stat-*`/`status-pill` para
  no chocar con las clases de la landing): tarjetas, tabla, formulario en grilla, badges de estado,
  toolbar de filtros — reutilizados por las 6 pantallas en vez de repetir CSS en cada una.
- **Verificación real, no solo build** (con Playwright — Chromium ya estaba cacheado de la demo del
  Paso 21 — contra el backend y el `ng serve` levantados):
  - `npm run build` (backend y frontend) OK · backend **32/32** tests · frontend **2/2**.
  - Visual: capturas de `/admin/login`, dashboard, reservas (con el form de reserva manual abierto),
    barberos, servicios y horarios — coherentes con la identidad visual del sitio.
  - **Funcional de punta a punta, por la UI real** (no solo API): entrar sin sesión a `/admin/dashboard`
    → redirige a `/admin/login`; login real → dashboard; crear un barbero desde el formulario → aparece
    en la tabla, nace activo; editarlo, desactivarlo (queda "Inactivo"), reactivarlo; agregar un día
    libre → aparece en la lista → quitarlo; crear una reserva manual eligiendo barbero/servicio/fecha/
    horario real → aparece en la tabla como `CONFIRMED` sin WhatsApp → cancelarla → queda `CANCELLED`;
    cerrar sesión → vuelve a `/admin/login`.
  - Datos de prueba borrados de la base local al terminar.
- **Nota de pulido pendiente (Fase 6):** la tabla de Reservas, con muchas columnas, se corta
  visualmente en un viewport angosto sin indicar que hay scroll horizontal — funciona (scrollea), pero
  falta una señal visual. Anotado para la pasada de pulido, no bloquea nada.

### Paso 27: Ajustes post-Fase 4 — filtro de Reservas y multi-usuario del panel

- **Bug real encontrado usando el panel de verdad:** "Reservas" arrancaba filtrado a "hoy" — con la
  agenda vacía ese día, la tabla se veía vacía hasta apretar "Limpiar filtros", como si no hubiese
  datos. Se cambió el filtro de fecha por defecto a vacío (`filterDate = ''`): la pantalla ahora sirve
  también de histórico completo (pasado y futuro) apenas se entra. El orden se corrigió de paso —
  antes `sortedBookings` solo ordenaba por `startMinute`, mezclando fechas distintas; ahora ordena por
  `date` y después por hora.
- **Decisión de alcance (pedida por el usuario):** login multi-usuario, pero **todos con el mismo nivel
  de acceso** (rol `ADMIN`) — no cuentas por barbero con permisos acotados (esa sigue siendo la
  "Opción B", pospuesta a una próxima sesión).
- **Backend:** `AdminUsersController`/`AdminUsersService` (`src/admin/users/`, bajo `JwtAuthGuard`) —
  `GET /admin/users` (lista sin `passwordHash`), `POST /admin/users` (crea con argon2, 409 si el email
  ya existe), `DELETE /admin/users/:id` con dos resguardos: no te puedes eliminar a ti mismo, y no se
  puede eliminar si es el último usuario que queda (evitaría dejar el panel sin nadie que entre).
- **Frontend:** sección "Usuarios del panel" agregada a la pantalla **Cuenta** (no una pantalla nueva en
  el sidebar) — tabla + formulario inline para crear, con `confirm()` nativo antes de eliminar (a
  diferencia de "desactivar" barbero/servicio, acá el borrado es real, no soft-delete).
- **Verificación real:** backend build + **38/38** tests (6 nuevos de `AdminUsersService`). En vivo,
  contra el propio dev server del usuario (sin reiniciar nada — su `start:dev`/`ng serve` recompilaron
  solos al guardar): el filtro de fecha arranca vacío; aparece "Usuarios del panel"; el usuario actual
  sale marcado "(tú)" y sin botón Eliminar; se crea un segundo usuario, **se loguea de verdad con él**
  (no solo aparece en la lista), y se elimina de vuelta con el admin original. Usuario de prueba
  borrado al terminar.
- **Pedido del cliente, probando el panel:** el desplegable de horarios (público y el de la reserva
  manual del panel) se veía con demasiadas opciones — un horario 10:00-20:00 ofrecía 40 candidatos cada
  15 min. Se cambió `SLOT_STEP_MINUTES` (`bookings/availability.ts`) de `15` a `60`: ahora los horarios
  candidatos son cada hora en punto, en las dos superficies a la vez (comparten el mismo endpoint
  `GET /barbers/:id/availability`). Se actualizaron los 3 tests que dependían del paso de 15 min.
  **Verificado en vivo:** el mismo horario 10:00-20:00 ahora ofrece 10 candidatos (10:00 a 19:00) en vez
  de 40.
- **Bug real encontrado auditando `BookingsService.create()`** (pedido del usuario: revisar qué podía
  estar faltando en el panel): la creación de una reserva —tanto la pública como la manual del panel—
  nunca chequeaba los **días libres** (`ScheduleException`, Fase 3) ni que la fecha/hora no fueran
  **pasadas**. La UI ya evitaba ambos casos indirectamente (no ofrece horarios para un día libre ni
  para el pasado), pero pegándole directo a la API (`POST /bookings` o `POST /admin/bookings`) igual se
  podía crear la reserva. Se agregaron los mismos chequeos que ya usa `AvailabilityService` al leer:
  `dto.date < hoy` → 400; `dto.date === hoy && dto.startMinute < ahora` → 400; existe una
  `ScheduleException` para esa fecha → 400. **Verificado en vivo** contra el dev server del usuario:
  los 3 casos devuelven 400 con mensaje claro; se limpió el día libre de prueba usado para el tercer
  caso.

**Commit sugerido para estos 3 fixes** (`backend/src/bookings/availability.ts`,
`backend/src/bookings/availability.spec.ts`, `backend/src/bookings/bookings.service.ts`,
`ARCHITECTURE.md`):

```
fix(backend): horarios cada hora en punto + guardas de fecha pasada y día libre

- SLOT_STEP_MINUTES de 15 a 60: menos opciones (y más razonables) en el
  selector de horario, público y en la reserva manual del panel.
- BookingsService.create() ahora rechaza (400): fecha pasada, horario ya
  pasado si la fecha es hoy, y días con ScheduleException (día libre) — antes
  la API los aceptaba si se llamaba directo, aunque la UI ya no los ofrecía.
- 3 tests de availability.spec.ts actualizados al nuevo paso de 60 min.
- ARCHITECTURE.md: Paso 27 (incluye también fixes ya commiteados en 8326307:
  filtro de Reservas y "Usuarios del panel").

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_019hon2UMux6EjKH55pBYQ3M
```

_(se sigue completando a medida que se construye)_
