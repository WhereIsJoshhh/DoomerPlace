import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { FinanceService } from '@modules/finance/application/services/finance.service';
import { CreateShipmentDto } from '../dtos/create-shipment.dto';
import { UpdateTrackingDto } from '../dtos/update-tracking.dto';
import { EstadoEnvio, EstadoPedido, EstadoSubPedido, Prisma } from '@prisma/client';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
  ) {}

  /**
   * Generar guía de despacho para un SubPedido (por Vendedor o Admin)
   */
  async createShipment(usuarioId: string, dto: CreateShipmentDto, esAdmin = false) {
    const subPedido = await this.prisma.subPedido.findUnique({
      where: { id: dto.subPedidoId },
      include: {
        tienda: { include: { vendedor: true } },
        pedido: true,
        envio: true,
      },
    });

    if (!subPedido) throw new NotFoundException('SubPedido no encontrado.');

    if (!esAdmin && subPedido.tienda.vendedor.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para despachar este subpedido.');
    }

    if (subPedido.envio) {
      throw new BadRequestException('El subpedido ya cuenta con un envío y guía registrados.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear registro de Envío
      const envio = await tx.envio.create({
        data: {
          subPedidoId: dto.subPedidoId,
          direccionEnvioId: subPedido.pedido.direccionEnvioId,
          proveedorLogistico: dto.proveedorLogistico,
          numeroGuia: dto.numeroGuia,
          urlTracking: dto.urlTracking,
          costoRealEnvio: new Prisma.Decimal(dto.costoRealEnvio),
          pesoTotal: new Prisma.Decimal(dto.pesoTotal),
          fechaDespacho: new Date(),
          fechaEstimadaEntrega: dto.fechaEstimadaEntrega,
          estado: EstadoEnvio.GUIA_GENERADA,
        },
      });

      // 2. Registrar primer evento de tracking
      await tx.eventoTracking.create({
        data: {
          envioId: envio.id,
          estadoHito: 'GUIA_GENERADA',
          descripcion: `Guía generada por ${dto.proveedorLogistico}. Listo para recolección en almacén.`,
          fechaEvento: new Date(),
        },
      });

      // 3. Actualizar estado del SubPedido a EN_PREPARACION o ENVIADO
      await tx.subPedido.update({
        where: { id: dto.subPedidoId },
        data: { estado: EstadoSubPedido.EN_PREPARACION },
      });

      await tx.historialEstadoPedido.create({
        data: {
          pedidoId: subPedido.pedidoId,
          subPedidoId: subPedido.id,
          estadoAnterior: subPedido.estado,
          estadoNuevo: EstadoSubPedido.EN_PREPARACION,
          comentario: `Guía ${dto.numeroGuia} generada con ${dto.proveedorLogistico}.`,
          cambiadoPorUsuarioId: usuarioId,
        },
      });

      return envio;
    });
  }

  /**
   * Registrar actualización de tracking o webhook del operador logístico (DHL/FedEx/etc.)
   */
  async addTrackingEvent(numeroGuia: string, dto: UpdateTrackingDto) {
    const envio = await this.prisma.envio.findUnique({
      where: { numeroGuia },
      include: {
        subPedido: {
          include: {
            pedido: {
              include: { subPedidos: true },
            },
          },
        },
      },
    });

    if (!envio) {
      throw new NotFoundException(`Envío con número de guía "${numeroGuia}" no encontrado.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Registrar evento de tracking
      const evento = await tx.eventoTracking.create({
        data: {
          envioId: envio.id,
          estadoHito: dto.estadoHito,
          ubicacion: dto.ubicacion,
          descripcion: dto.descripcion,
          fechaEvento: new Date(),
        },
      });

      // 2. Transición de estado del envío si se especificó
      if (dto.estadoEnvio) {
        const dataUpdate: Prisma.EnvioUpdateInput = {
          estado: dto.estadoEnvio,
        };

        if (dto.estadoEnvio === EstadoEnvio.ENTREGADO) {
          dataUpdate.fechaEntregaReal = new Date();
        }

        await tx.envio.update({
          where: { id: envio.id },
          data: dataUpdate,
        });

        // Transición de estado del SubPedido
        let nuevoEstadoSubPedido: EstadoSubPedido | null = null;
        if (dto.estadoEnvio === EstadoEnvio.EN_TRANSITO || dto.estadoEnvio === EstadoEnvio.EN_REPARTO) {
          nuevoEstadoSubPedido = EstadoSubPedido.ENVIADO;
        } else if (dto.estadoEnvio === EstadoEnvio.ENTREGADO) {
          nuevoEstadoSubPedido = EstadoSubPedido.ENTREGADO;
        }

        if (nuevoEstadoSubPedido && nuevoEstadoSubPedido !== envio.subPedido.estado) {
          await tx.subPedido.update({
            where: { id: envio.subPedidoId },
            data: { estado: nuevoEstadoSubPedido },
          });

          await tx.historialEstadoPedido.create({
            data: {
              pedidoId: envio.subPedido.pedidoId,
              subPedidoId: envio.subPedidoId,
              estadoAnterior: envio.subPedido.estado,
              estadoNuevo: nuevoEstadoSubPedido,
              comentario: `Hito logístico: ${dto.estadoHito}. ${dto.descripcion}`,
            },
          });

          // Si el paquete fue entregado:
          if (nuevoEstadoSubPedido === EstadoSubPedido.ENTREGADO) {
            // A. Transferir saldo pendiente a disponible para el vendedor
            await this.financeService.transferPendingToAvailable(envio.subPedidoId);

            // B. Si todos los subpedidos están ENTREGADOS, marcar Pedido como COMPLETADO
            const todosEntregados = envio.subPedido.pedido.subPedidos.every((sp) =>
              sp.id === envio.subPedidoId ? true : sp.estado === EstadoSubPedido.ENTREGADO,
            );

            if (todosEntregados) {
              await tx.pedido.update({
                where: { id: envio.subPedido.pedidoId },
                data: { estado: EstadoPedido.COMPLETADO },
              });

              await tx.historialEstadoPedido.create({
                data: {
                  pedidoId: envio.subPedido.pedidoId,
                  estadoAnterior: envio.subPedido.pedido.estado,
                  estadoNuevo: EstadoPedido.COMPLETADO,
                  comentario: 'Todos los envíos de la orden han sido entregados satisfactoriamente.',
                },
              });
            }
          }
        }
      }

      return evento;
    });
  }

  /**
   * Consulta pública de rastreo de paquete por número de guía
   */
  async getTracking(numeroGuia: string) {
    const envio = await this.prisma.envio.findUnique({
      where: { numeroGuia },
      include: {
        eventos: {
          orderBy: { fechaEvento: 'asc' },
        },
        subPedido: {
          select: {
            id: true,
            numeroSubPedido: true,
            tienda: { select: { nombre: true, slug: true } },
          },
        },
      },
    });

    if (!envio) throw new NotFoundException('Número de guía no encontrado.');
    return envio;
  }
}
