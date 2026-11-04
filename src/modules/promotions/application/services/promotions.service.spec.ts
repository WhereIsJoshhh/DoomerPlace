import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '@core/database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TipoDescuento } from '@prisma/client';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      cupon: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cuponUso: {
        count: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
  });

  describe('createCoupon', () => {
    it('debe registrar un cupón si el código no está duplicado', async () => {
      prisma.cupon.findUnique.mockResolvedValue(null);
      prisma.cupon.create.mockResolvedValue({ id: 'c-1', codigo: 'PROMO10' });

      const res = await service.createCoupon({
        codigo: 'PROMO10',
        tipoDescuento: TipoDescuento.PORCENTAJE,
        valorDescuento: 10,
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + 86400000),
      });

      expect(prisma.cupon.create).toHaveBeenCalled();
      expect(res.codigo).toBe('PROMO10');
    });
  });

  describe('validateCoupon', () => {
    it('debe rechazar si el cupón está fuera de fecha', async () => {
      prisma.cupon.findUnique.mockResolvedValue({
        id: 'c-1',
        codigo: 'EXPIRADO',
        estado: true,
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2020-01-02'),
      });

      await expect(
        service.validateCoupon('user-1', { codigo: 'EXPIRADO', montoCompra: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si el usuario ya consumió su límite de uso', async () => {
      prisma.cupon.findUnique.mockResolvedValue({
        id: 'c-1',
        codigo: 'LIMITADO',
        estado: true,
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2099-01-01'),
        montoMinimoCompra: 0,
        limiteUsosPorUsuario: 1,
      });

      prisma.cuponUso.count.mockResolvedValue(1);

      await expect(
        service.validateCoupon('user-1', { codigo: 'LIMITADO', montoCompra: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe calcular correctamente el descuento porcentual', async () => {
      prisma.cupon.findUnique.mockResolvedValue({
        id: 'c-1',
        codigo: 'SALE20',
        estado: true,
        fechaInicio: new Date('2020-01-01'),
        fechaFin: new Date('2099-01-01'),
        montoMinimoCompra: 50,
        tipoDescuento: TipoDescuento.PORCENTAJE,
        valorDescuento: 20,
        limiteUsosPorUsuario: 1,
      });

      prisma.cuponUso.count.mockResolvedValue(0);

      const res = await service.validateCoupon('user-1', { codigo: 'SALE20', montoCompra: 100 });
      expect(res.valido).toBe(true);
      expect(res.descuentoCalculado).toBe(20);
      expect(res.totalConDescuento).toBe(80);
    });
  });
});
