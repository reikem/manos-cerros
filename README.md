# Manos del Cerro 🏘️🌫️🛗

[![Astro](https://img.shields.io/badge/Astro-5-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-secure-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Manos del Cerro** es la landing page de una agrupación de comerciantes ambulantes de **Valparaíso** que trabaja, cuida y defiende las calles del puerto. Está construida con **Astro** y **TypeScript** como un sitio 100 % estático: rápido, accesible, con modo oscuro automático y animaciones ligadas al scroll escritas solo en CSS.

La página prioriza tres cosas: **sensibilidad** al contar la historia, **rendimiento** (casi nada de JavaScript) y **seguridad** (CSP estricta y superficie de ataque mínima).

---

## 🖼️ Interfaz y características

| Portada | Manifiesto | Cerro | Voces |
| :---: | :---: | :---: | :---: |
| Carrusel de Valparaíso con menú fijo | Texto que se enciende al hacer scroll | Ladera con ventanas y ascensor animado | Cartas 3D con vista ampliada |

> Agrega capturas en `docs/` y enlázalas en la tabla cuando publiques el sitio.

### Secciones principales

1. **Portada (carrusel)**
   * Imágenes de Valparaíso con transición suave, efecto de acercamiento y autoplay.
   * Flechas, puntos con barra de progreso, pausa, teclado y deslizar con el dedo.
   * Respeta `prefers-reduced-motion`: sin autoplay ni movimiento.

2. **Menú fijo**
   * Te sigue mientras bajas, se vuelve sólido con desenfoque y marca la sección visible.
   * En móvil usa un menú `<details>` sin JavaScript.

3. **Manifiesto y "Un día en la calle"**
   * Las palabras se encienden una a una con el scroll y una línea de tiempo se dibuja sola.

4. **El cerro (animación inspirada en Valparaíso)**
   * Ladera de casas de colores generada al compilar, con ventanas que se encienden, niebla (*camanchaca*) a la deriva y un **ascensor** que sube el cerro mientras bajas.

5. **Voces del cerro**
   * Testimonios como cartas coleccionables con inclinación 3D, brillo holográfico y vista ampliada.

6. **Verificador de credenciales (QR)**
   * Pide permiso para usar la cámara (PC, Android o iOS), lee el QR de la credencial municipal y consulta el permiso en el sistema «Yo pago en Valpo».
   * Alternativas sin cámara: subir una foto del QR o escribir el N.º de arriendo.
   * Muestra estado (VIGENTE), si los pagos están al día y una credencial 3D que se acerca con un clic y se gira arrastrando para ver el QR y la leyenda del reverso.

7. **Reglamento**
   * Enfoque de dignidad (familias, personas con discapacidad, pensiones que no alcanzan), estado actual de la ordenanza, dibujo interactivo de un puesto que cumple y reglas en acordeón con fuentes.

8. **Opiniones de la comunidad (Supabase)**
   * Últimas 10 opiniones, valoración promedio con gráfico de estrellas, tabla paginada con todas y formulario con límite por IP.

9. **Dónde estamos y Súmate**
   * Mapa de OpenStreetMap con lugares clave y llamadas a la acción por WhatsApp y correo.

---

## 🏗️ Arquitectura técnica

```
        ┌────────────────────────────────────────────┐
        │  CDN / Borde (Cloudflare, Netlify, Vercel) │
        │  Mitigación DDoS · WAF · Rate limiting     │
        └──────────────────────┬─────────────────────┘
                               │  HTML + assets con hash (caché inmutable)
                               ▼
        ┌────────────────────────────────────────────┐
        │   Sitio estático (dist/) + cabeceras CSP   │
        └──────────────────────┬─────────────────────┘
                               │ compilado por Astro
     ┌─────────────────────────┼─────────────────────────┐
     ▼                         ▼                         ▼
┌───────────────┐   ┌──────────────────────┐   ┌────────────────────┐
│  src/data     │   │   src/components     │   │ src/styles/        │
│  site.ts      │──▶│  Hero · Carrusel ·   │◀──│ animations/*.css   │
│  (contenido   │   │  Cerro · Cartas ...  │   │ (una por archivo)  │
│   tipado)     │   └──────────┬───────────┘   └────────────────────┘
└───────────────┘              ▼
                    ┌──────────────────────┐
                    │ src/scripts (TS)     │
                    │ carousel · nav ·     │
                    │ tilt · lightbox      │
                    └──────────────────────┘
```

### Aspectos técnicos destacados

* **Contenido separado del código:** textos, testimonios, lugares y fotos se editan en `src/data/site.ts`, con tipos TypeScript.
* **Animaciones reutilizables:** cada animación vive en su archivo (`src/styles/animations/`) y se aplica con una clase (`anim-clip`, `anim-rule`, `anim-draw`, `anim-words`, `anim-windows`, `anim-funicular`…). Usan *scroll-driven animations* de CSS y degradan con elegancia donde no hay soporte.
* **JavaScript mínimo:** solo cuatro módulos TypeScript pequeños; las palabras del manifiesto y la ladera del cerro se generan en tiempo de compilación.
* **Modo oscuro nativo:** sigue `prefers-color-scheme` mediante tokens de color en `src/styles/global.css`.
* **SEO:** título, descripción, canonical, Open Graph, Twitter Card, JSON-LD, sitemap y `robots.txt`.
* **Accesibilidad:** enlace para saltar al contenido, carrusel con roles ARIA y pausa, foco visible, uso completo con teclado.

---

## 🔒 Seguridad y rendimiento

Un sitio estático no tiene servidor ni base de datos que atacar, y el CDN absorbe el tráfico. Los detalles (y lo que debes configurar contra DDoS en tu proveedor) están en [`SECURITY.md`](SECURITY.md).

* **CSP estricta:** `script-src 'self'` y `style-src 'self'`; Astro está configurado para no incrustar scripts ni estilos en el HTML.
* **Cabeceras:** HSTS, `nosniff`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, COOP y CORP (`public/_headers` y `vercel.json`).
* **Caché inmutable** de 1 año para `/_astro/*` con nombres con hash.
* **Cámara solo cuando se usa:** `Permissions-Policy: camera=(self)`; el video se procesa en el dispositivo y no se envía a ningún servidor. Del QR solo se extrae el número de arriendo: nunca se consulta la URL que traiga el código.
* **Privacidad en la verificación:** el RUT se muestra enmascarado, no se muestra el monto de deuda y no se guardan las consultas.
* **Mapa en `iframe` con `sandbox`** y enlaces externos con `rel="noopener"`.
* **Dependencias con pnpm:** scripts de instalación bloqueados salvo `esbuild` y `sharp`, y antigüedad mínima de 3 días por versión.

---

## 🗄️ Supabase: opiniones y límite por IP

El navegador **solo lee** (vistas `comments_public` y `comment_stats`). Las opiniones se publican a través de la Edge Function `post-comment`, que valida, filtra enlaces, usa un campo trampa y limita a **3 por hora y 8 por día por IP** (se guarda solo un hash con sal, no la IP).

1. **Tablas y políticas:** pega `supabase/migrations/0001_comments.sql` en *SQL Editor* (o `supabase db push`).
2. **Secretos y funciones** (la secret key va solo aquí, nunca en `.env` del sitio):
   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase secrets set SB_SECRET_KEY=sb_secret_NUEVA IP_SALT=$(openssl rand -hex 16) \
     ALLOWED_ORIGINS=https://manosdelcerro.cl,http://localhost:4321
   supabase functions deploy post-comment --no-verify-jwt
   supabase functions deploy verify-credential --no-verify-jwt
   ```
3. **Variables del sitio:** copia `.env.example` a `.env` con `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (claves públicas por diseño).
4. **Si la API municipal bloquea CORS:** define `PUBLIC_VERIFY_API` con la URL de la función `verify-credential` y el verificador la usará como proxy.

> ⚠️ **Nunca** pongas la `SUPABASE_SECRET_KEY` en el frontend ni en el repositorio. Si la compartiste en un chat, ticket o commit, **rótala** en Supabase → Project Settings → API Keys.

---

## 🖋️ Configuración de contenido

1. Edita textos, testimonios, lugares, WhatsApp y correo en `src/data/site.ts` (los testimonios incluidos son de ejemplo).
2. Cambia `manosdelcerro.cl` por tu dominio en `astro.config.mjs`, `public/_headers`, `public/robots.txt` y `public/.well-known/security.txt`.
3. Las fotos vienen de Wikimedia Commons (revisa su licencia). Para más control, descárgalas a `public/` o usa fotos propias.

---

## ⚙️ Desarrollo y puesta en marcha

### Requisitos previos
* **Node.js**: `v18.20.8+`
* **pnpm** (`corepack enable` o [pnpm.io](https://pnpm.io/installation))

### 1. Instalación

```bash
git clone https://github.com/tu-usuario/manos-del-cerro.git
cd manos-del-cerro
pnpm install
```

### 2. Desarrollo

```bash
pnpm dev        # http://localhost:4321
```

### 3. Compilar y previsualizar

```bash
pnpm build      # revisa tipos con astro check y genera /dist
pnpm preview
```

### 4. Publicar
Conecta el repositorio a **Cloudflare Pages**, **Netlify** o **Vercel** con el comando `pnpm build` y la carpeta de salida `dist`. Las cabeceras de seguridad se aplican solas.

---

## 📂 Estructura del proyecto

```
manos-del-cerro/
├── public/
│   ├── _headers             # CSP y caché (Netlify / Cloudflare Pages)
│   ├── robots.txt
│   └── .well-known/security.txt
├── src/
│   ├── components/
│   │   ├── ui/              # Button, ResponsiveImage
│   │   ├── seo/SEO.astro    # Meta, Open Graph, JSON-LD
│   │   ├── Navbar.astro  Hero.astro  HeroCarousel.astro  CarouselControls.astro
│   │   ├── Manifesto.astro  PhotoMosaic.astro  Timeline.astro  CerroDivider.astro
│   │   └── Pillars.astro  Verifier.astro  CredentialCard.astro  Reglamento.astro
│   │       Testimonials.astro  TestimonialCard.astro  Comments.astro
│   │       PlaceMap.astro  CallToAction.astro  Footer.astro
│   ├── data/site.ts         # Contenido tipado
│   ├── layouts/BaseLayout.astro
│   ├── pages/index.astro
│   ├── lib/                 # credential.ts (QR + API municipal) · comments.ts (Supabase)
│   ├── scripts/             # carousel · nav · tilt · lightbox · verifier · credential-viewer · stall · comments
│   ├── styles/              # global.css + animations/*.css
│   └── utils/commons.ts
├── supabase/                # migración SQL + Edge Functions (post-comment, verify-credential)
├── .env.example
├── astro.config.mjs
├── pnpm-workspace.yaml
├── vercel.json
├── SECURITY.md
└── package.json
```

---

## 🤝 Contribuir

¡Las contribuciones, ideas y reportes son bienvenidos! Revisa la sección de *issues* del repositorio. Para temas de seguridad, sigue [`SECURITY.md`](SECURITY.md).

## 📄 Licencia

Distribuido bajo la licencia MIT. Consulta `LICENSE` para más información.
