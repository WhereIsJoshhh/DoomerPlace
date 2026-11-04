import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '@core/database/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      pedidoItem: {
        findUnique: jest.fn(),
      },
      subPedido: {
        findUnique: jest.fn(),
      },
      resenaProducto: {
        create: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      resenaTienda: {
        findUnique: jest.fn(),
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      vendedor: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('createProductReview', () => {
    it('debe rechazar si el usuario no fue quien compró el ítem', async () => {
      prisma.pedidoItem.findUnique.mockResolvedValue({
        id: 'pi-1',
        pedido: { usuarioId: 'other-user' },
      });

      await expect(
        service.createProductReview('user-1', {
          pedidoItemId: 'pi-1',
          calificacion: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe registrar la reseña verificada si la compra es legítima', async () => {
      prisma.pedidoItem.findUnique.mockResolvedValue({
        id: 'pi-1',
        productoId: 'prod-1',
        pedido: { usuarioId: 'user-1' },
        resenaProducto: null,
      });

      prisma.resenaProducto.create.mockResolvedValue({
        id: 'rev-1',
        calificacion: 5,
        esCompraVerificada: true,
      });

      const res = await service.createProductReview('user-1', {
        pedidoItemId: 'pi-1',
        calificacion: 5,
        titulo: 'Excelente',
      });

      expect(prisma.resenaProducto.create).toHaveBeenCalled();
      expect(res.esCompraVerificada).toBe(true);
    });
  });
});
