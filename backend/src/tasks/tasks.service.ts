import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Solo para admins: todas las tareas de todos los usuarios. */
  findAllAsAdmin() {
    return this.prisma.task.findMany({
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findOneOwned(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task #${id} no encontrada`);
    }
    if (task.userId !== userId) {
      // No decimos "no es tuya", devolvemos 403 sin filtrar info de otros usuarios
      throw new ForbiddenException('No tenés acceso a esta tarea');
    }
    return task;
  }

  create(dto: CreateTaskDto, userId: number) {
    return this.prisma.task.create({
      data: { title: dto.title, userId },
    });
  }

  async update(id: number, dto: UpdateTaskDto, userId: number) {
    await this.findOneOwned(id, userId);
    return this.prisma.task.update({ where: { id }, data: dto });
  }

  async remove(id: number, userId: number) {
    await this.findOneOwned(id, userId);
    await this.prisma.task.delete({ where: { id } });
  }
}
