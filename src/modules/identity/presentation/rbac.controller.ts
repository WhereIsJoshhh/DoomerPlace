import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from '../application/services/rbac.service';
import { CreateRoleDto } from '../application/dtos/create-role.dto';
import { AssignRolesDto } from '../application/dtos/assign-roles.dto';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso } from '@prisma/client';

@ApiTags('Control de Acceso (RBAC)')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermissions({ modulo: 'ROLES', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Listar todos los roles del sistema con sus permisos' })
  @ApiResponse({ status: 200, description: 'Listado completo de roles.' })
  async getRoles() {
    return this.rbacService.findAllRoles();
  }

  @Post('roles')
  @RequirePermissions({ modulo: 'ROLES', accion: AccionPermiso.CREAR })
  @ApiOperation({ summary: 'Crear un nuevo rol en la plataforma' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente.' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Post('users/:usuarioId/roles')
  @RequirePermissions({ modulo: 'ROLES', accion: AccionPermiso.ACTUALIZAR })
  @ApiOperation({ summary: 'Asignar o sincronizar roles a un usuario (N:M)' })
  @ApiResponse({ status: 200, description: 'Roles actualizados para el usuario.' })
  async assignRoles(
    @Param('usuarioId') usuarioId: string,
    @Body() dto: AssignRolesDto,
  ) {
    return this.rbacService.assignRolesToUser(usuarioId, dto);
  }

  @Get('permissions')
  @RequirePermissions({ modulo: 'ROLES', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Listar catálogo completo de permisos atómicos' })
  @ApiResponse({ status: 200, description: 'Lista de permisos clasificados por módulo y acción.' })
  async getPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Post('roles/:id/permissions')
  @RequirePermissions({ modulo: 'ROLES', accion: AccionPermiso.ACTUALIZAR })
  @ApiOperation({ summary: 'Sincronizar permisos asociados a un rol específico' })
  @ApiResponse({ status: 200, description: 'Permisos del rol sincronizados.' })
  async syncPermissions(
    @Param('id') id: string,
    @Body('permisoIds') permisoIds: string[],
  ) {
    return this.rbacService.syncRolePermissions(id, permisoIds || []);
  }
}
