# Tasks App — Next.js + NestJS + Auth JWT + Prisma

App de ejemplo full-stack: **Next.js (App Router + TypeScript + Tailwind)** consumiendo una API en **NestJS**, con **autenticación JWT** y persistencia real en **SQLite vía Prisma**.

CRUD de tareas donde cada usuario solo ve y edita sus propias tareas.

## Estructura

```
.
├── backend/    → API REST en NestJS (puerto 4000) + Prisma + JWT
└── frontend/   → App en Next.js (puerto 3000)
```

## Backend — NestJS + Prisma + JWT

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init   # crea prisma/dev.db y las tablas
npm run start:dev
```

Levanta en `http://localhost:4000`.

### Endpoints de auth (públicos, salvo `/auth/logout`)

| Método | Ruta            | Body / Auth                          | Devuelve                            |
|--------|-----------------|----------------------------------------|--------------------------------------|
| POST   | /auth/register  | `{ email, password }`                  | `{ accessToken, refreshToken, user }`|
| POST   | /auth/login     | `{ email, password }`                  | `{ accessToken, refreshToken, user }`|
| POST   | /auth/refresh   | `{ refreshToken }`                     | `{ accessToken, refreshToken, user }`|
| POST   | /auth/logout    | Header `Authorization: Bearer <token>` | `{ loggedOut: true }`               |

### Endpoints de tareas (requieren `Authorization: Bearer <token>`)

| Método | Ruta         | Descripción                          |
|--------|--------------|----------------------------------------|
| GET    | /tasks       | Lista las tareas del usuario logueado |
| GET    | /tasks/:id   | Obtiene una tarea (si es tuya)        |
| POST   | /tasks       | Crea una tarea (`{title}`)             |
| PATCH  | /tasks/:id   | Actualiza (título/estado)              |
| DELETE | /tasks/:id   | Elimina una tarea                      |

Si el token falta, venció o es inválido, estas rutas devuelven `401`. Si el token es válido pero la tarea es de otro usuario, devuelven `403`.

Podés inspeccionar la base de datos con `npx prisma studio` (abre una UI en el navegador).

## Auth: access token + refresh token

- **Access token** (15 min, `JWT_ACCESS_SECRET`): va en `Authorization: Bearer <token>` en cada request a `/tasks`. Corto a propósito: si se filtra, el daño posible dura poco.
- **Refresh token** (7 días, `JWT_REFRESH_SECRET`): solo sirve para pedir un access token nuevo en `POST /auth/refresh`. Se guarda **hasheado** en la columna `hashedRefreshToken` de `User`, igual que la contraseña.
- **Rotación**: cada vez que se usa un refresh token para renovar, el backend genera un par nuevo (access + refresh) y descarta el hash viejo. Si alguien reutiliza un refresh token ya usado, el hash no matchea y el backend responde `401`.
- **Logout real**: `POST /auth/logout` (requiere access token vigente) borra el `hashedRefreshToken` del usuario en la DB, así que ese refresh token queda inválido aunque todavía no haya vencido.
- El frontend (`lib/api.ts`) intercepta cualquier `401` en `/tasks`, intenta renovar sola con `POST /auth/refresh`, reintenta la request original una vez, y si el refresh también falla, recién ahí manda al usuario a `/login`.

## Frontend — Next.js

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Levanta en `http://localhost:3000`.

- `/register` y `/login` — crean cuenta o inician sesión y guardan el JWT en `localStorage`.
- `/` — página de tareas, protegida: si no hay token válido, redirige a `/login`. Todas las llamadas a `/tasks` mandan el header `Authorization: Bearer <token>` automáticamente (ver `lib/api.ts`).
- Si el backend responde `401` (token vencido), el frontend limpia el token y redirige a `/login` solo.

## Puntos clave del proyecto (para explicarlo en una entrevista o README de perfil)

- **Hash de contraseñas**: nunca se guarda la contraseña en texto plano, se usa `bcrypt` (`AuthService.register`).
- **JWT stateless**: el backend no guarda sesiones, solo firma un token con `sub` (id de usuario) y `email`, y lo valida en cada request vía `JwtStrategy` + `JwtAuthGuard`.
- **Autorización por dueño de recurso**: `TasksService.findOneOwned` chequea que la tarea pertenezca al usuario del token antes de dejarlo editar/borrar (si no, `403 Forbidden`).
- **Prisma como capa de datos**: el `schema.prisma` define `User` y `Task` con una relación 1-a-N; migrar a Postgres en producción es solo cambiar el `provider` del datasource.
- **CORS**: sigue habilitado explícitamente para `http://localhost:3000` en `main.ts`.
- **Manejo de sesión en el cliente**: `lib/auth.ts` centraliza guardar/leer/borrar el token; `lib/api.ts` lo inyecta en cada fetch y desloguea automáticamente ante un `401`.

## Cómo subir esto a tu propio repo de GitHub

```bash
cd fullstack-tasks-app
git init
git add .
git commit -m "Initial commit: Next.js + NestJS + JWT auth + Prisma"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/NOMBRE_DEL_REPO.git
git push -u origin main
```

(Creá antes el repo vacío en GitHub, sin README, para que no choque con el `git push`. El `.gitignore` ya excluye `node_modules`, `.env` y el archivo `dev.db`.)
