import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

// Todas las rutas de este controller requieren un JWT válido
// (header: Authorization: Bearer <token>)
@ApiTags('tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Lista las tareas del usuario autenticado' })
  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.findAll(user.userId);
  }

  @ApiOperation({
    summary: '[Solo admin] Lista TODAS las tareas de TODOS los usuarios',
  })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/all')
  findAllAsAdmin() {
    return this.tasksService.findAllAsAdmin();
  }

  @ApiOperation({ summary: 'Obtiene una tarea propia por id' })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.findOneOwned(id, user.userId);
  }

  @ApiOperation({ summary: 'Crea una tarea nueva para el usuario autenticado' })
  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: CurrentUserPayload) {
    return this.tasksService.create(dto, user.userId);
  }

  @ApiOperation({ summary: 'Actualiza título y/o estado de una tarea propia' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.update(id, dto, user.userId);
  }

  @ApiOperation({ summary: 'Elimina una tarea propia' })
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tasksService.remove(id, user.userId);
    return { deleted: true };
  }
}
