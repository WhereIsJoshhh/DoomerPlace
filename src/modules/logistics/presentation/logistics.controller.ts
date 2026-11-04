import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LogisticsService } from '../application/services/logistics.service';
import { CreateShipmentDto } from '../application/dtos/create-shipment.dto';
import { UpdateTrackingDto } from '../application/dtos/update-tracking.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Roles } from '@core/decorators/roles.decorator';
import { Public } from '@core/decorators/public.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Logística, Envíos y Guías de Rastreo')
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('shipments')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Generar guía de despacho para un SubPedido (Vendedor o Admin)' })
  @ApiResponse({ status: 201, description: 'Guía y envío creados con éxito.' })
  @ApiResponse({ status: 400, description: 'El subpedido ya cuenta con un envío activo.' })
  async createShipment(
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('roles') roles: string[],
    @Body() dto: CreateShipmentDto,
  ) {
    const esAdmin = roles?.includes('SUPER_ADMIN') || roles?.includes('ADMIN');
    return this.logisticsService.createShipment(usuarioId, dto, esAdmin);
  }

  @Post('tracking/:numeroGuia')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar evento de tracking / Webhook de courier logístico',
    description:
      'Permite recibir actualizaciones de estado (EN_TRANSITO, EN_REPARTO, ENTREGADO). Transiciona automáticamente subpedidos y libera balances.',
  })
  @ApiResponse({ status: 200, description: 'Hito de rastreo registrado correctamente.' })
  async addTrackingEvent(
    @Param('numeroGuia') numeroGuia: string,
    @Body() dto: UpdateTrackingDto,
  ) {
    return this.logisticsService.addTrackingEvent(numeroGuia, dto);
  }

  @Get('tracking/:numeroGuia')
  @Public()
  @ApiOperation({ summary: 'Consulta pública de rastreo de paquete por número de guía' })
  @ApiResponse({ status: 200, description: 'Línea de tiempo y estado actual del envío.' })
  @ApiResponse({ status: 404, description: 'Número de guía no encontrado.' })
  async getTracking(@Param('numeroGuia') numeroGuia: string) {
    return this.logisticsService.getTracking(numeroGuia);
  }
}
