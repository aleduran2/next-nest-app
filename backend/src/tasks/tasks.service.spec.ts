import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TasksService', () => {
  let service: TasksService;

  // Mockeamos solo los métodos de Prisma que TasksService usa.
  // No tocamos ninguna base de datos real en estos tests.
  const prismaMock = {
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  describe('findAll', () => {
    it('devuelve las tareas filtradas por userId, ordenadas por fecha', async () => {
      const tasks = [{ id: 1, title: 'a', userId: 7 }];
      prismaMock.task.findMany.mockResolvedValue(tasks);

      const result = await service.findAll(7);

      expect(result).toEqual(tasks);
      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: { userId: 7 },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findOneOwned', () => {
    it('lanza NotFoundException si la tarea no existe', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(service.findOneOwned(1, 7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ForbiddenException si la tarea es de otro usuario', async () => {
      prismaMock.task.findUnique.mockResolvedValue({ id: 1, userId: 99 });

      await expect(service.findOneOwned(1, 7)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('devuelve la tarea si pertenece al usuario', async () => {
      const task = { id: 1, userId: 7 };
      prismaMock.task.findUnique.mockResolvedValue(task);

      await expect(service.findOneOwned(1, 7)).resolves.toEqual(task);
    });
  });

  describe('create', () => {
    it('crea la tarea asociada al userId del token', async () => {
      const dto = { title: 'Nueva tarea' };
      const created = { id: 1, ...dto, userId: 7 };
      prismaMock.task.create.mockResolvedValue(created);

      const result = await service.create(dto as any, 7);

      expect(result).toEqual(created);
      expect(prismaMock.task.create).toHaveBeenCalledWith({
        data: { title: dto.title, userId: 7 },
      });
    });
  });

  describe('update', () => {
    it('no permite actualizar una tarea que no es del usuario', async () => {
      prismaMock.task.findUnique.mockResolvedValue({ id: 1, userId: 99 });

      await expect(
        service.update(1, { isCompleted: true }, 7),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.task.update).not.toHaveBeenCalled();
    });

    it('actualiza la tarea cuando es del usuario', async () => {
      prismaMock.task.findUnique.mockResolvedValue({ id: 1, userId: 7 });
      const updated = { id: 1, userId: 7, isCompleted: true };
      prismaMock.task.update.mockResolvedValue(updated);

      const result = await service.update(1, { isCompleted: true }, 7);

      expect(result).toEqual(updated);
      expect(prismaMock.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isCompleted: true },
      });
    });
  });

  describe('remove', () => {
    it('no permite borrar una tarea que no es del usuario', async () => {
      prismaMock.task.findUnique.mockResolvedValue({ id: 1, userId: 99 });

      await expect(service.remove(1, 7)).rejects.toThrow(ForbiddenException);
      expect(prismaMock.task.delete).not.toHaveBeenCalled();
    });

    it('borra la tarea cuando es del usuario', async () => {
      prismaMock.task.findUnique.mockResolvedValue({ id: 1, userId: 7 });

      await service.remove(1, 7);

      expect(prismaMock.task.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
