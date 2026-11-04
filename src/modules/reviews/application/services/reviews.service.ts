import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateProductReviewDto, CreateStoreReviewDto } from '../dtos/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear reseña verificada de producto vinculada obligatoriamente a un PedidoItem
   */
  async createProductReview(usuarioId: string, dto: CreateProductReviewDto) {
    const pedidoItem = await this.prisma.pedidoItem.findUnique({
      where: { id: dto.pedidoItemId },
      include: {
        pedido: true,
        resenaProducto: true,
      },
    });

    if (!pedidoItem) throw new NotFoundException('Ítem de pedido no encontrado.');

    if (pedidoItem.pedido.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para calificar un producto que no adquirió.');
    }

    if (pedidoItem.resenaProducto) {
      throw new BadRequestException('Ya ha calificado este producto para esta compra.');
    }

    return this.prisma.resenaProducto.create({
      data: {
        productoId: pedidoItem.productoId,
        usuarioId,
        pedidoItemId: dto.pedidoItemId,
        calificacion: dto.calificacion,
        titulo: dto.titulo,
        comentario: dto.comentario,
        esCompraVerificada: true,
        estado: true,
      },
    });
  }

  /**
   * Crear reseña de tienda vinculada a un SubPedido
   */
  async createStoreReview(usuarioId: string, dto: CreateStoreReviewDto) {
    const subPedido = await this.prisma.subPedido.findUnique({
      where: { id: dto.subPedidoId },
      include: {
        pedido: true,
        tienda: { include: { vendedor: true } },
      },
    });

    if (!subPedido) throw new NotFoundException('SubPedido no encontrado.');

    if (subPedido.pedido.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para calificar esta tienda.');
    }

    const resenaExistente = await this.prisma.resenaTienda.findUnique({
      where: { subPedidoId: dto.subPedidoId },
    });

    if (resenaExistente) {
      throw new BadRequestException('Ya ha calificado a esta tienda para este pedido.');
    }

    return this.prisma.$transaction(async (tx) => {
      const resena = await tx.resenaTienda.create({
        data: {
          tiendaId: subPedido.tiendaId,
          usuarioId,
          subPedidoId: dto.subPedidoId,
          calificacion: dto.calificacion,
          comentario: dto.comentario,
        },
      });

      // Recalcular promedio de calificación del vendedor
      const calificaciones = await tx.resenaTienda.aggregate({
        where: { tienda: { vendedorId: subPedido.tienda.vendedorId } },
        _avg: { calificacion: true },
      });

      if (calificaciones._avg.calificacion !== null) {
        await tx.vendedor.update({
          where: { id: subPedido.tienda.vendedorId },
          data: {
            calificacionPromedio: Number(calificaciones._avg.calificacion.toFixed(2)),
          },
        });
      }

      return resena;
    });
  }

  /**
   * Listar reseñas públicas de un producto
   */
  async getProductReviews(productoId: string) {
    const [reviews, stats] = await Promise.all([
      this.prisma.resenaProducto.findMany({
        where: { productoId, estado: true },
        include: {
          usuario: { select: { nombre: true, apellido: true } },
        },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.resenaProducto.aggregate({
        where: { productoId, estado: true },
        _avg: { calificacion: true },
        _count: { id: true },
      }),
    ]);

    return {
      reviews,
      stats: {
        promedio: Number((stats._avg.calificacion || 0).toFixed(2)),
        totalResenas: stats._count.id,
      },
    };
  }
}
