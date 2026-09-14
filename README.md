# Tasks App — Next.js + NestJS (auth, roles, archivos, deploy)

App de ejemplo full-stack: **Next.js (App Router + TypeScript + Tailwind)** consumiendo una API en **NestJS**, con autenticación JWT (access + refresh con rotación), roles (RBAC), subida de archivos, manejo de errores consistente, rate limiting, testing (unit + e2e) y Swagger. Pensada para practicar el stack y tener algo real para mostrar en un repo.

## Estructura

```
.
├── backend/     → API REST en NestJS (puerto 4000)
├── frontend/    → App en Next.js (puerto 3000)
└── render.yaml  → config de deploy del backend en Render
```

## Backend — setup local

```bash
cd backend
npm install
cp .env.example .env
docker compose up -d db              # levanta Postgres local en el puerto 5432
npx prisma migrate dev --name init   # crea las tablas
npm run start:dev
```

Levanta en `http://localhost:4000`. Docs interactivas en `http://localhost:4000/api/docs`.

## Frontend — setup local

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Levanta en `http://localhost:3000`.

## Endpoints

### Auth (públicos, salvo `/auth/logout`)

| Método | Ruta            | Body / Auth                          | Notas                                          |
|--------|-----------------|----------------------------------------|-------------------------------------------------|
| POST   | /auth/register  | `{ email, password }`                  | Máx. 10/min por IP. Siempre crea role `USER`.  |
| POST   | /auth/login     | `{ email, password }`                  | Máx. 5/min por IP (anti fuerza bruta).         |
| POST   | /auth/refresh   | `{ refreshToken }`                     | Rota el refresh token.                          |
| POST   | /auth/logout    | Header `Authorization: Bearer <token>` | Invalida el refresh token guardado.            |

### Tasks (requieren `Authorization: Bearer <accessToken>`)

| Método | Ruta            | Descripción                                    |
|--------|-----------------|--------------------------------------------------|
| GET    | /tasks          | Tareas del usuario logueado                      |
| GET    | /tasks/admin/all| **Solo ADMIN** — tareas de todos los usuarios    |
| GET    | /tasks/:id      | Una tarea propia                                 |
| POST   | /tasks          | Crea una tarea (`{title}`)                       |
| PATCH  | /tasks/:id      | Actualiza título/estado                          |
| DELETE | /tasks/:id      | Elimina una tarea propia                         |

### Users (requieren `Authorization: Bearer <accessToken>`)

| Método | Ruta               | Descripción                                  |
|--------|--------------------|-------------------------------------------------|
| GET    | /users/me          | Perfil propio (email, role, avatarUrl)         |
| GET    | /users             | **Solo ADMIN** — lista todos los usuarios       |
| POST   | /users/me/avatar   | Sube el avatar (`multipart/form-data`, campo `file`, PNG/JPEG/WEBP, máx. 2MB) |

## Roles (RBAC)

Cada `User` tiene un `role`: `USER` (default) o `ADMIN`. El role viaja **adentro del JWT** (se firma en `AuthService.issueTokens`), así que `RolesGuard` no necesita ir a buscarlo a la base en cada request — solo lee el token ya validado por `JwtAuthGuard`.

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Get('admin/all')
findAllAsAdmin() { ... }
```

**Nadie puede auto-asignarse ADMIN**: el registro (`/auth/register`) siempre crea usuarios `USER`. Para promover a alguien a admin (solo vos, a mano, mientras aprendés):

```bash
npx prisma studio
# Users → editá la fila → role: ADMIN → save
```

Ojo: como el role queda "congelado" dentro del JWT al momento de loguearse, si promovés a un usuario que ya tenía sesión iniciada, tiene que volver a loguearse (o esperar a que su access token expire y se refresque) para que el nuevo role se refleje.

## Manejo de errores

`AllExceptionsFilter` (filtro global en `main.ts`) intercepta **todas** las excepciones —las esperadas (`404`, `403`, `409`, errores de validación) y las inesperadas (bugs, `500`)— y siempre devuelve la misma forma:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Task #5 no encontrada",
  "path": "/tasks/5",
  "timestamp": "2026-09-14T18:00:00.000Z"
}
```

Los `500` además se loggean del lado del servidor con el stack completo (nunca se lo mandamos al cliente). Los `4xx` no se loggean como error: son tráfico normal (alguien mandó mal un dato, no es un bug).

## Rate limiting

`@nestjs/throttler`, con un límite general de 100 req/min por IP para toda la API, y límites más estrictos en los endpoints de auth: **5/min en `/auth/login`**, 10/min en `/auth/register`. Si alguien intenta adivinar contraseñas a fuerza bruta, se frena ahí.

## Subida de archivos

`POST /users/me/avatar` recibe la imagen con `multer` (`FileInterceptor`), la guarda en `backend/uploads/` con un nombre random (`randomUUID()`, nunca el nombre original del archivo — evita path traversal y colisiones), valida el tipo (`image/png`, `image/jpeg`, `image/webp`) y el tamaño (máx. 2MB) **antes** de guardarla, y sirve la carpeta como estática (`app.useStaticAssets` en `main.ts`), así queda accesible en `http://localhost:4000/uploads/<archivo>`.

En el frontend, `lib/users.ts` maneja el upload con `FormData` (sin poner `Content-Type` a mano — el navegador arma el boundary del `multipart/form-data` solo). La home muestra el avatar arriba de la lista de tareas; click para cambiarlo.

## Testing

### Backend

```bash
cd backend
npm test          # unit — todo mockeado (Prisma, JWT, bcrypt), rápido
npm run test:e2e  # e2e — app real contra Postgres de test (tasks_test)
```

`pretest:e2e` sincroniza el schema en `tasks_test` (`prisma db push`) antes de cada corrida.

### Frontend

```bash
cd frontend
npm test
```

Jest + React Testing Library (config con `next/jest`), todo mockeado (`lib/auth`, `lib/api`, `fetch`) — nunca pega contra un backend real.

## Deploy real

### Backend → Render

1. Subí una base Postgres gestionada (Render, Neon o Supabase — cualquiera te da una `DATABASE_URL`).
2. En Render: **New → Blueprint**, apuntá al repo — Render lee `render.yaml` (en la raíz) y configura el servicio solo.
3. Completá a mano en el dashboard las env vars marcadas `sync: false`: `DATABASE_URL` (la de tu Postgres) y `FRONTEND_URL` (la URL que te dé Vercel en el paso siguiente).
4. `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` se generan solos (`generateValue: true`).
5. El `startCommand` corre `prisma migrate deploy` antes de levantar el server, así las migraciones se aplican solas en cada deploy.

### Frontend → Vercel

1. Import Project desde el repo de GitHub, **Root Directory: `frontend`**.
2. Variable de entorno: `NEXT_PUBLIC_API_URL` = la URL que te dio Render (ej. `https://next-nest-app-backend.onrender.com`).
3. Deploy. Vercel detecta Next.js solo, no hace falta config adicional.

Con los dos deploys hechos, actualizá `FRONTEND_URL` en Render con la URL final de Vercel (para que CORS deje pasar las requests) y volvé a desplegar el backend.

## Subir tus cambios a GitHub

```bash
git add .
git commit -m "..."
git push
```
