import { Test, TestingModule } from '@nestjs/testing';
import { LogisticsService } from './logistics.service';
import { PrismaService } from '@core/database/prisma.service';
import { FinanceService } from '@modules/finance/application/services/finance.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoEnvio, EstadoPedido, EstadoSubPedido } from '@prisma/client';

describe('LogisticsService', () => {
  let service: LogisticsService;
  let prisma: any;
  let financeService: any;

  beforeEach(async () => {
    prisma = {
      subPedido: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      envio: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      eventoTracking: {
        create: jest.fn(),
      },
      pedido: {
        update: jest.fn(),
      },
      historialEstadoPedido: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    financeService = {
      transferPendingToAvailable: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogisticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FinanceService, useValue: financeService },
      ],
    }).compile();

    service = module.get<LogisticsService>(LogisticsService);
  });

  describe('createShipment', () => {
    it('debe lanzar ForbiddenException si el usuario no es el vendedor del subpedido', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        tienda: { vendedor: { usuarioId: 'other-user' } },
        pedido: { direccionEnvioId: 'dir-1' },
      });

      await expect(
        service.createShipment('user-1', {
          subPedidoId: 'sub-1',
          proveedorLogistico: 'DHL',
          numeroGuia: 'DHL-123',
          costoRealEnvio: 10,
          pesoTotal: 1.5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si el subpedido ya tiene un envío registrado', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        tienda: { vendedor: { usuarioId: 'user-1' } },
        pedido: { direccionEnvioId: 'dir-1' },
        envio: { id: 'envio-existente' },
      });

      await expect(
        service.createShipment('user-1', {
          subPedidoId: 'sub-1',
          proveedorLogistico: 'DHL',
          numeroGuia: 'DHL-123',
          costoRealEnvio: 10,
          pesoTotal: 1.5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear el envío, registrar evento inicial y actualizar subpedido', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        pedidoId: 'ord-1',
        estado: EstadoSubPedido.CONFIRMADO,
        tienda: { vendedor: { usuarioId: 'user-1' } },
        pedido: { direccionEnvioId: 'dir-1' },
        envio: null,
      });

      prisma.envio.create.mockResolvedValue({ id: 'env-1', numeroGuia: 'DHL-123' });

      const res = await service.createShipment('user-1', {
        subPedidoId: 'sub-1',
        proveedorLogistico: 'DHL Express',
        numeroGuia: 'DHL-123',
        costoRealEnvio: 15,
        pesoTotal: 2,
      });

      expect(prisma.envio.create).toHaveBeenCalled();
      expect(prisma.eventoTracking.create).toHaveBeenCalled();
      expect(prisma.subPedido.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { estado: EstadoSubPedido.EN_PREPARACION },
      });
      expect(res.id).toBe('env-1');
    });
  });

  describe('addTrackingEvent', () => {
    it('debe actualizar envío, subpedido a ENTREGADO y transferir saldo a vendedor', async () => {
      prisma.envio.findUnique.mockResolvedValue({
        id: 'env-1',
        subPedidoId: 'sub-1',
        numeroGuia: 'DHL-123',
        subPedido: {
          id: 'sub-1',
          pedidoId: 'ord-1',
          estado: EstadoSubPedido.ENVIADO,
          pedido: {
            id: 'ord-1',
            estado: EstadoPedido.EN_PROCESO,
            subPedidos: [{ id: 'sub-1', estado: EstadoSubPedido.ENVIADO }],
          },
        },
      });

      prisma.eventoTracking.create.mockResolvedValue({ id: 'event-1' });

      await service.addTrackingEvent('DHL-123', {
        estadoHito: 'ENTREGADO',
        estadoEnvio: EstadoEnvio.ENTREGADO,
        descripcion: 'Entregado en puerta al destinatario.',
      });

      expect(prisma.envio.update).toHaveBeenCalledWith({
        where: { id: 'env-1' },
        data: expect.objectContaining({ estado: EstadoEnvio.ENTREGADO }),
      });
      expect(prisma.subPedido.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { estado: EstadoSubPedido.ENTREGADO },
      });
      expect(financeService.transferPendingToAvailable).toHaveBeenCalledWith('sub-1');
      expect(prisma.pedido.update).toHaveBeenCalledWith({
        where: { id: 'ord-1' },
        data: { estado: EstadoPedido.COMPLETADO },
      });
    });
  });

  describe('getTracking', () => {
    it('debe retornar información y eventos de rastreo', async () => {
      prisma.envio.findUnique.mockResolvedValue({
        id: 'env-1',
        numeroGuia: 'DHL-123',
        eventos: [{ id: 'ev-1', estadoHito: 'GUIA_GENERADA' }],
      });

      const res = await service.getTracking('DHL-123');
      expect(res.numeroGuia).toBe('DHL-123');
      expect(res.eventos).toHaveLength(1);
    });
  });
});
