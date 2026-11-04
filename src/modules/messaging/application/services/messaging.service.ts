import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateQuestionDto, AnswerQuestionDto, SendMessageDto } from '../dtos/messaging.dto';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear pregunta pública sobre un producto
   */
  async askQuestion(usuarioId: string, dto: CreateQuestionDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado.');

    return this.prisma.preguntaProducto.create({
      data: {
        productoId: dto.productoId,
        usuarioId,
        pregunta: dto.pregunta,
      },
    });
  }

  /**
   * Responder pregunta oficial por la tienda dueña del producto o admin
   */
  async answerQuestion(usuarioId: string, dto: AnswerQuestionDto, esAdmin = false) {
    const pregunta = await this.prisma.preguntaProducto.findUnique({
      where: { id: dto.preguntaId },
      include: {
        producto: {
          include: { tienda: { include: { vendedor: true } } },
        },
      },
    });

    if (!pregunta) throw new NotFoundException('Pregunta no encontrada.');

    if (!esAdmin && pregunta.producto.tienda.vendedor.usuarioId !== usuarioId) {
      throw new ForbiddenException('Solo el vendedor oficial o administrador puede responder esta pregunta.');
    }

    return this.prisma.respuestaPregunta.create({
      data: {
        preguntaId: dto.preguntaId,
        usuarioId,
        respuesta: dto.respuesta,
      },
    });
  }

  /**
   * Listar preguntas y respuestas públicas de un producto
   */
  async getProductQuestions(productoId: string) {
    return this.prisma.preguntaProducto.findMany({
      where: { productoId, estado: true },
      include: {
        usuario: { select: { nombre: true } },
        respuesta: true,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  /**
   * Enviar mensaje en conversación directa comprador-tienda
   */
  async sendMessage(usuarioId: string, dto: SendMessageDto) {
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: dto.tiendaId },
    });
    if (!tienda) throw new NotFoundException('Tienda no encontrada.');

    // Buscar si ya existe una conversación activa entre este comprador y esta tienda
    let conversacion = await this.prisma.conversacion.findFirst({
      where: {
        compradorId: usuarioId,
        tiendaId: dto.tiendaId,
        ...(dto.subPedidoId && { subPedidoId: dto.subPedidoId }),
      },
    });

    if (!conversacion) {
      conversacion = await this.prisma.conversacion.create({
        data: {
          compradorId: usuarioId,
          tiendaId: dto.tiendaId,
          subPedidoId: dto.subPedidoId,
        },
      });
    }

    return this.prisma.mensaje.create({
      data: {
        conversacionId: conversacion.id,
        remitenteUsuarioId: usuarioId,
        contenido: dto.contenido,
      },
    });
  }

  /**
   * Listar conversaciones del usuario (comprador o vendedor)
   */
  async getConversations(usuarioId: string) {
    return this.prisma.conversacion.findMany({
      where: {
        OR: [
          { compradorId: usuarioId },
          { tienda: { vendedor: { usuarioId } } },
        ],
      },
      include: {
        tienda: { select: { id: true, nombre: true, slug: true, logoUrl: true } },
        mensajes: {
          orderBy: { fechaEnvio: 'desc' },
          take: 1,
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
  }
}
