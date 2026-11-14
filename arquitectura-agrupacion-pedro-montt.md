# Plataforma Web — Agrupación de Comerciantes Ambulantes Legales, Av. Pedro Montt (Valparaíso)

Arquitectura completa: Landing Page pública + Intranet/CMS administrativo.

**Stack:** Next.js 14+ (App Router) · TypeScript · Tailwind CSS · Shadcn UI · Auth.js v5 · Prisma + PostgreSQL · React Three Fiber · Recharts

---

## 1. Estructura de carpetas (monorepo simple, App Router)

```
pedro-montt-app/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout + ThemeProvider
│   │   ├── page.tsx                       # Landing pública (renderiza bloques CMS)
│   │   ├── globals.css
│   │   ├── (public)/
│   │   │   ├── historia/page.tsx
│   │   │   ├── noticias/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── contacto/page.tsx
│   │   │   └── credencial/page.tsx        # Escáner QR
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx                 # Sidebar + guard de rol (server)
│   │   │   ├── page.tsx                   # Dashboard KPIs
│   │   │   ├── paginas/page.tsx           # Toggles de secciones
│   │   │   ├── bloques/
│   │   │   │   ├── page.tsx               # Block Builder (drag & drop)
│   │   │   │   └── [pageId]/editor.tsx
│   │   │   ├── noticias/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nueva/page.tsx
│   │   │   │   └── [id]/editar/page.tsx
│   │   │   ├── medios/page.tsx            # Gestor de archivos
│   │   │   └── usuarios/page.tsx          # Gestión Admin/Editor
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── credenciales/route.ts      # Proxy seguro a yopagoenvalpo.cl
│   │       ├── noticias/route.ts
│   │       ├── noticias/[id]/route.ts
│   │       ├── bloques/route.ts
│   │       ├── medios/upload/route.ts
│   │       └── contacto/route.ts
│   ├── components/
│   │   ├── ui/                            # shadcn primitives
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   └── theme-toggle.tsx
│   │   ├── three/
│   │   │   ├── valparaiso-scene.tsx       # Canvas R3F
│   │   │   └── hill-icon.tsx
│   │   ├── qr/
│   │   │   ├── qr-scanner.tsx
│   │   │   └── credential-card.tsx
│   │   ├── blocks/                        # Renderers del Block Builder
│   │   │   ├── block-renderer.tsx
│   │   │   ├── carousel-block.tsx
│   │   │   ├── stats-block.tsx
│   │   │   ├── cards-block.tsx
│   │   │   ├── table-block.tsx
│   │   │   ├── form-block.tsx
│   │   │   └── chart-block.tsx
│   │   ├── admin/
│   │   │   ├── block-editor-canvas.tsx    # dnd-kit
│   │   │   ├── media-manager.tsx
│   │   │   └── news-form.tsx
│   │   └── forms/
│   │       └── contact-form.tsx
│   ├── lib/
│   │   ├── auth.ts                        # Auth.js config
│   │   ├── db.ts                          # Prisma client singleton
│   │   ├── rate-limit.ts
│   │   ├── sanitize.ts
│   │   ├── file-validation.ts             # Magic bytes / MIME
│   │   ├── validations/
│   │   │   ├── contact.schema.ts
│   │   │   └── news.schema.ts
│   │   └── s3.ts
│   ├── middleware.ts                      # Auth guard + security headers + rate limit
│   └── types/
│       ├── blocks.ts
│       └── next-auth.d.ts
├── next.config.ts
├── tailwind.config.ts
└── .env.example
```

---

## 2. Modelo de datos (Prisma)

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  EDITOR
}

model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role     @default(EDITOR)
  createdAt     DateTime @default(now())
}

model Page {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  isActive  Boolean  @default(true)
  blocks    Block[]
  updatedAt DateTime @updatedAt
}

model Block {
  id        String   @id @default(cuid())
  page      Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)
  pageId    String
  type      String   // "carousel" | "stats" | "cards" | "table" | "form" | "chart"
  order     Int
  isActive  Boolean  @default(true)
  data      Json     // contenido específico del bloque (validado con Zod por tipo)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model News {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  excerpt     String
  content     String   @db.Text
  coverImage  String?
  published   Boolean  @default(false)
  publishedAt DateTime?
  authorId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model MediaFile {
  id        String   @id @default(cuid())
  key       String   @unique   // clave en S3/bucket
  filename  String
  mimeType  String
  size      Int
  url       String
  uploadedBy String
  createdAt DateTime @default(now())
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  message   String   @db.Text
  ip        String
  createdAt DateTime @default(now())
}
```

---

## 3. Seguridad — Middleware central

Combina: autenticación/roles en `/admin`, cabeceras HTTP estrictas y rate limiting.

```ts
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.s3.amazonaws.com",
  "connect-src 'self' https://yopagoenvalpo.cl",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function withSecurityHeaders(res: NextResponse) {
  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), microphone=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return res;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Rate limiting en rutas sensibles (API + escáner de credenciales)
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { success, remaining } = await checkRateLimit(ip, pathname);
    if (!success) {
      return new NextResponse(JSON.stringify({ error: "Demasiadas solicitudes" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "X-RateLimit-Remaining": String(remaining) },
      });
    }
  }

  // 2. Protección de /admin por sesión + rol
  if (pathname.startsWith("/admin")) {
    const session = await auth();
    if (!session?.user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
    // Rutas exclusivas de ADMIN (ej. usuarios)
    if (pathname.startsWith("/admin/usuarios") && session.user.role !== "ADMIN") {
      return withSecurityHeaders(NextResponse.redirect(new URL("/admin", req.url)));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/login"],
};
```

```ts
// src/lib/rate-limit.ts
// Versión in-memory (para 1 instancia). En producción con múltiples instancias,
// reemplazar por Upstash Redis (@upstash/ratelimit + @upstash/redis).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/credenciales": { max: 15, windowMs: 60_000 },   // anti-scraping del escáner
  "/api/contacto": { max: 5, windowMs: 60_000 },        // anti-spam del formulario
  default: { max: 60, windowMs: 60_000 },
};

export async function checkRateLimit(ip: string, pathname: string) {
  const rule = LIMITS[Object.keys(LIMITS).find((k) => pathname.startsWith(k)) ?? "default"];
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { success: true, remaining: rule.max - 1 };
  }
  if (bucket.count >= rule.max) {
    return { success: false, remaining: 0 };
  }
  bucket.count += 1;
  return { success: true, remaining: rule.max - bucket.count };
}
```

> **Nota producción:** el rate limit in-memory se reinicia por instancia/deploy. Para VPS único o pocos usuarios concurrentes es aceptable; con múltiples instancias (Vercel serverless, Docker Swarm) usar Upstash Redis para estado compartido.

---

## 4. Autenticación (Auth.js v5) con roles

```ts
// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth.schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as "ADMIN" | "EDITOR";
      return session;
    },
  },
});
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Buenas prácticas aplicadas:**
- Contraseñas con `bcryptjs` (hash + salt), nunca texto plano.
- JWT de corta duración (8h) para sesiones administrativas.
- `authorize()` valida el input con Zod antes de tocar la DB (previene NoSQL/SQL injection vía payloads inesperados).
- Cookies de sesión `httpOnly`, `secure`, `sameSite: lax` (configuración por defecto de Auth.js en producción con HTTPS).

---

## 5. Escáner QR de credenciales

### 5.1 Componente lector (cliente)

```tsx
// src/components/qr/qr-scanner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import { CredentialCard } from "./credential-card";
import type { ProvisoriaResponse } from "@/types/blocks";

export function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [data, setData] = useState<ProvisoriaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let active = true;

    async function start() {
      try {
        setScanning(true);
        const result = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current!);
        if (!active) return;
        await fetchCredential(result.getText());
      } catch {
        if (active) setError("No se pudo leer el código QR. Inténtalo de nuevo.");
      } finally {
        setScanning(false);
      }
    }
    start();
    return () => {
      active = false;
      reader.reset();
    };
  }, []);

  async function fetchCredential(rawValue: string) {
    // El QR codifica solo el número de arriendo, nunca datos sensibles directamente
    const id = extractArriendoId(rawValue);
    if (!id) {
      setError("Código QR no reconocido.");
      return;
    }
    const res = await fetch(`/api/credenciales?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      setError("No se pudo validar la credencial.");
      return;
    }
    const json = await res.json();
    setData(json);
  }

  function extractArriendoId(raw: string): string | null {
    const match = raw.match(/(\d{3,8})/);
    return match ? match[1] : null;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {!data && (
        <div className="overflow-hidden rounded-2xl border bg-black/5 aspect-square relative">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm">
              Enfoca el código QR de la credencial…
            </div>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && <CredentialCard data={data} onReset={() => setData(null)} />}
    </div>
  );
}
```

### 5.2 API Route — Proxy seguro (nunca exponer la API externa directo al cliente)

```ts
// src/app/api/credenciales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const idSchema = z.string().regex(/^\d{1,8}$/, "ID de arriendo inválido");

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parámetro inválido" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://yopagoenvalpo.cl/api/provisorias/provisorias/PorNumeroArriendo?id=${parsed.data}`,
      { cache: "no-store", headers: { Accept: "application/json" } }
    );

    if (!upstream.ok) {
      return NextResponse.json({ error: "Credencial no encontrada" }, { status: 404 });
    }

    const json = await upstream.json();

    // Se re-emite solo el subconjunto necesario (nunca reenviar el payload crudo tal cual,
    // reduce superficie de fuga de datos si la API externa añade campos sensibles)
    const provisoria = json?.provisoria;
    if (!provisoria) {
      return NextResponse.json({ error: "Formato de respuesta inesperado" }, { status: 502 });
    }

    return NextResponse.json({
      provisoria: {
        numeroArriendo: provisoria.NumeroArriendo,
        nombres: provisoria.nombres,
        rut: maskRut(provisoria.Rut),
        direccion: provisoria.direccion,
        descripcion: provisoria.descripcion,
        estado: provisoria.estado,
        deuda: provisoria.deuda,
      },
    });
  } catch {
    return NextResponse.json({ error: "Servicio externo no disponible" }, { status: 503 });
  }
}

// Enmascara el RUT en la respuesta pública del escáner (privacidad),
// mostrando solo los últimos 4 dígitos + dígito verificador.
function maskRut(rut: string) {
  const clean = rut.replace(/\D/g, "");
  const dv = rut.slice(-1);
  return `***${clean.slice(-5, -1)}-${dv}`;
}
```

> **Decisión de privacidad:** dado que el RUT completo es un dato personal sensible bajo la Ley 19.628 (Chile), se recomienda **enmascarar el RUT** en la vista pública del escáner y mostrar el RUT completo solo a usuarios autenticados con rol ADMIN/EDITOR (fiscalización). Ajustable según lo que la agrupación decida.

### 5.3 Tarjeta de credencial visual

```tsx
// src/components/qr/credential-card.tsx
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MapPin, Ruler, User } from "lucide-react";
import type { ProvisoriaResponse } from "@/types/blocks";

export function CredentialCard({
  data,
  onReset,
}: {
  data: ProvisoriaResponse;
  onReset: () => void;
}) {
  const { provisoria } = data;
  const vigente = provisoria.estado === "VIGENTE";

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Arriendo N° {provisoria.numeroArriendo}
        </span>
        <Badge variant={vigente ? "default" : "destructive"} className="gap-1">
          {vigente ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {provisoria.estado}
        </Badge>
      </div>

      <h3 className="mt-3 flex items-center gap-2 text-lg font-semibold">
        <User className="h-4 w-4 text-muted-foreground" />
        {provisoria.nombres}
      </h3>
      <p className="text-sm text-muted-foreground">RUT {provisoria.rut}</p>

      <div className="mt-4 space-y-2 text-sm">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          {provisoria.direccion}
        </p>
        <p className="flex items-start gap-2">
          <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          {provisoria.descripcion}
        </p>
        <p>
          Deuda: <span className={provisoria.deuda > 0 ? "text-destructive" : "text-emerald-600"}>
            {provisoria.deuda > 0 ? `$${provisoria.deuda.toLocaleString("es-CL")}` : "Sin deuda"}
          </span>
        </p>
      </div>

      <button
        onClick={onReset}
        className="mt-5 w-full rounded-lg border py-2 text-sm font-medium hover:bg-accent"
      >
        Escanear otra credencial
      </button>
    </div>
  );
}
```

---

## 6. Sanitización de entradas y archivos

```ts
// src/lib/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

// Para texto enriquecido (ej. cuerpo de noticias) editado por Editores en el CMS
export function sanitizeHtml(dirty: string) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li", "h2", "h3", "img", "br"],
    ALLOWED_ATTR: ["href", "src", "alt", "target", "rel"],
  });
}
```

```ts
// src/lib/file-validation.ts
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function validateUploadedImage(buffer: Buffer, declaredMime: string) {
  if (buffer.length > MAX_SIZE_BYTES) {
    return { valid: false, reason: "El archivo excede 5MB" };
  }

  // Verifica los "magic bytes" reales del archivo, no solo el header/extension
  // enviado por el cliente, que puede ser falsificado (ej. .php disfrazado de .jpg)
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    return { valid: false, reason: "Tipo de archivo no permitido o corrupto" };
  }
  if (detected.mime !== declaredMime) {
    return { valid: false, reason: "El contenido del archivo no coincide con su extensión" };
  }
  return { valid: true, mime: detected.mime };
}
```

```ts
// src/app/api/medios/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateUploadedImage } from "@/lib/file-validation";
import { uploadToS3 } from "@/lib/s3";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = await validateUploadedImage(buffer, file.type);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 415 });
  }

  // Nombre de archivo generado por el servidor (nunca confiar en el nombre original)
  const ext = validation.mime === "image/png" ? "png" : validation.mime === "image/webp" ? "webp" : "jpg";
  const key = `media/${randomUUID()}.${ext}`;

  const url = await uploadToS3(key, buffer, validation.mime);

  const media = await db.mediaFile.create({
    data: { key, filename: file.name.slice(0, 120), mimeType: validation.mime, size: buffer.length, url, uploadedBy: session.user.id! },
  });

  return NextResponse.json(media, { status: 201 });
}
```

---

## 7. Formulario de contacto con validación + captcha

```ts
// src/lib/validations/contact.schema.ts
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(10).max(2000),
  captchaToken: z.string().min(10), // token de Turnstile/hCaptcha
});
```

```tsx
// src/components/forms/contact-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema } from "@/lib/validations/contact.schema";
import { z } from "zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { useState } from "react";

type FormValues = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(values: FormValues) {
    setStatus("sending");
    const res = await fetch("/api/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input {...register("name")} placeholder="Nombre completo" className="input" />
      {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}

      <input {...register("email")} placeholder="Correo electrónico" className="input" />
      {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}

      <input {...register("phone")} placeholder="Teléfono (opcional)" className="input" />

      <textarea {...register("message")} rows={5} placeholder="Mensaje" className="input" />
      {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}

      <Turnstile
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={(token) => setValue("captchaToken", token)}
      />

      <button disabled={status === "sending"} className="btn-primary w-full">
        {status === "sending" ? "Enviando…" : "Enviar mensaje"}
      </button>
      {status === "sent" && <p className="text-sm text-emerald-600">Mensaje enviado correctamente.</p>}
      {status === "error" && <p className="text-sm text-destructive">Ocurrió un error. Intenta nuevamente.</p>}
    </form>
  );
}
```

```ts
// src/app/api/contacto/route.ts
import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validations/contact.schema";
import { db } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";

async function verifyTurnstile(token: string, ip: string) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const captchaOk = await verifyTurnstile(parsed.data.captchaToken, ip);
  if (!captchaOk) {
    return NextResponse.json({ error: "Verificación anti-bot fallida" }, { status: 400 });
  }

  await db.contactMessage.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: sanitizeHtml(parsed.data.message),
      ip,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

---

## 8. Block Builder (CMS modular)

### 8.1 Tipos compartidos

```ts
// src/types/blocks.ts
export type BlockType = "carousel" | "stats" | "cards" | "table" | "form" | "chart";

export interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
  isActive: boolean;
}

export interface CarouselBlock extends BaseBlock {
  type: "carousel";
  data: { items: { imageUrl: string; caption?: string; link?: string }[] };
}

export interface StatsBlock extends BaseBlock {
  type: "stats";
  data: { items: { label: string; value: string; icon?: string }[] };
}

export interface CardsBlock extends BaseBlock {
  type: "cards";
  data: { items: { title: string; description: string; badge?: string; imageUrl?: string }[] };
}

export interface TableBlock extends BaseBlock {
  type: "table";
  data: { columns: string[]; rows: string[][] };
}

export interface FormBlock extends BaseBlock {
  type: "form";
  data: { title: string; fields: { name: string; label: string; type: "text" | "email" | "tel" | "textarea"; required: boolean }[] };
}

export interface ChartBlock extends BaseBlock {
  type: "chart";
  data: { chartType: "bar" | "line" | "pie"; labels: string[]; series: { name: string; values: number[] }[] };
}

export type PageBlock = CarouselBlock | StatsBlock | CardsBlock | TableBlock | FormBlock | ChartBlock;

export interface ProvisoriaResponse {
  provisoria: {
    numeroArriendo: number;
    nombres: string;
    rut: string;
    direccion: string;
    descripcion: string;
    estado: "VIGENTE" | "INACTIVO";
    deuda: number;
  };
}
```

### 8.2 Renderer central (usado tanto en la landing pública como en el preview del admin)

```tsx
// src/components/blocks/block-renderer.tsx
import type { PageBlock } from "@/types/blocks";
import { CarouselBlockView } from "./carousel-block";
import { StatsBlockView } from "./stats-block";
import { CardsBlockView } from "./cards-block";
import { TableBlockView } from "./table-block";
import { FormBlockView } from "./form-block";
import { ChartBlockView } from "./chart-block";

export function BlockRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <>
      {blocks
        .filter((b) => b.isActive)
        .sort((a, b) => a.order - b.order)
        .map((block) => {
          switch (block.type) {
            case "carousel": return <CarouselBlockView key={block.id} data={block.data} />;
            case "stats": return <StatsBlockView key={block.id} data={block.data} />;
            case "cards": return <CardsBlockView key={block.id} data={block.data} />;
            case "table": return <TableBlockView key={block.id} data={block.data} />;
            case "form": return <FormBlockView key={block.id} data={block.data} />;
            case "chart": return <ChartBlockView key={block.id} data={block.data} />;
            default: return null;
          }
        })}
    </>
  );
}
```

```tsx
// src/components/blocks/stats-block.tsx
export function StatsBlockView({ data }: { data: { items: { label: string; value: string }[] } }) {
  return (
    <section className="grid grid-cols-2 gap-4 py-10 md:grid-cols-4">
      {data.items.map((item, i) => (
        <div key={i} className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <p className="text-3xl font-bold text-primary">{item.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </section>
  );
}
```

```tsx
// src/components/blocks/chart-block.tsx
"use client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#0ea5e9", "#f97316", "#22c55e", "#a855f7", "#ef4444"];

export function ChartBlockView({ data }: { data: { chartType: "bar" | "line" | "pie"; labels: string[]; series: { name: string; values: number[] }[] } }) {
  const chartData = data.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    data.series.forEach((s) => (row[s.name] = s.values[i]));
    return row;
  });

  return (
    <div className="h-80 w-full py-8">
      <ResponsiveContainer>
        {data.chartType === "bar" ? (
          <BarChart data={chartData}>
            <XAxis dataKey="label" /><YAxis /><Tooltip />
            {data.series.map((s, i) => <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} />)}
          </BarChart>
        ) : data.chartType === "line" ? (
          <LineChart data={chartData}>
            <XAxis dataKey="label" /><YAxis /><Tooltip />
            {data.series.map((s, i) => <Line key={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} />)}
          </LineChart>
        ) : (
          <PieChart>
            <Pie data={chartData} dataKey={data.series[0]?.name} nameKey="label" outerRadius={100}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
```

### 8.3 API de bloques (CRUD + reordenamiento)

```ts
// src/app/api/bloques/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const reorderSchema = z.object({
  pageId: z.string(),
  blocks: z.array(z.object({ id: z.string(), order: z.number().int().min(0) })),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = reorderSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.$transaction(
    parsed.data.blocks.map((b) =>
      db.block.update({ where: { id: b.id }, data: { order: b.order } })
    )
  );

  return NextResponse.json({ ok: true });
}
```

### 8.4 Editor visual (drag & drop con dnd-kit) — esqueleto

```tsx
// src/components/admin/block-editor-canvas.tsx
"use client";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useState } from "react";
import type { PageBlock } from "@/types/blocks";
import { SortableBlockItem } from "./sortable-block-item";

export function BlockEditorCanvas({ pageId, initialBlocks }: { pageId: string; initialBlocks: PageBlock[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);

  async function persistOrder(next: PageBlock[]) {
    setBlocks(next);
    await fetch("/api/bloques", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, blocks: next.map((b, i) => ({ id: b.id, order: i })) }),
    });
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = blocks.findIndex((b) => b.id === active.id);
        const newIndex = blocks.findIndex((b) => b.id === over.id);
        persistOrder(arrayMove(blocks, oldIndex, newIndex));
      }}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {blocks.map((block) => (
            <SortableBlockItem key={block.id} block={block} onToggle={(active) => {
              setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, isActive: active } : b)));
            }} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

---

## 9. Escena 3D del Hero (React Three Fiber)

```tsx
// src/components/three/valparaiso-scene.tsx
"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float, Environment } from "@react-three/drei";
import { Suspense } from "react";

export function ValparaisoScene() {
  return (
    <div className="h-[420px] w-full">
      <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} />

          {/* Cerros estilizados como bloques low-poly de colores (representación abstracta, sin IP de terceros) */}
          <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.6}>
            <group position={[-2, 0, 0]}>
              <mesh position={[0, 0.5, 0]}>
                <coneGeometry args={[1, 1.6, 4]} />
                <meshStandardMaterial color="#f97316" />
              </mesh>
            </group>
          </Float>

          <Float speed={0.9} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh position={[0.5, 0.3, -1]}>
              <boxGeometry args={[1.2, 1, 1.2]} />
              <meshStandardMaterial color="#0ea5e9" />
            </mesh>
          </Float>

          <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.7}>
            <mesh position={[2.2, 0.4, 0.5]}>
              <sphereGeometry args={[0.7, 32, 32]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </Float>

          <Environment preset="city" />
          <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.6} />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

---

## 10. Configuración global de seguridad (next.config.ts + variables de entorno)

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // oculta X-Powered-By: Next.js
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.s3.amazonaws.com" }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

```bash
# .env.example
DATABASE_URL="postgresql://user:pass@localhost:5432/pedro_montt"
AUTH_SECRET="genera-con-openssl-rand-base64-32"
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""
AWS_S3_BUCKET=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
UPSTASH_REDIS_REST_URL=""       # opcional, para rate limiting distribuido
UPSTASH_REDIS_REST_TOKEN=""     # opcional
```

---

## 11. Checklist de ciberseguridad cubierto

| Amenaza | Mitigación implementada |
|---|---|
| XSS | `DOMPurify` en contenido HTML del CMS; React escapa por defecto en JSX |
| CSRF | Cookies `sameSite`, mutaciones solo vía POST/PATCH con sesión validada server-side |
| SQL/NoSQL Injection | Prisma (queries parametrizadas) + validación Zod antes de tocar la DB |
| Fuerza bruta / DDoS ligero | Rate limiting por IP y ruta en middleware |
| Subida de archivos maliciosos | Validación de magic bytes, tamaño máximo, nombre generado server-side |
| Exposición de datos personales (RUT) | Enmascaramiento de RUT en la vista pública del escáner |
| Clickjacking | `X-Frame-Options: DENY`, `frame-ancestors 'none'` en CSP |
| Escalación de privilegios | Roles ADMIN/EDITOR verificados en middleware + en cada API sensible |
| Spam en formularios | Cloudflare Turnstile + rate limit dedicado |
| Fuga de stack/versión | `poweredByHeader: false` |

**Pendiente a nivel de infraestructura (fuera del código de la app):** WAF/CDN (Cloudflare) para DDoS volumétrico real, backups automatizados de la base de datos, y HTTPS forzado con certificado válido (Let's Encrypt o el que gestione el hosting).

---

## 12. Próximos pasos sugeridos

1. Definir con la directiva de la agrupación qué campos del RUT deben mostrarse públicamente (cumplimiento de protección de datos personales).
2. Confirmar si la API `yopagoenvalpo.cl` requiere autenticación/API key propia — hoy el proxy asume acceso público de solo lectura.
3. Elegir proveedor de almacenamiento de medios (S3, Cloudflare R2, o almacenamiento local del VPS) para ajustar `lib/s3.ts`.
4. Seed inicial de usuarios ADMIN (directiva) vía `prisma/seed.ts` con contraseñas temporales de un solo uso.
