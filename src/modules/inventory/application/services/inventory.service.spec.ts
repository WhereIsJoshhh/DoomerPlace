import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '@core/database/prisma.service';
import { CacheService } from '@core/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { TipoMovimientoInventario } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;
  let cacheService: any;

  const mockInventario = {
    id: 'inv-1',
    stockFisico: 100,
    stockReservado: 10,
    stockDisponible: 90,
    stockMinimoAlerta: 5,
    permitirSobreventa: false,
  };

  beforeEach(async () => {
    prisma = {
      inventario: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      movimientoInventario: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    cacheService = {
      acquireLock: jest.fn().mockResolvedValue({ acquired: true, lockId: 'lock-uuid-1', key: 'inv-1' }),
      releaseLock: jest.fn().mockResolvedValue(true),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(15) } },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  // ── AJUSTE DE INVENTARIO ──────────────────────────────────────────────────

  describe('adjustInventory', () => {
    it('debe incrementar stock y registrar movimiento Kardex AJUSTE_POSITIVO', async () => {
      prisma.inventario.findUnique.mockResolvedValue(mockInventario);
      prisma.inventario.update.mockResolvedValue({ ...mockInventario, stockFisico: 150 });
      prisma.movimientoInventario.create.mockResolvedValue({});

      const result = await service.adjustInventory('inv-1', 'user-1', {
        tipo: TipoMovimientoInventario.AJUSTE_POSITIVO,
        cantidad: 50,
        motivo: 'Recepción de mercancía OC-001',
      });

      expect(prisma.inventario.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { stockFisico: 150, stockDisponible: 140 },
      });
      expect(prisma.movimientoInventario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: TipoMovimientoInventario.AJUSTE_POSITIVO,
            cantidad: 50,
            stockAnterior: 100,
            stockNuevo: 150,
          }),
        }),
      );
    });

    it('debe lanzar BadRequestException si no hay stock suficiente para AJUSTE_NEGATIVO', async () => {
      prisma.inventario.findUnique.mockResolvedValue({ ...mockInventario, stockDisponible: 5 });

      await expect(
        service.adjustInventory('inv-1', 'user-1', {
          tipo: TipoMovimientoInventario.AJUSTE_NEGATIVO,
          cantidad: 50,
          motivo: 'Merma',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el inventario no existe', async () => {
      prisma.inventario.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustInventory('no-existe', 'user-1', {
          tipo: TipoMovimientoInventario.AJUSTE_POSITIVO,
          cantidad: 10,
          motivo: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── RESERVA DE STOCK (CHECKOUT TTL) ──────────────────────────────────────

  describe('reserveStock', () => {
    it('debe reservar stock adquiriendo bloqueo distribuido y registrar Kardex RESERVA_CHECKOUT', async () => {
      prisma.inventario.findUnique.mockResolvedValue(mockInventario);
      prisma.inventario.update.mockResolvedValue({
        ...mockInventario,
        stockReservado: 15,
        stockDisponible: 85,
      });
      prisma.movimientoInventario.create.mockResolvedValue({});

      const result = await service.reserveStock('user-1', {
        inventarioId: 'inv-1',
        cantidad: 5,
        referenciaId: 'carrito-abc',
      });

      expect(cacheService.acquireLock).toHaveBeenCalledWith('inventory:inv-1', 5000);
      expect(prisma.inventario.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { stockReservado: 15, stockDisponible: 85 },
      });
      expect(cacheService.releaseLock).toHaveBeenCalledWith('inventory:inv-1', 'lock-uuid-1');
      expect(result.cantidadReservada).toBe(5);
      expect(result.ttlMinutos).toBe(15);
    });

    it('debe lanzar BadRequestException si no puede adquirir el bloqueo distribuido', async () => {
      cacheService.acquireLock.mockResolvedValue({ acquired: false, key: 'inv-1' });

      await expect(
        service.reserveStock('user-1', { inventarioId: 'inv-1', cantidad: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el stock disponible es insuficiente', async () => {
      prisma.inventario.findUnique.mockResolvedValue({ ...mockInventario, stockFisico: 10, stockReservado: 10 });

      await expect(
        service.reserveStock('user-1', { inventarioId: 'inv-1', cantidad: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── LIBERACIÓN DE RESERVA ─────────────────────────────────────────────────

  describe('releaseReservation', () => {
    it('debe liberar la reserva y registrar movimiento LIBERACION_RESERVA en Kardex', async () => {
      prisma.inventario.findUnique.mockResolvedValue(mockInventario);
      prisma.inventario.update.mockResolvedValue({
        ...mockInventario,
        stockReservado: 7,
        stockDisponible: 93,
      });
      prisma.movimientoInventario.create.mockResolvedValue({});

      const result = await service.releaseReservation('user-1', {
        inventarioId: 'inv-1',
        cantidad: 3,
        referenciaId: 'carrito-abc',
      });

      expect(prisma.inventario.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { stockReservado: 7, stockDisponible: 93 },
      });
      expect(prisma.movimientoInventario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: TipoMovimientoInventario.LIBERACION_RESERVA,
            cantidad: 3,
          }),
        }),
      );
    });
  });

  // ── CONFIRMACIÓN DE VENTA ─────────────────────────────────────────────────

  describe('confirmSale', () => {
    it('debe reducir stockFisico y stockReservado al confirmar la venta', async () => {
      prisma.inventario.findUnique.mockResolvedValue(mockInventario);
      prisma.inventario.update.mockResolvedValue({
        ...mockInventario,
        stockFisico: 95,
        stockReservado: 5,
        stockDisponible: 90,
      });
      prisma.movimientoInventario.create.mockResolvedValue({});

      const result = await service.confirmSale('inv-1', 5, 'pedido-xyz', 'user-system');

      expect(prisma.inventario.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { stockFisico: 95, stockReservado: 5, stockDisponible: 90 },
      });
      expect(prisma.movimientoInventario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: TipoMovimientoInventario.SALIDA_VENTA,
            cantidad: 5,
            referenciaTipo: 'PEDIDO',
            referenciaId: 'pedido-xyz',
          }),
        }),
      );
    });
  });
});
