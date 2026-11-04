import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { PrismaService } from '@core/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoLiquidacion } from '@prisma/client';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      vendedor: {
        findUnique: jest.fn(),
      },
      cuentaBancariaVendedor: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      balanceVendedor: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subPedido: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      liquidacionVendedor: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      detalleLiquidacionSubPedido: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  describe('addBankAccount', () => {
    it('debe registrar una cuenta bancaria desmarcando la anterior si es principal', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ id: 'vend-1' });
      prisma.cuentaBancariaVendedor.create.mockResolvedValue({ id: 'acc-1', esPrincipal: true });

      const res = await service.addBankAccount('user-1', {
        banco: 'Santander',
        tipoCuenta: 'CORRIENTE',
        numeroCuenta: '12345678',
        titularCuenta: 'Tienda Test',
        identificacionTitular: 'RFC123',
        esPrincipal: true,
      });

      expect(prisma.cuentaBancariaVendedor.updateMany).toHaveBeenCalledWith({
        where: { vendedorId: 'vend-1' },
        data: { esPrincipal: false },
      });
      expect(prisma.cuentaBancariaVendedor.create).toHaveBeenCalled();
      expect(res.id).toBe('acc-1');
    });
  });

  describe('transferPendingToAvailable', () => {
    it('debe transferir el importe del subpedido de saldo pendiente a saldo disponible', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        montoNetoTienda: 120.5,
        tienda: { vendedorId: 'vend-1' },
      });
      prisma.balanceVendedor.findUnique.mockResolvedValue({ vendedorId: 'vend-1' });
      prisma.balanceVendedor.update.mockResolvedValue({
        vendedorId: 'vend-1',
        saldoPendiente: 0,
        saldoDisponible: 120.5,
      });

      await service.transferPendingToAvailable('sub-1');

      expect(prisma.balanceVendedor.update).toHaveBeenCalledWith({
        where: { vendedorId: 'vend-1' },
        data: {
          saldoPendiente: { decrement: 120.5 },
          saldoDisponible: { increment: 120.5 },
        },
      });
    });
  });

  describe('requestPayout', () => {
    it('debe lanzar BadRequestException si el saldo disponible es 0', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ id: 'vend-1' });
      prisma.balanceVendedor.findUnique.mockResolvedValue({
        vendedorId: 'vend-1',
        saldoDisponible: 0,
      });

      await expect(
        service.requestPayout('user-1', { cuentaBancariaId: 'acc-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe generar liquidación y deducir saldo disponible', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ id: 'vend-1' });
      prisma.balanceVendedor.findUnique.mockResolvedValue({
        vendedorId: 'vend-1',
        saldoDisponible: 250.0,
      });
      prisma.cuentaBancariaVendedor.findFirst.mockResolvedValue({ id: 'acc-1' });
      prisma.subPedido.findMany.mockResolvedValue([]);
      prisma.liquidacionVendedor.create.mockResolvedValue({
        id: 'liq-1',
        estado: EstadoLiquidacion.PENDIENTE,
        montoNetoPagar: 250.0,
      });

      const res = await service.requestPayout('user-1', { cuentaBancariaId: 'acc-1' });

      expect(prisma.balanceVendedor.update).toHaveBeenCalledWith({
        where: { vendedorId: 'vend-1' },
        data: { saldoDisponible: { decrement: 250.0 } },
      });
      expect(res.id).toBe('liq-1');
    });
  });

  describe('processPayout', () => {
    it('debe marcar liquidación como PAGADA e incrementar saldo retirado', async () => {
      prisma.liquidacionVendedor.findUnique.mockResolvedValue({
        id: 'liq-1',
        vendedorId: 'vend-1',
        montoNetoPagar: 250.0,
        estado: EstadoLiquidacion.PENDIENTE,
      });
      prisma.liquidacionVendedor.update.mockResolvedValue({
        id: 'liq-1',
        estado: EstadoLiquidacion.PAGADA,
      });

      await service.processPayout('liq-1', 'admin-1', {
        estado: EstadoLiquidacion.PAGADA,
        referenciaBancaria: 'REF-9988',
      });

      expect(prisma.balanceVendedor.update).toHaveBeenCalledWith({
        where: { vendedorId: 'vend-1' },
        data: { saldoRetirado: { increment: 250.0 } },
      });
    });

    it('debe revertir el importe a saldo disponible si es rechazada', async () => {
      prisma.liquidacionVendedor.findUnique.mockResolvedValue({
        id: 'liq-1',
        vendedorId: 'vend-1',
        montoNetoPagar: 250.0,
        estado: EstadoLiquidacion.PENDIENTE,
      });

      await service.processPayout('liq-1', 'admin-1', {
        estado: EstadoLiquidacion.RECHAZADA,
      });

      expect(prisma.balanceVendedor.update).toHaveBeenCalledWith({
        where: { vendedorId: 'vend-1' },
        data: { saldoDisponible: { increment: 250.0 } },
      });
    });
  });
});
