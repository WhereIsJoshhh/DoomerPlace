import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '../application/services/audit.service';
import { UpdateConfigDto, FilterAuditDto } from '../application/dtos/audit.dto';
import { Roles } from '@core/decorators/roles.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Auditoría y Configuración Global del Sistema')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Consultar logs de auditoría paginados (Solo Administradores)' })
  @ApiResponse({ status: 200, description: 'Registros de auditoría.' })
  async getLogs(@Query() filter: FilterAuditDto) {
    return this.auditService.getAuditLogs(filter);
  }

  @Post('config')
  @ApiOperation({ summary: 'Guardar o actualizar un parámetro de configuración global' })
  @ApiResponse({ status: 201, description: 'Parámetro guardado.' })
  async setConfig(@Body() dto: UpdateConfigDto) {
    return this.auditService.setConfig(dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Listar todos los parámetros de configuración global' })
  async getAllConfig() {
    return this.auditService.getAllConfig();
  }
}
