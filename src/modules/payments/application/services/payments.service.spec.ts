import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '@core/database/prisma.service';
import { OrdersService } from '@modules/orders/application/services/orders.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoPago, EstadoPedido } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let ordersService: any;

  beforeEach(async () => {
    prisma = {
      metodoPago: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      pedido: {
        findUnique: jest.fn(),
      },
      pago: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    ordersService = {
      confirmOrderPaid: jest.fn().mockResolvedValue({ id: 'order-1', estado: EstadoPedido.PAGADO }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('initiatePayment', () => {
    it('debe lanzar NotFoundException si el pedido no existe', async () => {
      prisma.pedido.findUnique.mockResolvedValue(null);

      await expect(
        service.initiatePayment('user-1', {
          pedidoId: 'order-inexistente',
          metodoPagoCodigo: 'STRIPE',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si el pedido pertenece a otro usuario', async () => {
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        usuarioId: 'other-user',
        pagos: [],
      });

      await expect(
        service.initiatePayment('user-1', {
          pedidoId: 'order-1',
          metodoPagoCodigo: 'STRIPE',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si el pedido no está en PENDIENTE_PAGO', async () => {
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        usuarioId: 'user-1',
        estado: EstadoPedido.PAGADO,
        pagos: [],
      });

      await expect(
        service.initiatePayment('user-1', {
          pedidoId: 'order-1',
          metodoPagoCodigo: 'STRIPE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe generar la intención de pago y retornar clientSecret', async () => {
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        usuarioId: 'user-1',
        numeroPedido: 'ORD-001',
        estado: EstadoPedido.PENDIENTE_PAGO,
        total: 150.0,
        moneda: 'USD',
        pagos: [],
      });

      prisma.metodoPago.findUnique.mockResolvedValue({
        id: 'mp-1',
        codigo: 'STRIPE',
        nombre: 'Stripe Gateway',
      });

      prisma.pago.create.mockResolvedValue({
        id: 'pago-1',
        pedidoId: 'order-1',
        monto: 150.0,
        moneda: 'USD',
        fechaExpiracion: new Date(),
      });

      const res = await service.initiatePayment('user-1', {
        pedidoId: 'order-1',
        metodoPagoCodigo: 'STRIPE',
      });

      expect(prisma.pago.create).toHaveBeenCalled();
      expect(res.pagoId).toBe('pago-1');
      expect(res.clientSecret).toBeDefined();
    });
  });

  describe('processWebhook (Idempotencia y Acreditación)', () => {
    it('debe responder idempotentemente si el pago ya fue APROBADO previamente', async () => {
      prisma.pago.findUnique.mockResolvedValue({
        id: 'pago-1',
        pedidoId: 'order-1',
        estado: EstadoPago.APROBADO,
      });

      const res = await service.processWebhook({
        transaccionExternaId: 'pi_test123',
        evento: 'payment_intent.succeeded',
        estado: 'SUCCEEDED',
      });

      expect(res.idempotent).toBe(true);
      expect(res.status).toBe('IGNORED');
      expect(ordersService.confirmOrderPaid).not.toHaveBeenCalled();
    });

    it('debe aprobar el pago y llamar a OrdersService.confirmOrderPaid si es SUCCEEDED', async () => {
      prisma.pago.findUnique.mockResolvedValue({
        id: 'pago-1',
        pedidoId: 'order-1',
        estado: EstadoPago.PENDIENTE,
      });

      prisma.pago.update.mockResolvedValue({
        id: 'pago-1',
        estado: EstadoPago.APROBADO,
      });

      const res = await service.processWebhook({
        transaccionExternaId: 'pi_test123',
        evento: 'payment_intent.succeeded',
        estado: 'SUCCEEDED',
        codigoAutorizacion: 'AUTH-1234',
      });

      expect(prisma.pago.update).toHaveBeenCalledWith({
        where: { id: 'pago-1' },
        data: expect.objectContaining({ estado: EstadoPago.APROBADO }),
      });
      expect(ordersService.confirmOrderPaid).toHaveBeenCalledWith('order-1', 'pi_test123');
      expect(res.status).toBe('PROCESSED');
    });

    it('debe marcar el pago como RECHAZADO si la pasarela reporta fallo', async () => {
      prisma.pago.findUnique.mockResolvedValue({
        id: 'pago-1',
        pedidoId: 'order-1',
        estado: EstadoPago.PENDIENTE,
      });

      prisma.pago.update.mockResolvedValue({
        id: 'pago-1',
        estado: EstadoPago.RECHAZADO,
      });

      const res = await service.processWebhook({
        transaccionExternaId: 'pi_test123',
        evento: 'charge.failed',
        estado: 'FAILED',
      });

      expect(prisma.pago.update).toHaveBeenCalledWith({
        where: { id: 'pago-1' },
        data: expect.objectContaining({ estado: EstadoPago.RECHAZADO }),
      });
      expect(ordersService.confirmOrderPaid).not.toHaveBeenCalled();
      expect(res.status).toBe('FAILED');
    });
  });
});
