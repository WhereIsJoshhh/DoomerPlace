import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Headers,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrdersService } from '../application/services/orders.service';
import { CreateOrderDto } from '../application/dtos/create-order.dto';
import { FilterOrdersDto } from '../application/dtos/filter-orders.dto';
import { UpdateSubOrderStatusDto } from '../application/dtos/update-order-status.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { Roles } from '@core/decorators/roles.decorator';

@ApiTags('Gestión de Pedidos y Split Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear pedido a partir del carrito activo (Split Orders por tienda)',
    description:
      'Valida stock, reserva mediante bloqueo distribuido con TTL 15 min, genera snapshots contables inmutables y divide en subpedidos.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Clave única para evitar duplicación de pedidos.',
  })
  @ApiResponse({ status: 201, description: 'Pedido creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente o carrito vacío.' })
  async create(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Ip() ip?: string,
  ) {
    return this.ordersService.createOrder(usuarioId, dto, idempotencyKey, ip);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Obtener pedidos del cliente autenticado con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pedidos del usuario.' })
  async findMyOrders(
    @CurrentUser('userId') usuarioId: string,
    @Query() filter: FilterOrdersDto,
  ) {
    return this.ordersService.findMyOrders(usuarioId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un pedido por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del pedido y sus subpedidos.' })
  @ApiResponse({ status: 404, description: 'Pedido no encontrado.' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('roles') roles: string[],
  ) {
    const esAdmin = roles?.includes('SUPER_ADMIN') || roles?.includes('ADMIN');
    return this.ordersService.findById(id, usuarioId, esAdmin);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar un pedido y liberar las reservas de inventario' })
  @ApiResponse({ status: 200, description: 'Pedido cancelado y stock liberado.' })
  @ApiResponse({ status: 400, description: 'El pedido no puede ser cancelado en su estado actual.' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('userId') usuarioId: string,
    @Body('motivo') motivo?: string,
  ) {
    return this.ordersService.cancelOrder(id, usuarioId, motivo);
  }

  @Patch('subpedidos/:id/status')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Actualizar estado de un SubPedido (Vendedor o Admin)' })
  @ApiResponse({ status: 200, description: 'Estado de subpedido actualizado correctamente.' })
  async updateSubOrderStatus(
    @Param('id') id: string,
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('roles') roles: string[],
    @Body() dto: UpdateSubOrderStatusDto,
  ) {
    const esAdmin = roles?.includes('SUPER_ADMIN') || roles?.includes('ADMIN');
    return this.ordersService.updateSubOrderStatus(id, usuarioId, dto, esAdmin);
  }
}
