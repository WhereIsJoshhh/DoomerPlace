import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '@core/database/prisma.service';
import { InventoryService } from '@modules/inventory/application/services/inventory.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCarrito, EstadoPedido, EstadoSubPedido } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let inventoryService: any;

  beforeEach(async () => {
    prisma = {
      direccion: {
        findFirst: jest.fn(),
      },
      carrito: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      carritoItem: {
        deleteMany: jest.fn(),
      },
      producto: {
        findUnique: jest.fn(),
      },
      productoVariante: {
        findUnique: jest.fn(),
      },
      inventario: {
        findUnique: jest.fn(),
      },
      pedido: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      subPedido: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      pedidoItem: {
        create: jest.fn(),
      },
      historialEstadoPedido: {
        create: jest.fn(),
      },
      balanceVendedor: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      tienda: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    inventoryService = {
      reserveStock: jest.fn().mockResolvedValue({ success: true }),
      releaseReservation: jest.fn().mockResolvedValue({ success: true }),
      confirmSale: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrder', () => {
    it('debe lanzar NotFoundException si la dirección de envío no existe', async () => {
      prisma.direccion.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrder('user-1', {
          direccionEnvioId: 'dir-invalida',
          metodoPagoCodigo: 'STRIPE',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el carrito está vacío', async () => {
      prisma.direccion.findFirst.mockResolvedValue({ id: 'dir-1', usuarioId: 'user-1' });
      prisma.carrito.findFirst.mockResolvedValue({ id: 'cart-1', items: [] });

      await expect(
        service.createOrder('user-1', {
          direccionEnvioId: 'dir-1',
          metodoPagoCodigo: 'STRIPE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear un Pedido Madre, SubPedidos por tienda y snapshots inmutables', async () => {
      prisma.direccion.findFirst.mockResolvedValue({ id: 'dir-1', usuarioId: 'user-1' });
      prisma.carrito.findFirst.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            id: 'item-1',
            productoId: 'prod-1',
            varianteId: 'var-1',
            tiendaId: 'store-1',
            cantidad: 2,
            precioUnitario: 50,
            subtotalCalculado: 100,
          },
        ],
      });

      prisma.producto.findUnique.mockResolvedValue({
        id: 'prod-1',
        nombre: 'Laptop Gamer',
        skuBase: 'LAP-001',
        estado: 'ACTIVO',
        tiendaId: 'store-1',
        tienda: {
          id: 'store-1',
          nombre: 'Tech Store',
          vendedor: { id: 'vend-1', porcentajeComisionBase: 10.0 },
        },
      });

      prisma.productoVariante.findUnique.mockResolvedValue({
        id: 'var-1',
        nombreVariante: '16GB RAM / 1TB SSD',
        sku: 'LAP-001-16GB',
        precio: 50,
        costo: 35,
        estado: true,
        inventario: { id: 'inv-1' },
      });

      prisma.pedido.create.mockResolvedValue({ id: 'order-1', numeroPedido: 'ORD-TEST-001' });
      prisma.subPedido.create.mockResolvedValue({ id: 'sub-1' });
      prisma.pedidoItem.create.mockResolvedValue({ id: 'pi-1' });
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        numeroPedido: 'ORD-TEST-001',
        estado: EstadoPedido.PENDIENTE_PAGO,
      });

      const order = await service.createOrder('user-1', {
        direccionEnvioId: 'dir-1',
        metodoPagoCodigo: 'STRIPE',
      });

      expect(inventoryService.reserveStock).toHaveBeenCalledWith('user-1', {
        inventarioId: 'inv-1',
        cantidad: 2,
        referenciaId: expect.any(String),
      });
      expect(prisma.pedido.create).toHaveBeenCalled();
      expect(prisma.subPedido.create).toHaveBeenCalled();
      expect(prisma.pedidoItem.create).toHaveBeenCalled();
      expect(prisma.carrito.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { estado: EstadoCarrito.CONVERTIDO },
      });
      expect(order).toBeDefined();
    });
  });

  describe('confirmOrderPaid', () => {
    it('debe ser idempotente y no duplicar transacciones si ya está PAGADO', async () => {
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        numeroPedido: 'ORD-1',
        estado: EstadoPedido.PAGADO,
      });

      const res = await service.confirmOrderPaid('order-1', 'txn-123');
      expect(res.estado).toBe(EstadoPedido.PAGADO);
      expect(inventoryService.confirmSale).not.toHaveBeenCalled();
    });

    it('debe transicionar a PAGADO, confirmar venta en inventario y acreditar balance a tienda', async () => {
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        numeroPedido: 'ORD-1',
        usuarioId: 'user-1',
        estado: EstadoPedido.PENDIENTE_PAGO,
        items: [{ productoId: 'prod-1', varianteId: 'var-1', cantidad: 2 }],
        subPedidos: [
          {
            id: 'sub-1',
            montoNetoTienda: 90,
            tienda: { vendedorId: 'vend-1' },
          },
        ],
      });

      prisma.inventario.findUnique.mockResolvedValue({ id: 'inv-1' });
      prisma.balanceVendedor.findUnique.mockResolvedValue({ vendedorId: 'vend-1' });
      prisma.pedido.update.mockResolvedValue({ id: 'order-1', estado: EstadoPedido.PAGADO });

      await service.confirmOrderPaid('order-1', 'txn-123');

      expect(prisma.pedido.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { estado: EstadoPedido.PAGADO },
      });
      expect(prisma.subPedido.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { estado: EstadoSubPedido.CONFIRMADO },
      });
      expect(prisma.balanceVendedor.update).toHaveBeenCalled();
      expect(inventoryService.confirmSale).toHaveBeenCalledWith('inv-1', 2, 'ORD-1', 'user-1');
    });
  });

  describe('cancelOrder', () => {
    it('debe prohibir cancelar una orden si el usuario no es el dueño', async () => {
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        usuarioId: 'user-owner',
        items: [],
      });

      await expect(service.cancelOrder('order-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe cancelar orden y liberar reservas de stock', async () => {
      prisma.pedido.findUnique.mockResolvedValue({
        id: 'order-1',
        usuarioId: 'user-1',
        numeroPedido: 'ORD-1',
        estado: EstadoPedido.PENDIENTE_PAGO,
        items: [{ productoId: 'prod-1', varianteId: 'var-1', cantidad: 2 }],
        subPedidos: [{ id: 'sub-1' }],
      });
      prisma.inventario.findUnique.mockResolvedValue({ id: 'inv-1' });
      prisma.pedido.update.mockResolvedValue({ id: 'order-1', estado: EstadoPedido.CANCELADO });

      const res = await service.cancelOrder('order-1', 'user-1');

      expect(inventoryService.releaseReservation).toHaveBeenCalledWith('user-1', {
        inventarioId: 'inv-1',
        cantidad: 2,
        referenciaId: 'ORD-1',
      });
      expect(prisma.pedido.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { estado: EstadoPedido.CANCELADO },
      });
      expect(res.estado).toBe(EstadoPedido.CANCELADO);
    });
  });

  describe('updateSubOrderStatus', () => {
    it('debe actualizar el estado de subpedido y completar orden madre si todos están entregados', async () => {
      prisma.subPedido.findUnique.mockResolvedValue({
        id: 'sub-1',
        pedidoId: 'order-1',
        estado: EstadoSubPedido.ENVIADO,
        tienda: {
          vendedor: { usuarioId: 'vendor-user' },
        },
        pedido: {
          id: 'order-1',
          estado: EstadoPedido.EN_PROCESO,
          subPedidos: [{ id: 'sub-1', estado: EstadoSubPedido.ENVIADO }],
        },
      });

      prisma.subPedido.update.mockResolvedValue({
        id: 'sub-1',
        estado: EstadoSubPedido.ENTREGADO,
      });

      await service.updateSubOrderStatus('sub-1', 'vendor-user', {
        estado: EstadoSubPedido.ENTREGADO,
      });

      expect(prisma.subPedido.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { estado: EstadoSubPedido.ENTREGADO },
      });
      expect(prisma.pedido.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { estado: EstadoPedido.COMPLETADO },
      });
    });
  });
});
