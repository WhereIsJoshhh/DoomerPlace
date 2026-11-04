import {
  Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from '../application/services/inventory.service';
import { AdjustInventoryDto } from '../application/dtos/adjust-inventory.dto';
import { ReserveStockDto, ReleaseReservationDto } from '../application/dtos/reserve-stock.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso } from '@prisma/client';

@ApiTags('Inventario y Kardex')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('store/:tiendaId')
  @RequirePermissions({ modulo: 'INVENTARIO', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Inventario completo de una tienda con alertas de stock mínimo' })
  @ApiResponse({ status: 200, description: 'Lista de inventarios con flag alertaStockMinimo.' })
  async findByTienda(@Param('tiendaId') tiendaId: string) {
    return this.inventoryService.findByTienda(tiendaId);
  }

  @Get('variant/:varianteId')
  @RequirePermissions({ modulo: 'INVENTARIO', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Inventario actual de una variante específica' })
  async findByVariante(@Param('varianteId') varianteId: string) {
    return this.inventoryService.findByVariante(varianteId);
  }

  @Get('product/:productoId')
  @RequirePermissions({ modulo: 'INVENTARIO', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Inventario de un producto simple' })
  async findByProducto(@Param('productoId') productoId: string) {
    return this.inventoryService.findByProducto(productoId);
  }

  @Get(':id/kardex')
  @RequirePermissions({ modulo: 'INVENTARIO', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Historial de movimientos Kardex de un inventario (paginado)' })
  @ApiResponse({ status: 200, description: 'Registro Kardex inmutable con trazabilidad completa.' })
  async getKardex(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.inventoryService.getKardex(id, parseInt(page), parseInt(limit));
  }

  @Post(':id/adjust')
  @RequirePermissions({ modulo: 'INVENTARIO', accion: AccionPermiso.ACTUALIZAR })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ajuste manual de inventario con registro Kardex (AJUSTE_POSITIVO/NEGATIVO, ENTRADA_COMPRA, DEVOLUCION_RMA)' })
  @ApiResponse({ status: 200, description: 'Inventario actualizado y movimiento Kardex registrado.' })
  async adjustInventory(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustInventory(id, userId, dto);
  }

  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reservar stock durante proceso de Checkout (TTL 15 min, con bloqueo distribuido)' })
  @ApiResponse({ status: 200, description: 'Stock reservado exitosamente con TTL de 15 minutos.' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente o bloqueo concurrente activo.' })
  async reserveStock(
    @CurrentUser('userId') userId: string,
    @Body() dto: ReserveStockDto,
  ) {
    return this.inventoryService.reserveStock(userId, dto);
  }

  @Post('release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liberar reserva de stock (TTL expirado, pago fallido o carrito abandonado)' })
  @ApiResponse({ status: 200, description: 'Reserva liberada y stock disponible restablecido.' })
  async releaseReservation(
    @CurrentUser('userId') userId: string,
    @Body() dto: ReleaseReservationDto,
  ) {
    return this.inventoryService.releaseReservation(userId, dto);
  }
}
