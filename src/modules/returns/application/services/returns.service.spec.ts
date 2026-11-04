import { Test, TestingModule } from '@nestjs/testing';
import { ReturnsService } from './returns.service';
import { PrismaService } from '@core/database/prisma.service';
import { InventoryService } from '@modules/inventory/application/services/inventory.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EstadoDevolucion, EstadoSubPedido, InspeccionEstado } from '@prisma/client';

describe('ReturnsService', () => {
  let service: ReturnsService;
  let prisma: any;
  let inventoryService: any;

  beforeEach(async () => {
    prisma = {
      subPedido: {
        findUnique: jest.fn(),
      },
      devolucion: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      devolucionItem: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      inventario: {
        findUnique: jest.fn(),
      },
      reembolso: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    inventoryService = {
      adjustInventory: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReturnsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
  });

  describe('requestReturn', () => {
    it('debe rechazar solicitud si el usuario no es el dueño del pedido', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        pedido: { usuarioId: 'other-user' },
        estado: EstadoSubPedido.ENTREGADO,
        items: [],
      });

      await expect(
        service.requestReturn('user-1', {
          subPedidoId: 'sub-1',
          motivo: 'Falla',
          items: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar si el subpedido no ha sido entregado', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        pedido: { usuarioId: 'user-1' },
        estado: EstadoSubPedido.EN_PREPARACION,
        items: [],
      });

      await expect(
        service.requestReturn('user-1', {
          subPedidoId: 'sub-1',
          motivo: 'Falla',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear solicitud de devolución satisfactoriamente', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        pedido: { usuarioId: 'user-1' },
        estado: EstadoSubPedido.ENTREGADO,
        items: [{ id: 'pi-1' }],
      });

      prisma.devolucion.create.mockResolvedValue({ id: 'dev-1', estado: EstadoDevolucion.SOLICITADA });

      const res = await service.requestReturn('user-1', {
        subPedidoId: 'sub-1',
        motivo: 'Producto defectuoso',
        items: [{ pedidoItemId: 'pi-1', cantidad: 1 }],
      });

      expect(prisma.devolucion.create).toHaveBeenCalled();
      expect(prisma.devolucionItem.create).toHaveBeenCalled();
      expect(res.id).toBe('dev-1');
    });
  });

  describe('reviewReturn', () => {
    it('debe aprobar devolución, registrar inspección conforme y reingresar stock físico', async () => {
      prisma.devolucion.findUnique.mockResolvedValue({
        id: 'dev-1',
        motivo: 'Falla de fábrica',
        items: [{ pedidoItem: { productoId: 'prod-1', varianteId: null }, cantidad: 1 }],
        subPedido: {
          total: 50,
          tienda: { vendedor: { usuarioId: 'vendor-1' } },
          pedido: { pagos: [{ id: 'pago-1', estado: 'APROBADO', moneda: 'USD' }] },
        },
      });

      prisma.devolucion.update.mockResolvedValue({ id: 'dev-1', estado: EstadoDevolucion.APROBADA });
      prisma.inventario.findUnique.mockResolvedValue({ id: 'inv-1' });

      await service.reviewReturn('dev-1', 'vendor-1', {
        estado: EstadoDevolucion.APROBADA,
        inspeccionEstado: InspeccionEstado.CONFORME,
        montoReembolso: 50,
      });

      expect(prisma.devolucion.update).toHaveBeenCalledWith({
        where: { id: 'dev-1' },
        data: expect.objectContaining({ estado: EstadoDevolucion.APROBADA }),
      });
      expect(inventoryService.adjustInventory).toHaveBeenCalled();
      expect(prisma.reembolso.create).toHaveBeenCalled();
    });
  });
});
