# Seguridad

## Protección contra ataques DDoS: qué hace el código y qué no

Ningún código de una página puede detener por sí solo un ataque DDoS: ese tráfico se frena **antes** de llegar al sitio, en un CDN o proveedor de borde. Lo que sí hace este proyecto es reducir al mínimo lo que hay que proteger:

- **Sitio 100 % estático:** no hay servidor propio, base de datos, formularios ni API que se puedan saturar o explotar.
- **Todo cacheable:** CSS y JS salen con hash y caché inmutable de 1 año (`/_astro/*`), así que el CDN responde casi todo sin tocar el origen.
- **Cabeceras de seguridad** (`public/_headers` para Netlify y Cloudflare Pages, `vercel.json` para Vercel): CSP estricta sin scripts en línea, HSTS, `nosniff`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy, COOP y CORP.
- **Iframe del mapa en sandbox** y enlaces externos con `rel="noopener"`.

## Lo que debes configurar en tu proveedor

1. Publica en **Cloudflare Pages, Netlify o Vercel**: ya incluyen CDN y mitigación DDoS básica.
2. Si usas dominio propio, pon el DNS detrás de **Cloudflare** (proxy activado) y activa DNSSEC.
3. En Cloudflare, crea una regla de **Rate Limiting** (por ejemplo, más de 100 solicitudes en 10 s por IP → desafío) y activa **Bot Fight Mode** y las reglas gestionadas del WAF.
4. Si sufres un ataque, activa **Under Attack Mode** temporalmente.
5. Activa HTTPS obligatorio y mantén el HSTS preload solo cuando estés seguro de que todo el dominio funciona con HTTPS.

## Dependencias

- Se usa **pnpm** con `pnpm-workspace.yaml`: solo `esbuild` y `sharp` pueden ejecutar scripts de instalación y se exige una antigüedad mínima de 3 días a cada versión.
- Versiona `pnpm-lock.yaml` y en CI usa `pnpm install --frozen-lockfile`.

## Reportar una vulnerabilidad

Escribe a **contacto@manosdelcerro.cl** (también en `/.well-known/security.txt`).

## Opiniones y verificador

- **Secret key de Supabase:** solo como secreto de la Edge Function (`supabase secrets set`). Nunca en el frontend, `.env` del sitio ni el repositorio; si se expuso, rótala.
- **Opiniones:** la tabla base no tiene acceso público (RLS sin políticas). El navegador solo lee vistas sin `ip_hash`. Las inserciones pasan por `post-comment` (CORS restringido, validación, sin enlaces, campo trampa, tiempo mínimo y límite por IP). Para frenar abusos mayores, agrega Cloudflare Turnstile.
- **Moderación:** oculta una opinión con `update public.comments set status = 'hidden' where id = '...'`.
- **Verificador:** solo se acepta el número de arriendo o una URL del dominio `yopagoenvalpo.cl`; siempre se consulta el endpoint fijo, nunca la URL del QR (evita SSRF y redirecciones). El RUT se enmascara y no se muestra la deuda.
