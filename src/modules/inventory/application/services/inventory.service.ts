import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CacheService } from '@core/cache/cache.service';
import { AdjustInventoryDto } from '../dtos/adjust-inventory.dto';
import { ReserveStockDto, ReleaseReservationDto } from '../dtos/reserve-stock.dto';
import { TipoMovimientoInventario } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  private readonly reservationTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    const ttlMinutes = this.configService.get<number>('business.reservationTtlMinutes') || 15;
    this.reservationTtlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Obtener inventario por ID con historial Kardex
   */
  async findById(inventarioId: string) {
    const inv = await this.prisma.inventario.findUnique({
      where: { id: inventarioId },
      include: {
        producto: { select: { id: true, nombre: true, skuBase: true } },
        variante: { select: { id: true, sku: true, nombreVariante: true } },
      },
    });

    if (!inv) throw new NotFoundException('Registro de inventario no encontrado.');
    return inv;
  }

  /**
   * Obtener inventario de una variante o producto específico
   */
  async findByVariante(varianteId: string) {
    const inv = await this.prisma.inventario.findUnique({
      where: { varianteId },
      include: {
        variante: { select: { sku: true, nombreVariante: true, precio: true } },
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 20,
        },
      },
    });
    if (!inv) throw new NotFoundException('Inventario de variante no encontrado.');
    return inv;
  }

  /**
   * Obtener inventario de un producto simple
   */
  async findByProducto(productoId: string) {
    const inv = await this.prisma.inventario.findUnique({
      where: { productoId },
      include: {
        producto: { select: { nombre: true, skuBase: true } },
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 20,
        },
      },
    });
    if (!inv) throw new NotFoundException('Inventario de producto no encontrado.');
    return inv;
  }

  /**
   * Obtener todos los inventarios de una tienda con alertas de stock mínimo
   */
  async findByTienda(tiendaId: string) {
    // Obtenemos inventarios a través de variantes -> producto -> tienda
    const inventarios = await this.prisma.inventario.findMany({
      where: {
        OR: [
          { variante: { producto: { tiendaId } } },
          { producto: { tiendaId } },
        ],
      },
      include: {
        variante: { select: { sku: true, nombreVariante: true, precio: true } },
        producto: { select: { nombre: true, skuBase: true } },
      },
      orderBy: { stockDisponible: 'asc' },
    });

    // Enriquecer con flag de alerta de mínimo
    return inventarios.map((inv) => ({
      ...inv,
      alertaStockMinimo: inv.stockDisponible <= inv.stockMinimoAlerta,
    }));
  }

  /**
   * Ajuste manual de inventario con registro Kardex inmutable
   */
  async adjustInventory(inventarioId: string, usuarioId: string, dto: AdjustInventoryDto) {
    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista: leer para actualizar
      const inv = await tx.inventario.findUnique({
        where: { id: inventarioId },
      });

      if (!inv) throw new NotFoundException('Inventario no encontrado.');

      const esPositivo = (
        [
          TipoMovimientoInventario.AJUSTE_POSITIVO,
          TipoMovimientoInventario.ENTRADA_COMPRA,
          TipoMovimientoInventario.DEVOLUCION_RMA,
        ] as TipoMovimientoInventario[]
      ).includes(dto.tipo);

      const esNegativo = (
        [
          TipoMovimientoInventario.AJUSTE_NEGATIVO,
          TipoMovimientoInventario.SALIDA_VENTA,
        ] as TipoMovimientoInventario[]
      ).includes(dto.tipo);

      const stockAnterior = inv.stockFisico;
      let nuevoStockFisico = inv.stockFisico;
      let nuevoStockDisponible = inv.stockDisponible;

      if (esPositivo) {
        nuevoStockFisico = inv.stockFisico + dto.cantidad;
        nuevoStockDisponible = inv.stockDisponible + dto.cantidad;
      } else if (esNegativo) {
        if (inv.stockDisponible < dto.cantidad && !inv.permitirSobreventa) {
          throw new BadRequestException(
            `Stock disponible insuficiente. Disponible: ${inv.stockDisponible}, solicitado: ${dto.cantidad}`,
          );
        }
        nuevoStockFisico = Math.max(0, inv.stockFisico - dto.cantidad);
        nuevoStockDisponible = Math.max(0, inv.stockDisponible - dto.cantidad);
      }

      // 1. Actualizar inventario
      const updated = await tx.inventario.update({
        where: { id: inventarioId },
        data: {
          stockFisico: nuevoStockFisico,
          stockDisponible: nuevoStockDisponible,
        },
      });

      // 2. Registrar movimiento Kardex INMUTABLE
      await tx.movimientoInventario.create({
        data: {
          inventarioId,
          tipo: dto.tipo,
          cantidad: dto.cantidad,
          stockAnterior,
          stockNuevo: nuevoStockFisico,
          motivo: dto.motivo,
          referenciaTipo: dto.referenciaTipo,
          referenciaId: dto.referenciaId,
          usuarioId,
          fecha: new Date(),
        },
      });

      return updated;
    });
  }

  /**
   * Reserva de stock durante checkout con bloqueo distribuido y TTL de 15 min
   * Implementa patrón de bloqueo pesimista para prevenir sobreventa concurrente
   */
  async reserveStock(usuarioId: string, dto: ReserveStockDto) {
    const lockKey = `inventory:${dto.inventarioId}`;

    // Adquirir bloqueo distribuido con TTL
    const lock = await this.cacheService.acquireLock(lockKey, 5000);
    if (!lock.acquired) {
      throw new BadRequestException(
        'El inventario está siendo procesado por otra solicitud. Intente nuevamente en unos segundos.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const inv = await tx.inventario.findUnique({
          where: { id: dto.inventarioId },
        });

        if (!inv) throw new NotFoundException('Inventario no encontrado.');

        const disponible = inv.stockFisico - inv.stockReservado;

        if (disponible < dto.cantidad && !inv.permitirSobreventa) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${disponible}, solicitado: ${dto.cantidad}`,
          );
        }

        const stockAnterior = inv.stockFisico;
        const nuevoReservado = inv.stockReservado + dto.cantidad;
        const nuevoDisponible = inv.stockFisico - nuevoReservado;

        // Actualizar stock reservado y disponible
        const updated = await tx.inventario.update({
          where: { id: dto.inventarioId },
          data: {
            stockReservado: nuevoReservado,
            stockDisponible: Math.max(0, nuevoDisponible),
          },
        });

        // Registrar movimiento Kardex de RESERVA
        await tx.movimientoInventario.create({
          data: {
            inventarioId: dto.inventarioId,
            tipo: TipoMovimientoInventario.RESERVA_CHECKOUT,
            cantidad: dto.cantidad,
            stockAnterior,
            stockNuevo: inv.stockFisico,
            motivo: 'Reserva por proceso de checkout',
            referenciaTipo: 'CARRITO',
            referenciaId: dto.referenciaId,
            usuarioId,
          },
        });

        // Programar liberación automática con TTL si no se completa el pago
        if (dto.referenciaId) {
          const ttlKey = `reservation:ttl:${dto.inventarioId}:${dto.referenciaId}`;
          await this.cacheService.set(
            ttlKey,
            { inventarioId: dto.inventarioId, cantidad: dto.cantidad, usuarioId },
            this.reservationTtlMs / 1000,
          );
        }

        return {
          inventario: updated,
          cantidadReservada: dto.cantidad,
          ttlMinutos: this.reservationTtlMs / 60000,
        };
      });
    } finally {
      if (lock.lockId) {
        await this.cacheService.releaseLock(lockKey, lock.lockId);
      }
    }
  }

  /**
   * Liberación de reserva (checkout abandonado / pago fallido / expiración TTL)
   */
  async releaseReservation(usuarioId: string, dto: ReleaseReservationDto) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventario.findUnique({
        where: { id: dto.inventarioId },
      });

      if (!inv) throw new NotFoundException('Inventario no encontrado.');

      const liberacion = Math.min(dto.cantidad, inv.stockReservado);
      const nuevoReservado = inv.stockReservado - liberacion;
      const nuevoDisponible = inv.stockFisico - nuevoReservado;

      const updated = await tx.inventario.update({
        where: { id: dto.inventarioId },
        data: {
          stockReservado: nuevoReservado,
          stockDisponible: Math.max(0, nuevoDisponible),
        },
      });

      await tx.movimientoInventario.create({
        data: {
          inventarioId: dto.inventarioId,
          tipo: TipoMovimientoInventario.LIBERACION_RESERVA,
          cantidad: liberacion,
          stockAnterior: inv.stockFisico,
          stockNuevo: inv.stockFisico,
          motivo: 'Liberación de reserva por checkout no completado o TTL expirado',
          referenciaTipo: 'CARRITO',
          referenciaId: dto.referenciaId,
          usuarioId,
        },
      });

      return updated;
    });
  }

  /**
   * Confirmar venta: transición de stockReservado a stockFisico reducido
   * Se invoca al confirmar el pago de la orden
   */
  async confirmSale(inventarioId: string, cantidad: number, referenciaId: string, usuarioId: string) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.inventario.findUnique({
        where: { id: inventarioId },
      });

      if (!inv) throw new NotFoundException('Inventario no encontrado.');

      const descuento = Math.min(cantidad, inv.stockReservado);
      const nuevoFisico = Math.max(0, inv.stockFisico - descuento);
      const nuevoReservado = Math.max(0, inv.stockReservado - descuento);
      const nuevoDisponible = nuevoFisico - nuevoReservado;

      const updated = await tx.inventario.update({
        where: { id: inventarioId },
        data: {
          stockFisico: nuevoFisico,
          stockReservado: nuevoReservado,
          stockDisponible: Math.max(0, nuevoDisponible),
        },
      });

      await tx.movimientoInventario.create({
        data: {
          inventarioId,
          tipo: TipoMovimientoInventario.SALIDA_VENTA,
          cantidad: descuento,
          stockAnterior: inv.stockFisico,
          stockNuevo: nuevoFisico,
          motivo: 'Salida por venta confirmada',
          referenciaTipo: 'PEDIDO',
          referenciaId,
          usuarioId,
        },
      });

      return updated;
    });
  }

  /**
   * Historial de movimientos Kardex de un inventario paginado
   */
  async getKardex(inventarioId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.movimientoInventario.count({ where: { inventarioId } }),
      this.prisma.movimientoInventario.findMany({
        where: { inventarioId },
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          usuario: {
            select: { id: true, nombre: true, apellido: true },
          },
        },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
