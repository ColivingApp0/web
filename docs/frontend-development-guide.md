# Guía de desarrollo del frontend — ColivinApp

> **Actualizada para el modelo de renta mensual de habitaciones.** La fuente de
> verdad funcional es `api/` y los controladores reales; este documento describe
> las convenciones del cliente Angular. Si algo aquí contradice el código, prevalece
> el código y esta guía se corrige.
>
> **Importante:** la aplicación ya **no** alquila por noches. No hay calendarios,
> fechas de entrada/salida, tarifas nocturnas ni cálculos de estancia. Toda la UI
> usa precio **mensual**, capacidad, ocupación y plazas disponibles.

## 1. Stack y estructura

- Angular 22 standalone y zoneless, TypeScript estricto, Tailwind CSS **v4 CSS-first**, Vitest.
- Backend Kotlin/Spring modular en `api/`, API REST en `/api/v1`, token opaco `Bearer`.
- Estructura feature-first alineada a los contextos del backend:

```text
src/app/
├── core/        # sesión, interceptores, errores, configuración de API
├── layout/      # shells (autenticado, auth)
├── shared/      # UI/utilidades sin dominio con ≥2 consumidores reales
└── features/
    ├── marketing/ auth/ profile/ directory/
    ├── listings/  # explorar, propiedad, habitación, favoritos
    ├── host/      # propiedades, habitaciones, fotos, precio mensual
    ├── bookings/  # solicitudes mensuales (huésped y anfitrión)
    ├── messaging/ community/ reputation/ admin/
```

Reglas de dependencia: `features → core/shared/layout`; nunca al revés; no se
importan internals de otra feature. `shared` no contiene reglas de dominio.

## 2. Convenciones de código

- Identificadores en inglés; textos de UI en español.
- Ficheros kebab-case sin sufijo de tipo (`unit-page.ts` → `UnitPage`).
- Prettier con `printWidth: 100` y comillas simples.
- Componentes standalone; templates externos para páginas y templates inline solo
  para componentes pequeños.
- Signals (`signal`, `computed`, `linkedSignal`, `resource`), `input()/output()/model()`
  e `inject()` en lugar de decoradores o constructores.
- Control flow nativo (`@if`, `@for` con `track`); prohibido `ngClass`, `ngStyle`,
  `CommonModule`, `@HostBinding` y `@HostListener`.
- Formularios nuevos con **Signal Forms** (`@angular/forms/signals`); validación
  autoritativa en el backend y mapeo de `fieldErrors`.
- Imágenes estáticas de la landing con `NgOptimizedImage`; las fotos gestionadas
  por el anfitrión usan `<img>` con `loading="lazy"` porque la URL es dinámica.

## 3. Identidad visual (Tailwind v4)

Los tokens viven en `src/styles.css` (`@theme`) y las primitivas compartidas en
`@layer components`:

- Marca esmeralda (`brand-50…900`), acento ámbar (`accent-100…700`), semánticos
  `success`, `warning`, `danger`, neutros `ink`, `muted`, `line`, `soft`, `surface`.
- Tipografías: `font-sans` (DM Sans) y `font-display` (Manrope).
- Radios `rounded-card` (20px), `rounded-pill`; sombras `shadow-soft`, `shadow-card`,
  `shadow-float`; easing `--ease-out-soft`.
- Clases reutilizables: `.ui-card`, `.ui-card-hover`, `.ui-card-pad`, `.ui-input`,
  `.ui-textarea`, `.ui-select`, `.ui-label`, `.ui-chip`, `.ui-eyebrow`,
  `.ui-section-title`, `.ui-muted`, `.ui-divider`, `.ui-link`, `.ui-skeleton`,
  `.ui-scroll-x`.
- No se usan valores arbitrarios distintos por pantalla cuando existe un token o
  clase compartida. La identidad verde/ámbar existente se conserva.
- Foco visible global (`:focus-visible`), contraste AA, objetivos táctiles mínimos
  de 36–44px y layout mobile-first.

### Componentes compartidos (`shared/ui`)

Solo se crean cuando hay **≥2 consumidores reales**:

- `UiButton` — variantes `primary`, `secondary`, `ghost`, `danger`, `accent`, `link`;
  tamaños, carga, `iconOnly`, `ariaLabel`.
- `UiIcon` — familia SVG propia, 24×24, grosor uniforme; decorativo por defecto,
  `label` para nombre accesible. No hay librería externa de iconos.
- `UiFormField` — label asociado, obligatorio, hint y error accesible.
- `UiAlert` — error/success/info/warning con icono y rol adecuado.
- `UiEmptyState` — estado vacío con acción proyectada.
- `UiPageHeader` — cabecera de página con acciones.
- `UiAvatar` — imagen o iniciales; decorativo salvo `label`.
- `shared/utils/plural.ts` — pluralización española (`1 plaza`, `2 plazas`).

UI de dominio que **no** va a `shared`:

- `features/listings/ui/availability-badge.ts` — etiqueta de disponibilidad mensual
  (`Disponible`, `Últimas plazas`, `Ocupada`, `Pausada`, `Borrador`, `En revisión`).
- `features/listings/ui/listing-card.*` — tarjeta de habitación.
- `features/host/ui/photo-manager.ts` — gestor de fotos de propiedad/habitación.
- `features/bookings/ui/reservation-card.*` — tarjeta de solicitud.

## 4. Modelo mensual en la UI

- Un **anfitrión** tiene propiedades; cada propiedad tiene una o varias
  **habitaciones** (`unit` en el backend). Cada habitación es la unidad de alquiler.
- Cada habitación tiene capacidad (`maxGuests`), plazas ocupadas (derivadas de
  solicitudes `ACEPTADA`), plazas libres (`capacidad - ocupadas`), precio mensual,
  unidad de cobro (`POR_HABITACION`/`POR_PERSONA`), baño, aire, ventilador, zonas
  comunes y fotos propias.
- Disponibilidad efectiva = habitación publicada **y** plazas libres > 0. Pausar
  una habitación impide nuevas solicitudes aunque queden plazas.
- Una solicitud ocupa una plaza solo cuando el anfitrión la **acepta**. Pendiente,
  rechazada o cancelada no ocupan. La ocupación se recalcula desde las solicitudes,
  nunca desde un contador del cliente.
- Los compañeros de habitación solo se muestran si el residente activó
  `roommateProfileVisible`; el backend filtra y la UI no inventa identidades.
- No existen fechas, noches, calendarios ni “reservar X noches”. Cualquier texto
  o control con esa semántica es un defecto.

## 5. Contratos de API usados por el cliente

### Exploración y detalle

- `GET /api/v1/search/listings` — filtros mensuales: `q`, `minPrice`, `maxPrice`,
  `currency`, `minCapacity`, `availableOnly`, `airConditioning`, `fan`,
  `bathroomType`, `roomType`, `propertyId`, `sort`.
- `GET /api/v1/publications/{id}` — detalle de habitación con `unit`, `property`,
  `host`, `occupancy`, `propertyPhotos` y `photos` en `unit`.
- `GET /api/v1/properties/{id}` — propiedad con sus habitaciones publicadas.
- `GET /api/v1/publications/{id}/roommates` — residentes con consentimiento.
- `GET/POST/DELETE /api/v1/favorites[/{publicationId}]`.

### Anfitrión

- `GET/POST/PATCH /api/v1/host/properties` y `GET /host/properties/{id}`.
- `POST/DELETE /host/properties/{id}/photos[/{photoId}]` y
  `PUT /host/properties/{id}/photos/order`.
- `GET/POST /host/properties/{id}/units`, `GET/PATCH /host/units/{id}`.
- `PUT /host/units/{id}/availability` con `{ enabled }` para publicar/pausar.
- `POST/DELETE /host/units/{id}/photos[/{photoId}]` y
  `PUT /host/units/{id}/photos/order`.
- `PUT /host/publications/{id}/pricing` con `{ monthlyPrice, currency, priceUnit }`.
- Acciones de publicación: `publish`, `pause`, `hide`, `request-review`, `archive`.

Las fotos se gestionan por **URL** (local `/images/...` o remota `https://...`).
No hay endpoint de subida de imágenes en este alcance; no se simula una subida.

### Solicitudes

- Huésped: `POST /api/v1/reservations` (`{ unitId, places, message? }`),
  `GET /reservations/mine`, `POST /reservations/{id}/cancel` (`{ reason }`).
- Anfitrión: `GET /host/reservations`, `GET /{id}/history`,
  `POST /{id}/accept|reject|request-info|cancel`.
- Estados nuevos: `SOLICITADA → ACEPTADA | RECHAZADA | CANCELADA` (más
  `INFORMACION_SOLICITADA`). `CONFIRMADA`/`EXPIRADA` solo hidratan datos históricos.
- Aceptar exige habitación publicada y plazas libres; el backend bloquea la fila
  de la habitación para evitar que dos aceptaciones tomen la última plaza.

### Mensajería

- `GET/POST /api/v1/conversations` — abrir con `{ reservationId }` o `{ unitId }`.
- `GET /conversations/{id}`, `POST /conversations/{id}/messages`.
- El hilo devuelve `listing` (habitación/propiedad/ciudad) y `messages`.
- “Contactar al anfitrión” en el detalle crea/reutiliza el hilo de la habitación.
- Sin tiempo real: la frescura es bajo demanda (cargar, “Actualizar”, recargar tras enviar).

### Perfil / privacidad

- `GET/PATCH /api/v1/profile` y `PUT /profile/privacy`.
- `roommateProfileVisible` es consentimiento explícito para mostrar nombre/avatar
  a posibles compañeros.
- No se exponen teléfono, correo ni documentos en endpoints públicos.

## 6. Estado y fetching

- Estado local con signals; `resource()` para lecturas por parámetro; `linkedSignal`
  para formularios derivados. Sin store global (salvo `AuthSession`).
- Tras una mutación: `reload()` del recurso o actualización explícita del signal.
- Filtros de búsqueda en la URL (compartibles, “atrás” funciona).
- No se simulan operaciones de servidor ni se mantienen contadores de ocupación
  locales.

## 7. Accesibilidad y responsive

- Landmark `main`, skip link en landing y shell autenticado.
- Iconos decorativos `aria-hidden`; botones icon-only con `aria-label`.
- Formularios: label asociado, `aria-invalid`, error con id referenciado por
  `aria-describedby`, envío deshabilitado durante la petición.
- Confirmación explícita para acciones destructivas (cancelar solicitud, eliminar
  foto, archivar); los rechazos/cancelaciones piden motivo.
- Responsive comprobado en ~390px, ~780px y escritorio. La barra inferior móvil
  aparece hasta `lg`; el panel de filtros se colapsa en móvil.
- No hay desbordamiento horizontal; los formularios se apilan en una columna.

## 8. Pruebas y comandos

```bash
cd api && docker compose up -d && ./gradlew bootRun   # API :8082 (dev)
cd client && npm start                                 # cliente :8080, proxy /api → :8082
npm run build                                          # build de producción
npx ng test --watch=false                              # Vitest
npx prettier --check .                                 # formato
```

El cliente usa el puerto **8080** para que el reenvío público de GitHub Codespaces
pueda exponerlo directamente; el proxy de desarrollo envía `/api` al backend en
**8082**. En un entorno local sin Codespaces, ambos puertos pueden cambiarse de
forma consistente en `angular.json`/`proxy.conf.json` y `application-dev.yml`.

- Pruebas de modelos (precio mensual, unidades, estados de solicitud), disponibilidad,
  sliders y landing. El backend cubre reglas de capacidad/ocupación, concurrencia y
  privacidad con tests e integración Testcontainers.
- Para validación funcional se usa Playwright MCP sobre la app real; no se declara
  una pantalla validada sin abrirla.

## 9. Limitaciones conocidas

- Fotos por URL; no hay subida/almacenamiento de archivos en este alcance.
- Sin paginación en búsqueda, solicitudes ni mensajería (volumen de piloto).
- Mensajería sin tiempo real ni estados de lectura por mensaje.
- Los catálogos académicos y de ciudad siguen sin endpoint público; la ubicación
  se muestra como texto (`cityName`, `neighborhood`) y `cityId` se conserva.
- Comunidad y reputación mantienen sus pantallas existentes; usan el estado
  `ACEPTADA` (o la histórica `CONFIRMADA`) como residencia.
- No se añadió Storybook ni una librería de componentes/iconos: la base visual se
  resolvió con Tailwind v4, `styles.css`, componentes compartidos y una familia SVG propia.
