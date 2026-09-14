import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Email único por corrida para no chocar con datos de una corrida anterior
  const user = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
  };

  let accessToken: string;
  let refreshToken: string;
  let taskId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mismo ValidationPipe global que se configura en main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    // Dejamos la base de test limpia para que la próxima corrida no choque
    await prisma.user.deleteMany({ where: { email: user.email } });
    await app.close();
  });

  it('POST /auth/register crea un usuario y devuelve tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(user.email);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/register rechaza un email duplicado', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(user).expect(409);
  });

  it('GET /tasks sin token devuelve 401', async () => {
    await request(app.getHttpServer()).get('/tasks').expect(401);
  });

  it('GET /tasks con token devuelve un array vacío al principio', async () => {
    const res = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('POST /tasks crea una tarea del usuario logueado', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Escribir tests e2e' })
      .expect(201);

    expect(res.body.title).toBe('Escribir tests e2e');
    expect(res.body.isCompleted).toBe(false);
    taskId = res.body.id;
  });

  it('PATCH /tasks/:id marca la tarea como completada', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isCompleted: true })
      .expect(200);

    expect(res.body.isCompleted).toBe(true);
  });

  it('otro usuario no puede ver ni tocar la tarea (403)', async () => {
    const otherUser = {
      email: `other-${Date.now()}@example.com`,
      password: 'password123',
    };

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(otherUser)
      .expect(201);

    const otherToken = registerRes.body.accessToken;

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await prisma.user.deleteMany({ where: { email: otherUser.email } });
  });

  it('POST /auth/login funciona con las credenciales creadas', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user)
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
  });

  it('POST /auth/login rechaza contraseña incorrecta', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'contraseña-incorrecta' })
      .expect(401);
  });

  it('POST /auth/refresh rota el refresh token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken); // rotó, no es el mismo

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('POST /auth/refresh rechaza un refresh token inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'esto-no-es-un-jwt-valido' })
      .expect(401);
  });

  it('DELETE /tasks/:id borra la tarea del dueño', async () => {
    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('GET /tasks/:id de una tarea borrada devuelve 404', async () => {
    await request(app.getHttpServer())
      .get(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('POST /auth/logout invalida el refresh token vigente', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // El mismo refresh token ya no debería funcionar después del logout
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
