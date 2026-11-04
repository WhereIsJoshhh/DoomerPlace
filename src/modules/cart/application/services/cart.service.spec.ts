import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '@core/database/prisma.service';
import { CacheService } from '@core/cache/cache.service';
import { EstadoCarrito } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prisma: any;
  let cacheService: any;

  const mockCarrito = {
    id: 'cart-1',
    usuarioId: 'user-1',
    tokenSesion: null,
    estado: EstadoCarrito.ACTIVO,
    expiraEn: new Date(Date.now() + 86400000),
    items: [],
  };

  const mockProducto = {
    id: 'prod-1',
    nombre: 'Polo Sport',
    slug: 'polo-sport',
    tiendaId: 'store-1',
    estado: 'ACTIVO',
    tienda: { id: 'store-1', nombre: 'Sport Store', slug: 'sport-store' },
  };

  const mockVariante = {
    id: 'var-1',
    productoId: 'prod-1',
    sku: 'POLO-SPORT-ROJO-M',
    nombreVariante: 'Rojo / M',
    precio: 29.99,
    estado: true,
    inventario: {
      id: 'inv-1',
      stockDisponible: 50,
      permitirSobreventa: false,
    },
  };

  beforeEach(async () => {
    prisma = {
      carrito: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      carritoItem: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      producto: {
        findUnique: jest.fn(),
      },
      productoVariante: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      inventario: {
        findUnique: jest.fn(),
      },
    };

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('addItem', () => {
    it('debe crear un carrito nuevo y agregar un ítem con variante para usuario autenticado', async () => {
      prisma.producto.findUnique.mockResolvedValue(mockProducto);
      prisma.productoVariante.findUnique.mockResolvedValue(mockVariante);
      prisma.carrito.findFirst.mockResolvedValue(null); // No existe carrito previo
      prisma.carrito.create.mockResolvedValue({ ...mockCarrito, items: [] });
      prisma.carritoItem.create.mockResolvedValue({
        id: 'item-1',
        carritoId: 'cart-1',
        productoId: 'prod-1',
        varianteId: 'var-1',
        cantidad: 2,
        precioUnitario: 29.99,
        subtotalCalculado: 59.98,
      });

      const result = await service.addItem(
        { productoId: 'prod-1', varianteId: 'var-1', cantidad: 2 },
        'user-1',
      );

      expect(prisma.carrito.create).toHaveBeenCalled();
      expect(prisma.carritoItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productoId: 'prod-1',
            varianteId: 'var-1',
            cantidad: 2,
            precioUnitario: 29.99,
            subtotalCalculado: 59.98,
          }),
        }),
      );
      expect(result.cantidad).toBe(2);
    });

    it('debe sumar cantidad si el ítem ya existe en el carrito', async () => {
      const existingItem = {
        id: 'item-1',
        productoId: 'prod-1',
        varianteId: 'var-1',
        cantidad: 3,
        precioUnitario: 29.99,
        subtotalCalculado: 89.97,
      };

      prisma.producto.findUnique.mockResolvedValue(mockProducto);
      prisma.productoVariante.findUnique.mockResolvedValue(mockVariante);
      prisma.carrito.findFirst.mockResolvedValue({ ...mockCarrito, items: [existingItem] });
      prisma.carritoItem.update.mockResolvedValue({ ...existingItem, cantidad: 5, subtotalCalculado: 149.95 });

      const result = await service.addItem(
        { productoId: 'prod-1', varianteId: 'var-1', cantidad: 2 },
        'user-1',
      );

      expect(prisma.carritoItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({ cantidad: 5 }),
        }),
      );
    });

    it('debe lanzar BadRequestException si el stock disponible es insuficiente', async () => {
      prisma.producto.findUnique.mockResolvedValue(mockProducto);
      prisma.productoVariante.findUnique.mockResolvedValue({
        ...mockVariante,
        inventario: { stockDisponible: 1, permitirSobreventa: false },
      });

      await expect(
        service.addItem({ productoId: 'prod-1', varianteId: 'var-1', cantidad: 5 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el producto no existe', async () => {
      prisma.producto.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem({ productoId: 'no-existe', cantidad: 1 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('mergeGuestCart', () => {
    it('debe fusionar ítems del carrito anónimo al carrito del usuario y marcar el invitado como CONVERTIDO', async () => {
      const guestItem = {
        id: 'guest-item-1',
        productoId: 'prod-1',
        varianteId: 'var-1',
        tiendaId: 'store-1',
        cantidad: 2,
        precioUnitario: 29.99,
        subtotalCalculado: 59.98,
      };

      prisma.carrito.findUnique.mockResolvedValue({
        ...mockCarrito,
        id: 'guest-cart',
        tokenSesion: 'guest-token',
        usuarioId: null,
        items: [guestItem],
      });
      prisma.carrito.findFirst.mockResolvedValue({ ...mockCarrito, items: [] });
      prisma.carritoItem.create.mockResolvedValue({ ...guestItem, carritoId: 'cart-1' });
      prisma.carrito.update.mockResolvedValue({
        ...mockCarrito,
        id: 'guest-cart',
        estado: EstadoCarrito.CONVERTIDO,
      });

      const result = await service.mergeGuestCart('user-1', 'guest-token');

      expect(prisma.carritoItem.create).toHaveBeenCalled();
      expect(prisma.carrito.update).toHaveBeenCalledWith({
        where: { id: 'guest-cart' },
        data: { estado: EstadoCarrito.CONVERTIDO },
      });
      expect(result.itemsFusionados).toBe(1);
    });

    it('debe retornar 0 ítems fusionados si el carrito de invitado está vacío', async () => {
      prisma.carrito.findUnique.mockResolvedValue({
        ...mockCarrito,
        tokenSesion: 'guest-token',
        items: [],
      });

      const result = await service.mergeGuestCart('user-1', 'guest-token');
      expect(result.itemsFusionados).toBe(0);
    });
  });

  describe('updateItem', () => {
    it('debe eliminar el ítem si la cantidad es 0', async () => {
      prisma.carritoItem.findUnique.mockResolvedValue({
        id: 'item-1',
        carrito: { usuarioId: 'user-1', tokenSesion: null },
        cantidad: 3,
        precioUnitario: 29.99,
      });
      prisma.carritoItem.delete.mockResolvedValue({ id: 'item-1' });

      const result = await service.updateItem({ itemId: 'item-1', cantidad: 0 }, 'user-1');
      expect(prisma.carritoItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
      expect((result as any).message).toContain('eliminado');
    });
  });

  describe('generateSessionToken', () => {
    it('debe generar un token UUID único para el carrito de invitado', () => {
      const token = service.generateSessionToken();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
