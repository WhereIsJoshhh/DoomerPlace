import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { InventoryService } from '@modules/inventory/application/services/inventory.service';
import { CreateReturnDto } from '../dtos/create-return.dto';
import { ReviewReturnDto } from '../dtos/review-return.dto';
import {
  EstadoDevolucion,
  EstadoSubPedido,
  InspeccionEstado,
  Prisma,
  TipoMovimientoInventario,
} from '@prisma/client';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Crear solicitud de devolución (RMA) por parte del comprador
   */
  async requestReturn(usuarioId: string, dto: CreateReturnDto) {
    const subPedido = await this.prisma.subPedido.findUnique({
      where: { id: dto.subPedidoId },
      include: {
        pedido: true,
        items: true,
      },
    });

    if (!subPedido) throw new NotFoundException('SubPedido no encontrado.');

    if (subPedido.pedido.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para solicitar devolución sobre este pedido.');
    }

    if (subPedido.estado !== EstadoSubPedido.ENTREGADO) {
      throw new BadRequestException('Solo se pueden solicitar devoluciones sobre pedidos entregados.');
    }

    return this.prisma.$transaction(async (tx) => {
      const devolucion = await tx.devolucion.create({
        data: {
          subPedidoId: dto.subPedidoId,
          usuarioId,
          motivo: dto.motivo,
          descripcion: dto.descripcion,
          estado: EstadoDevolucion.SOLICITADA,
        },
      });

      for (const item of dto.items) {
        const itemValido = subPedido.items.find((i) => i.id === item.pedidoItemId);
        if (!itemValido) {
          throw new BadRequestException(`El ítem ${item.pedidoItemId} no pertenece a este subpedido.`);
        }

        await tx.devolucionItem.create({
          data: {
            devolucionId: devolucion.id,
            pedidoItemId: item.pedidoItemId,
            cantidad: item.cantidad,
            inspeccionEstado: InspeccionEstado.PENDIENTE,
          },
        });
      }

      return devolucion;
    });
  }

  /**
   * Dictamen / Resolución de devolución por Vendedor o Admin
   * Si es APROBADA y el producto está CONFORME, reingresa al inventario como Kardex inmutable
   */
  async reviewReturn(
    devolucionId: string,
    usuarioId: string,
    dto: ReviewReturnDto,
    esAdmin = false,
  ) {
    const devolucion = await this.prisma.devolucion.findUnique({
      where: { id: devolucionId },
      include: {
        items: { include: { pedidoItem: true } },
        subPedido: {
          include: {
            tienda: { include: { vendedor: true } },
            pedido: { include: { pagos: true } },
          },
        },
      },
    });

    if (!devolucion) throw new NotFoundException('Devolución no encontrada.');

    if (!esAdmin && devolucion.subPedido.tienda.vendedor.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para gestionar esta devolución.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar estado de devolución
      const updated = await tx.devolucion.update({
        where: { id: devolucionId },
        data: {
          estado: dto.estado,
          fechaResolucion: new Date(),
        },
      });

      // 2. Si es APROBADA
      if (dto.estado === EstadoDevolucion.APROBADA) {
        // A. Actualizar estado de inspección
        if (dto.inspeccionEstado) {
          await tx.devolucionItem.updateMany({
            where: { devolucionId },
            data: { inspeccionEstado: dto.inspeccionEstado },
          });

          // Si el producto se encuentra en estado CONFORME, reingresar stock físico
          if (dto.inspeccionEstado === InspeccionEstado.CONFORME) {
            for (const item of devolucion.items) {
              let inventario = null;
              if (item.pedidoItem.varianteId) {
                inventario = await tx.inventario.findUnique({
                  where: { varianteId: item.pedidoItem.varianteId },
                });
              } else {
                inventario = await tx.inventario.findUnique({
                  where: { productoId: item.pedidoItem.productoId },
                });
              }

              if (inventario) {
                await this.inventoryService.adjustInventory(inventario.id, usuarioId, {
                  tipo: TipoMovimientoInventario.DEVOLUCION_RMA,
                  cantidad: item.cantidad,
                  motivo: `Reingreso por devolución aprobada ${devolucionId}`,
                  referenciaTipo: 'DEVOLUCION',
                  referenciaId: devolucionId,
                });
              }
            }
          }
        }

        // B. Crear registro de Reembolso
        const pagoAprobado = devolucion.subPedido.pedido.pagos.find(
          (p) => p.estado === 'APROBADO',
        );

        if (pagoAprobado) {
          const montoReembolso = dto.montoReembolso || Number(devolucion.subPedido.total);

          await tx.reembolso.create({
            data: {
              pagoId: pagoAprobado.id,
              devolucionId: devolucion.id,
              monto: new Prisma.Decimal(montoReembolso),
              moneda: pagoAprobado.moneda,
              motivo: dto.observaciones || devolucion.motivo,
              estado: 'COMPLETADO',
            },
          });
        }
      }

      return updated;
    });
  }

  /**
   * Obtener detalle o listar devoluciones del usuario
   */
  async getMyReturns(usuarioId: string) {
    return this.prisma.devolucion.findMany({
      where: { usuarioId },
      include: {
        items: { include: { pedidoItem: true } },
        reembolsos: true,
      },
      orderBy: { fechaSolicitud: 'desc' },
    });
  }
}
