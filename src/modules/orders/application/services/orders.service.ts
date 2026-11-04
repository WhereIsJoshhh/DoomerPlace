import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { InventoryService } from '@modules/inventory/application/services/inventory.service';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { FilterOrdersDto, FilterSubOrdersDto } from '../dtos/filter-orders.dto';
import { UpdateOrderStatusDto, UpdateSubOrderStatusDto } from '../dtos/update-order-status.dto';
import {
  EstadoCarrito,
  EstadoPedido,
  EstadoSubPedido,
  Prisma,
} from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Genera un número de pedido único con formato ORD-YYYYMMDD-XXXX
   */
  private generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(100000 + Math.random() * 900000);
    return `ORD-${date}-${random}`;
  }

  /**
   * Crea un nuevo pedido madre y divide en SubPedidos por tienda (Split Orders).
   * Almacena snapshots inmutables de productos, variantes, precios y SKUs.
   * Reserva stock mediante el InventoryService con TTL de 15 minutos.
   */
  async createOrder(
    usuarioId: string,
    dto: CreateOrderDto,
    idempotencyKey?: string,
    ipCliente?: string,
  ) {
    // 1. Validar dirección de envío
    const direccionEnvio = await this.prisma.direccion.findFirst({
      where: { id: dto.direccionEnvioId, usuarioId },
    });
    if (!direccionEnvio) {
      throw new NotFoundException('Dirección de envío no encontrada o no pertenece al usuario.');
    }

    const direccionFacturacionId = dto.direccionFacturacionId || dto.direccionEnvioId;
    if (dto.direccionFacturacionId && dto.direccionFacturacionId !== dto.direccionEnvioId) {
      const direccionFacturacion = await this.prisma.direccion.findFirst({
        where: { id: dto.direccionFacturacionId, usuarioId },
      });
      if (!direccionFacturacion) {
        throw new NotFoundException('Dirección de facturación no encontrada.');
      }
    }

    // 2. Obtener el carrito activo del usuario con sus ítems
    const carrito = await this.prisma.carrito.findFirst({
      where: { usuarioId, estado: EstadoCarrito.ACTIVO },
      include: { items: true },
    });

    if (!carrito || carrito.items.length === 0) {
      throw new BadRequestException('El carrito de compras está vacío.');
    }

    // 3. Obtener detalles de productos, variantes e inventarios para validación y snapshots
    const itemsDetallados = await Promise.all(
      carrito.items.map(async (item) => {
        const producto = await this.prisma.producto.findUnique({
          where: { id: item.productoId },
          include: {
            tienda: {
              include: {
                vendedor: {
                  select: { porcentajeComisionBase: true, id: true },
                },
              },
            },
          },
        });

        if (!producto || producto.estado !== 'ACTIVO') {
          throw new BadRequestException(
            `El producto "${producto?.nombre || item.productoId}" ya no se encuentra disponible.`,
          );
        }

        let variante = null;
        let inventarioId: string | null = null;
        let precioFinal = Number(item.precioUnitario);
        let costoUnitario: number | null = null;
        let nombreSnapshot = producto.nombre;
        let skuSnapshot = producto.skuBase;

        if (item.varianteId) {
          variante = await this.prisma.productoVariante.findUnique({
            where: { id: item.varianteId },
            include: { inventario: true },
          });

          if (!variante || !variante.estado) {
            throw new BadRequestException(
              `La variante solicitada para el producto "${producto.nombre}" no está disponible.`,
            );
          }

          precioFinal = Number(variante.precio);
          costoUnitario = variante.costo ? Number(variante.costo) : null;
          nombreSnapshot = `${producto.nombre} - ${variante.nombreVariante}`;
          skuSnapshot = variante.sku;
          inventarioId = variante.inventario?.id || null;
        } else {
          const inv = await this.prisma.inventario.findUnique({
            where: { productoId: item.productoId },
          });
          inventarioId = inv?.id || null;
        }

        if (!inventarioId) {
          throw new BadRequestException(
            `No se encontró registro de inventario para el producto "${nombreSnapshot}".`,
          );
        }

        return {
          cartItem: item,
          producto,
          variante,
          inventarioId,
          precioFinal,
          costoUnitario,
          nombreSnapshot,
          skuSnapshot,
          tiendaId: producto.tiendaId,
          porcentajeComision: Number(producto.tienda.vendedor.porcentajeComisionBase || 10.0),
        };
      }),
    );

    const numeroPedido = this.generateOrderNumber();

    // 4. Reservar stock para cada ítem en el servicio de inventario (con TTL de 15 min)
    for (const itemDetalle of itemsDetallados) {
      await this.inventoryService.reserveStock(usuarioId, {
        inventarioId: itemDetalle.inventarioId,
        cantidad: itemDetalle.cartItem.cantidad,
        referenciaId: numeroPedido,
      });
    }

    // 5. Agrupar ítems por Tienda (Split Orders)
    const itemsPorTienda = new Map<string, typeof itemsDetallados>();
    for (const item of itemsDetallados) {
      const group = itemsPorTienda.get(item.tiendaId) || [];
      group.push(item);
      itemsPorTienda.set(item.tiendaId, group);
    }

    // 6. Transacción atómica en Base de Datos: crear Pedido Madre, SubPedidos y Snapshots
    return this.prisma.$transaction(async (tx) => {
      let subtotalGeneral = 0;
      let impuestoTotalGeneral = 0;
      let costoEnvioGeneral = 0;
      let totalGeneral = 0;

      // Estructura para crear SubPedidos y sus Items
      const subPedidosData: any[] = [];
      let subIndex = 1;

      for (const [tiendaId, storeItems] of itemsPorTienda.entries()) {
        const numeroSubPedido = `${numeroPedido}-${String(subIndex).padStart(2, '0')}`;
        subIndex++;

        let subtotalTienda = 0;
        let impuestoTienda = 0;
        const costoEnvioTienda = 0; // Configurable según logística
        const comisionPorcentaje = storeItems[0].porcentajeComision;

        const subPedidoItemsData: any[] = [];

        for (const item of storeItems) {
          const subtotalItem = item.precioFinal * item.cartItem.cantidad;
          const impuestoItem = 0; // Puede calcularse según régimen fiscal

          subtotalTienda += subtotalItem;
          impuestoTienda += impuestoItem;

          subPedidoItemsData.push({
            productoId: item.cartItem.productoId,
            varianteId: item.cartItem.varianteId,
            nombreProductoSnapshot: item.nombreSnapshot,
            skuSnapshot: item.skuSnapshot,
            precioUnitario: new Prisma.Decimal(item.precioFinal),
            costoUnitario: item.costoUnitario ? new Prisma.Decimal(item.costoUnitario) : null,
            cantidad: item.cartItem.cantidad,
            descuento: new Prisma.Decimal(0),
            impuesto: new Prisma.Decimal(impuestoItem),
            subtotal: new Prisma.Decimal(subtotalItem),
          });
        }

        const totalTienda = subtotalTienda + impuestoTienda + costoEnvioTienda;
        const montoComision = Number(((subtotalTienda * comisionPorcentaje) / 100).toFixed(2));
        const montoNetoTienda = Number((totalTienda - montoComision).toFixed(2));

        subtotalGeneral += subtotalTienda;
        impuestoTotalGeneral += impuestoTienda;
        costoEnvioGeneral += costoEnvioTienda;
        totalGeneral += totalTienda;

        subPedidosData.push({
          tiendaId,
          numeroSubPedido,
          subtotal: new Prisma.Decimal(subtotalTienda),
          descuento: new Prisma.Decimal(0),
          impuesto: new Prisma.Decimal(impuestoTienda),
          costoEnvio: new Prisma.Decimal(costoEnvioTienda),
          total: new Prisma.Decimal(totalTienda),
          porcentajeComision: new Prisma.Decimal(comisionPorcentaje),
          montoComisionPlataforma: new Prisma.Decimal(montoComision),
          montoNetoTienda: new Prisma.Decimal(montoNetoTienda),
          estado: EstadoSubPedido.PENDIENTE,
          items: subPedidoItemsData,
        });
      }

      // Crear Pedido Madre
      const nuevoPedido = await tx.pedido.create({
        data: {
          usuarioId,
          numeroPedido,
          direccionEnvioId: dto.direccionEnvioId,
          direccionFacturacionId,
          subtotal: new Prisma.Decimal(subtotalGeneral),
          descuentoTotal: new Prisma.Decimal(0),
          impuestoTotal: new Prisma.Decimal(impuestoTotalGeneral),
          costoEnvioTotal: new Prisma.Decimal(costoEnvioGeneral),
          total: new Prisma.Decimal(totalGeneral),
          moneda: 'USD',
          estado: EstadoPedido.PENDIENTE_PAGO,
          ipCliente,
        },
      });

      // Crear SubPedidos y PedidoItems vinculados a Pedido y SubPedido
      for (const spData of subPedidosData) {
        const items = spData.items;
        delete spData.items;

        const subPedido = await tx.subPedido.create({
          data: {
            ...spData,
            pedidoId: nuevoPedido.id,
          },
        });

        for (const itemData of items) {
          await tx.pedidoItem.create({
            data: {
              ...itemData,
              pedidoId: nuevoPedido.id,
              subPedidoId: subPedido.id,
            },
          });
        }

        // Historial inicial del SubPedido
        await tx.historialEstadoPedido.create({
          data: {
            pedidoId: nuevoPedido.id,
            subPedidoId: subPedido.id,
            estadoAnterior: 'INICIAL',
            estadoNuevo: EstadoSubPedido.PENDIENTE,
            comentario: 'SubPedido generado a partir de Split Order.',
            cambiadoPorUsuarioId: usuarioId,
          },
        });
      }

      // Historial inicial del Pedido Madre
      await tx.historialEstadoPedido.create({
        data: {
          pedidoId: nuevoPedido.id,
          estadoAnterior: 'INICIAL',
          estadoNuevo: EstadoPedido.PENDIENTE_PAGO,
          comentario: 'Pedido madre creado, a la espera de confirmación de pago.',
          cambiadoPorUsuarioId: usuarioId,
        },
      });

      // Marcar carrito como CONVERTIDO y limpiar sus items
      await tx.carrito.update({
        where: { id: carrito.id },
        data: { estado: EstadoCarrito.CONVERTIDO },
      });
      await tx.carritoItem.deleteMany({
        where: { carritoId: carrito.id },
      });

      return tx.pedido.findUnique({
        where: { id: nuevoPedido.id },
        include: {
          subPedidos: {
            include: {
              tienda: { select: { id: true, nombre: true, slug: true } },
              items: true,
            },
          },
          direccionEnvio: true,
        },
      });
    });
  }

  /**
   * Confirma la orden tras pago exitoso.
   * Transiciona reservas a ventas físicas y actualiza balances de tiendas.
   * Idempotente: Si ya está en estado PAGADO no repite operaciones contables.
   */
  async confirmOrderPaid(pedidoId: string, transaccionExternaId?: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        items: true,
        subPedidos: {
          include: {
            tienda: {
              include: { vendedor: true },
            },
          },
        },
      },
    });

    if (!pedido) {
      throw new NotFoundException(`Pedido ${pedidoId} no encontrado.`);
    }

    if (pedido.estado === EstadoPedido.PAGADO) {
      this.logger.log(`Pedido ${pedido.numeroPedido} ya se encuentra confirmado como PAGADO.`);
      return pedido;
    }

    // Ejecución transaccional contable y de estados
    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar estado del Pedido Madre
      const pedidoActualizado = await tx.pedido.update({
        where: { id: pedidoId },
        data: { estado: EstadoPedido.PAGADO },
      });

      // 2. Actualizar cada SubPedido a CONFIRMADO y acreditar saldo al Balance del Vendedor
      for (const subPedido of pedido.subPedidos) {
        await tx.subPedido.update({
          where: { id: subPedido.id },
          data: { estado: EstadoSubPedido.CONFIRMADO },
        });

        // Acreditar saldo pendiente en BalanceVendedor
        const vendedorId = subPedido.tienda.vendedorId;
        const balance = await tx.balanceVendedor.findUnique({
          where: { vendedorId },
        });

        if (balance) {
          await tx.balanceVendedor.update({
            where: { vendedorId },
            data: {
              saldoPendiente: {
                increment: subPedido.montoNetoTienda,
              },
            },
          });
        }

        // Registrar en historial del SubPedido
        await tx.historialEstadoPedido.create({
          data: {
            pedidoId: pedido.id,
            subPedidoId: subPedido.id,
            estadoAnterior: EstadoSubPedido.PENDIENTE,
            estadoNuevo: EstadoSubPedido.CONFIRMADO,
            comentario: `Pago acreditado exitosamente. Transacción pasarela: ${transaccionExternaId || 'N/A'}`,
          },
        });
      }

      // 3. Confirmar venta en inventario (descontar stock físico y liberar stock reservado)
      for (const item of pedido.items) {
        let inventario = null;
        if (item.varianteId) {
          inventario = await tx.inventario.findUnique({
            where: { varianteId: item.varianteId },
          });
        } else {
          inventario = await tx.inventario.findUnique({
            where: { productoId: item.productoId },
          });
        }

        if (inventario) {
          await this.inventoryService.confirmSale(
            inventario.id,
            item.cantidad,
            pedido.numeroPedido,
            pedido.usuarioId,
          );
        }
      }

      // 4. Historial del Pedido Madre
      await tx.historialEstadoPedido.create({
        data: {
          pedidoId: pedido.id,
          estadoAnterior: pedido.estado,
          estadoNuevo: EstadoPedido.PAGADO,
          comentario: `Pago aprobado mediante pasarela externa. ID Ref: ${transaccionExternaId || 'N/A'}`,
        },
      });

      return pedidoActualizado;
    });
  }

  /**
   * Cancelar un pedido y liberar las reservas de inventario.
   */
  async cancelOrder(pedidoId: string, usuarioId: string, motivo = 'Cancelado por el usuario') {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { items: true, subPedidos: true },
    });

    if (!pedido) throw new NotFoundException('Pedido no encontrado.');

    if (pedido.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para cancelar este pedido.');
    }

    if (
      pedido.estado !== EstadoPedido.PENDIENTE_PAGO &&
      pedido.estado !== EstadoPedido.EN_PROCESO
    ) {
      throw new BadRequestException(
        `No se puede cancelar un pedido en estado "${pedido.estado}".`,
      );
    }

    // 1. Liberar reservas de stock
    for (const item of pedido.items) {
      let inventario = null;
      if (item.varianteId) {
        inventario = await this.prisma.inventario.findUnique({
          where: { varianteId: item.varianteId },
        });
      } else {
        inventario = await this.prisma.inventario.findUnique({
          where: { productoId: item.productoId },
        });
      }

      if (inventario) {
        await this.inventoryService.releaseReservation(usuarioId, {
          inventarioId: inventario.id,
          cantidad: item.cantidad,
          referenciaId: pedido.numeroPedido,
        });
      }
    }

    // 2. Actualizar estados
    return this.prisma.$transaction(async (tx) => {
      const pedidoCancelado = await tx.pedido.update({
        where: { id: pedidoId },
        data: { estado: EstadoPedido.CANCELADO },
      });

      await tx.subPedido.updateMany({
        where: { pedidoId },
        data: { estado: EstadoSubPedido.CANCELADO },
      });

      await tx.historialEstadoPedido.create({
        data: {
          pedidoId,
          estadoAnterior: pedido.estado,
          estadoNuevo: EstadoPedido.CANCELADO,
          comentario: motivo,
          cambiadoPorUsuarioId: usuarioId,
        },
      });

      return pedidoCancelado;
    });
  }

  /**
   * Obtener detalle completo de un pedido con control de acceso por rol
   */
  async findById(pedidoId: string, usuarioId: string, esAdmin = false) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        direccionEnvio: true,
        direccionFacturacion: true,
        pagos: true,
        subPedidos: {
          include: {
            tienda: {
              select: { id: true, nombre: true, slug: true, logoUrl: true, telefono: true },
            },
            items: true,
            historialEstados: {
              orderBy: { fecha: 'asc' },
            },
          },
        },
        historialEstados: {
          orderBy: { fecha: 'asc' },
        },
      },
    });

    if (!pedido) throw new NotFoundException('Pedido no encontrado.');

    if (!esAdmin && pedido.usuarioId !== usuarioId) {
      // Si es vendedor, verificar si alguna tienda le pertenece
      const tiendaVendedor = await this.prisma.tienda.findFirst({
        where: { vendedor: { usuarioId } },
      });

      if (!tiendaVendedor) {
        throw new ForbiddenException('No tiene permisos para ver este pedido.');
      }

      // Filtrar únicamente los subpedidos de su tienda
      return {
        ...pedido,
        subPedidos: pedido.subPedidos.filter((sp) => sp.tiendaId === tiendaVendedor.id),
      };
    }

    return pedido;
  }

  /**
   * Listar pedidos propios del usuario autenticado
   */
  async findMyOrders(usuarioId: string, filter: FilterOrdersDto) {
    const { page = 1, limit = 10, estado } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.PedidoWhereInput = {
      usuarioId,
      ...(estado && { estado }),
    };

    const [total, items] = await Promise.all([
      this.prisma.pedido.count({ where }),
      this.prisma.pedido.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaCreacion: 'desc' },
        include: {
          subPedidos: {
            include: {
              tienda: { select: { id: true, nombre: true, slug: true } },
              items: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Actualizar estado de un SubPedido (por Vendedor o Admin)
   */
  async updateSubOrderStatus(
    subPedidoId: string,
    usuarioId: string,
    dto: UpdateSubOrderStatusDto,
    esAdmin = false,
  ) {
    const subPedido = await this.prisma.subPedido.findUnique({
      where: { id: subPedidoId },
      include: {
        tienda: { include: { vendedor: true } },
        pedido: { include: { subPedidos: true } },
      },
    });

    if (!subPedido) throw new NotFoundException('SubPedido no encontrado.');

    if (!esAdmin && subPedido.tienda.vendedor.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos sobre este subpedido.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subPedido.update({
        where: { id: subPedidoId },
        data: { estado: dto.estado },
      });

      await tx.historialEstadoPedido.create({
        data: {
          pedidoId: subPedido.pedidoId,
          subPedidoId: subPedido.id,
          estadoAnterior: subPedido.estado,
          estadoNuevo: dto.estado,
          comentario: dto.comentario || 'Actualización de estado de subpedido.',
          cambiadoPorUsuarioId: usuarioId,
        },
      });

      // Si todos los subpedidos están ENTREGADOS, marcar el Pedido Madre como COMPLETADO
      const todosEntregados = subPedido.pedido.subPedidos.every(
        (sp) => sp.id === subPedidoId ? dto.estado === EstadoSubPedido.ENTREGADO : sp.estado === EstadoSubPedido.ENTREGADO,
      );

      if (todosEntregados) {
        await tx.pedido.update({
          where: { id: subPedido.pedidoId },
          data: { estado: EstadoPedido.COMPLETADO },
        });

        await tx.historialEstadoPedido.create({
          data: {
            pedidoId: subPedido.pedidoId,
            estadoAnterior: subPedido.pedido.estado,
            estadoNuevo: EstadoPedido.COMPLETADO,
            comentario: 'Todos los subpedidos han sido entregados con éxito.',
            cambiadoPorUsuarioId: usuarioId,
          },
        });
      }

      return updated;
    });
  }
}
