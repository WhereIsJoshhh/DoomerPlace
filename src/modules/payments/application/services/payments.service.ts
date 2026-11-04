import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { OrdersService } from '@modules/orders/application/services/orders.service';
import { InitiatePaymentDto } from '../dtos/initiate-payment.dto';
import { WebhookPaymentPayloadDto } from '../dtos/webhook-payload.dto';
import { EstadoPago, EstadoPedido, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Listar todos los métodos de pago activos en la plataforma
   */
  async getPaymentMethods() {
    return this.prisma.metodoPago.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Inicializar proceso de pago para un pedido (Stripe / PayPal / etc.)
   */
  async initiatePayment(usuarioId: string, dto: InitiatePaymentDto) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: { pagos: true },
    });

    if (!pedido) {
      throw new NotFoundException('El pedido especificado no existe.');
    }

    if (pedido.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para pagar este pedido.');
    }

    if (pedido.estado !== EstadoPedido.PENDIENTE_PAGO) {
      throw new BadRequestException(
        `El pedido no se encuentra pendiente de pago (Estado actual: ${pedido.estado}).`,
      );
    }

    // Verificar si ya existe un pago APROBADO
    const pagoAprobado = pedido.pagos.find((p) => p.estado === EstadoPago.APROBADO);
    if (pagoAprobado) {
      throw new BadRequestException('El pedido ya cuenta con un pago aprobado.');
    }

    // Validar método de pago seleccionado
    let metodoPago = await this.prisma.metodoPago.findUnique({
      where: { codigo: dto.metodoPagoCodigo.toUpperCase() },
    });

    // Si el método no existe aún en la base de datos (p.ej. antes de seed), lo registramos dinámicamente
    if (!metodoPago) {
      metodoPago = await this.prisma.metodoPago.create({
        data: {
          codigo: dto.metodoPagoCodigo.toUpperCase(),
          nombre: `Pasarela ${dto.metodoPagoCodigo.toUpperCase()}`,
          esPasarelaOnline: true,
          activo: true,
        },
      });
    }

    // Simulación / Integración de pasarela externa: Generar token de transacción externa
    const transaccionExternaId = `pi_${uuidv4().replace(/-/g, '')}`;

    // Registrar o actualizar registro de Pago en estado PENDIENTE
    const pago = await this.prisma.pago.create({
      data: {
        pedidoId: pedido.id,
        metodoPagoId: metodoPago.id,
        transaccionExternaId,
        monto: pedido.total,
        moneda: pedido.moneda,
        estado: EstadoPago.PENDIENTE,
        fechaExpiracion: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos sincronizado con reserva
      },
    });

    return {
      pagoId: pago.id,
      pedidoId: pedido.id,
      numeroPedido: pedido.numeroPedido,
      transaccionExternaId,
      monto: Number(pago.monto),
      moneda: pago.moneda,
      metodoPago: metodoPago.codigo,
      clientSecret: `sec_${uuidv4()}`,
      expiraEn: pago.fechaExpiracion,
    };
  }

  /**
   * Procesamiento de webhooks de pasarelas de pago externas.
   * Garantía de IDEMPOTENCIA estricta por `transaccionExternaId`.
   */
  async processWebhook(payload: WebhookPaymentPayloadDto, idempotencyKey?: string) {
    this.logger.log(
      `Procesando webhook para transacción: ${payload.transaccionExternaId}, evento: ${payload.evento}`,
    );

    // 1. Buscar el pago por su identificador externo
    let pago = await this.prisma.pago.findUnique({
      where: { transaccionExternaId: payload.transaccionExternaId },
    });

    // Si no se encuentra por transaccionExternaId, verificar si viene en metadatos
    if (!pago && payload.metadatos?.pedidoId) {
      pago = await this.prisma.pago.findFirst({
        where: { pedidoId: payload.metadatos.pedidoId, estado: EstadoPago.PENDIENTE },
      });
    }

    if (!pago) {
      throw new NotFoundException(
        `Transacción de pago con referencia externa ${payload.transaccionExternaId} no encontrada.`,
      );
    }

    // 2. Control de IDEMPOTENCIA: Si ya está en un estado final, responder de forma segura sin re-procesar
    if (pago.estado === EstadoPago.APROBADO) {
      this.logger.warn(
        `Idempotencia activa: El pago ${pago.id} ya se encuentra APROBADO previamente. Webhook ignorado.`,
      );
      return {
        idempotent: true,
        status: 'IGNORED',
        message: 'La transacción ya fue procesada y aprobada con anterioridad.',
        pagoId: pago.id,
        pedidoId: pago.pedidoId,
      };
    }

    if (pago.estado === EstadoPago.RECHAZADO) {
      return {
        idempotent: true,
        status: 'IGNORED',
        message: 'La transacción ya fue registrada como rechazada previamente.',
        pagoId: pago.id,
        pedidoId: pago.pedidoId,
      };
    }

    // 3. Evaluar resultado del pago
    const esExitoso =
      payload.estado.toUpperCase() === 'SUCCEEDED' ||
      payload.estado.toUpperCase() === 'APPROVED' ||
      payload.evento === 'payment_intent.succeeded';

    if (esExitoso) {
      // Actualizar pago a APROBADO
      const pagoAprobado = await this.prisma.pago.update({
        where: { id: pago.id },
        data: {
          estado: EstadoPago.APROBADO,
          codigoAutorizacion: payload.codigoAutorizacion || `AUTH-${Date.now()}`,
          fechaPago: new Date(),
          datosRespuestaPasarela: payload as unknown as Prisma.InputJsonValue,
        },
      });

      // Confirmar orden en OrdersService (transiciona reservas a ventas físicas y acredita balances)
      await this.ordersService.confirmOrderPaid(pago.pedidoId, payload.transaccionExternaId);

      this.logger.log(
        `Pago ${pago.id} APROBADO y pedido ${pago.pedidoId} confirmado con éxito.`,
      );

      return {
        idempotent: false,
        status: 'PROCESSED',
        pago: pagoAprobado,
        message: 'Pago acreditado y orden confirmada exitosamente.',
      };
    } else {
      // Pago rechazado o fallido
      const pagoRechazado = await this.prisma.pago.update({
        where: { id: pago.id },
        data: {
          estado: EstadoPago.RECHAZADO,
          datosRespuestaPasarela: payload as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.warn(`Pago ${pago.id} RECHAZADO por la pasarela.`);

      return {
        idempotent: false,
        status: 'FAILED',
        pago: pagoRechazado,
        message: 'El pago ha sido rechazado por la pasarela externa.',
      };
    }
  }

  /**
   * Obtener detalle de pago por ID de pedido
   */
  async getPaymentByOrderId(pedidoId: string) {
    return this.prisma.pago.findMany({
      where: { pedidoId },
      include: { metodoPago: true },
    });
  }
}
