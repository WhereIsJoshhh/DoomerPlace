import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from '../application/services/users.service';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso, EstadoUsuario } from '@prisma/client';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener información del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil, roles y permisos del usuario actual.' })
  async getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get()
  @RequirePermissions({ modulo: 'USUARIOS', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Listado administrativo de usuarios (Paginado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuarios.' })
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.usersService.findAll(parseInt(page, 10), parseInt(limit, 10));
  }

  @Patch(':id/status')
  @RequirePermissions({ modulo: 'USUARIOS', accion: AccionPermiso.ACTUALIZAR })
  @ApiOperation({ summary: 'Actualizar estado de un usuario (ACTIVO, INACTIVO, SUSPENDIDO)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado correctamente.' })
  async updateStatus(
    @Param('id') id: string,
    @Body('estado') estado: EstadoUsuario,
  ) {
    return this.usersService.updateStatus(id, estado);
  }
}
