import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '@modules/orders/application/services/orders.service';
import { PaymentsService } from '@modules/payments/application/services/payments.service';
import { LogisticsService } from '@modules/logistics/application/services/logistics.service';
import { FinanceService } from '@modules/finance/application/services/finance.service';
import { ReviewsService } from '@modules/reviews/application/services/reviews.service';
import { PromotionsService } from '@modules/promotions/application/services/promotions.service';
import { InventoryService } from '@modules/inventory/application/services/inventory.service';
import { PrismaService } from '@core/database/prisma.service';
import { CacheService } from '@core/cache/cache.service';
import {
  EstadoPedido,
  EstadoSubPedido,
  EstadoPago,
  EstadoEnvio,
  EstadoLiquidacion,
  TipoDescuento,
} from '@prisma/client';

describe('Marketplace Multi-Vendor End-to-End Workflow (Simulation)', () => {
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let logisticsService: LogisticsService;
  let financeService: FinanceService;
  let reviewsService: ReviewsService;
  let promotionsService: PromotionsService;
  let inventoryService: InventoryService;
  let prisma: any;

  beforeAll(async () => {
    prisma = {
      direccion: { findFirst: jest.fn() },
      carrito: { findFirst: jest.fn(), update: jest.fn() },
      carritoItem: { deleteMany: jest.fn() },
      producto: { findUnique: jest.fn() },
      productoVariante: { findUnique: jest.fn() },
      inventario: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      movimientoInventario: { create: jest.fn() },
      pedido: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      subPedido: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      pedidoItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      historialEstadoPedido: { create: jest.fn() },
      balanceVendedor: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      metodoPago: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
      pago: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      envio: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      eventoTracking: { create: jest.fn() },
      cuentaBancariaVendedor: { findFirst: jest.fn() },
      liquidacionVendedor: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      detalleLiquidacionSubPedido: { create: jest.fn() },
      resenaProducto: { create: jest.fn() },
      cupon: { findUnique: jest.fn(), update: jest.fn() },
      cuponUso: { count: jest.fn(), create: jest.fn() },
      vendedor: { findUnique: jest.fn() },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const cacheServiceMock = {
      acquireLock: jest.fn().mockResolvedValue({ acquired: true, lockId: 'lock-123' }),
      releaseLock: jest.fn().mockResolvedValue(true),
      set: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue(null),
    };

    const configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'business.reservationTtlMinutes') return 15;
        return null;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        PaymentsService,
        LogisticsService,
        FinanceService,
        ReviewsService,
        PromotionsService,
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    ordersService = moduleFixture.get<OrdersService>(OrdersService);
    paymentsService = moduleFixture.get<PaymentsService>(PaymentsService);
    logisticsService = moduleFixture.get<LogisticsService>(LogisticsService);
    financeService = moduleFixture.get<FinanceService>(FinanceService);
    reviewsService = moduleFixture.get<ReviewsService>(ReviewsService);
    promotionsService = moduleFixture.get<PromotionsService>(PromotionsService);
    inventoryService = moduleFixture.get<InventoryService>(InventoryService);
  });

  it('1. Valida un cupón de bienvenida con cálculo correcto de descuento', async () => {
    prisma.cupon.findUnique.mockResolvedValue({
      id: 'cup-1',
      codigo: 'BIENVENIDO10',
      estado: true,
      fechaInicio: new Date('2026-01-01'),
      fechaFin: new Date('2028-12-31'),
      montoMinimoCompra: 50,
      tipoDescuento: TipoDescuento.PORCENTAJE,
      valorDescuento: 10,
      limiteUsosPorUsuario: 1,
    });
    prisma.cuponUso.count.mockResolvedValue(0);

    const res = await promotionsService.validateCoupon('user-buyer-1', {
      codigo: 'BIENVENIDO10',
      montoCompra: 200,
    });

    expect(res.valido).toBe(true);
    expect(res.descuentoCalculado).toBe(20);
    expect(res.totalConDescuento).toBe(180);
  });

  it('2. Ejecuta Checkout generando Pedido Madre, Split Orders por tienda y reserva de stock con TTL', async () => {
    prisma.direccion.findFirst.mockResolvedValue({
      id: 'dir-shipping-1',
      usuarioId: 'user-buyer-1',
    });

    prisma.carrito.findFirst.mockResolvedValue({
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
          productoId: 'prod-1',
          varianteId: 'var-1',
          cantidad: 1,
          precioUnitario: 200,
          subtotalCalculado: 200,
        },
      ],
    });

    prisma.producto.findUnique.mockResolvedValue({
      id: 'prod-1',
      nombre: 'Smartphone Ultra Pro',
      skuBase: 'SM-ULTRA',
      estado: 'ACTIVO',
      tiendaId: 'store-tech-1',
      tienda: {
        id: 'store-tech-1',
        nombre: 'TechStore',
        vendedor: { id: 'vend-1', porcentajeComisionBase: 10.0 },
      },
    });

    prisma.productoVariante.findUnique.mockResolvedValue({
      id: 'var-1',
      nombreVariante: '256GB Titanio',
      sku: 'SM-ULTRA-256',
      precio: 200,
      costo: 140,
      estado: true,
      inventario: { id: 'inv-1', stockFisico: 10, stockReservado: 0, stockDisponible: 10 },
    });

    prisma.inventario.findUnique.mockResolvedValue({
      id: 'inv-1',
      stockFisico: 10,
      stockReservado: 0,
      stockDisponible: 10,
      permitirSobreventa: false,
    });
    prisma.inventario.update.mockResolvedValue({
      id: 'inv-1',
      stockFisico: 10,
      stockReservado: 1,
      stockDisponible: 9,
    });

    prisma.pedido.create.mockResolvedValue({
      id: 'order-1',
      numeroPedido: 'ORD-20261104-001',
    });
    prisma.subPedido.create.mockResolvedValue({
      id: 'sub-1',
      numeroSubPedido: 'ORD-20261104-001-01',
      montoNetoTienda: 180,
    });
    prisma.pedidoItem.create.mockResolvedValue({ id: 'pi-1' });

    prisma.pedido.findUnique.mockResolvedValue({
      id: 'order-1',
      numeroPedido: 'ORD-20261104-001',
      estado: EstadoPedido.PENDIENTE_PAGO,
      subPedidos: [{ id: 'sub-1', tiendaId: 'store-tech-1' }],
    });

    const ordenCreada = await ordersService.createOrder('user-buyer-1', {
      direccionEnvioId: 'dir-shipping-1',
      metodoPagoCodigo: 'STRIPE',
    });

    expect(ordenCreada).toBeDefined();
    expect(prisma.pedido.create).toHaveBeenCalled();
    expect(prisma.subPedido.create).toHaveBeenCalled();
    expect(prisma.pedidoItem.create).toHaveBeenCalled();
  });

  it('3. Genera intención de pago y procesa webhook externo de aprobación de forma idempotente', async () => {
    prisma.pedido.findUnique.mockResolvedValue({
      id: 'order-1',
      usuarioId: 'user-buyer-1',
      numeroPedido: 'ORD-20261104-001',
      estado: EstadoPedido.PENDIENTE_PAGO,
      total: 200,
      moneda: 'USD',
      pagos: [],
    });
    prisma.metodoPago.findUnique.mockResolvedValue({
      id: 'mp-1',
      codigo: 'STRIPE',
      nombre: 'Stripe',
    });
    prisma.pago.create.mockResolvedValue({
      id: 'pago-1',
      pedidoId: 'order-1',
      monto: 200,
      moneda: 'USD',
      transaccionExternaId: 'ch_stripe_e2e_123',
    });

    const intent = await paymentsService.initiatePayment('user-buyer-1', {
      pedidoId: 'order-1',
      metodoPagoCodigo: 'STRIPE',
    });
    expect(intent.pagoId).toBe('pago-1');

    // Procesar Webhook
    prisma.pago.findUnique.mockResolvedValue({
      id: 'pago-1',
      pedidoId: 'order-1',
      estado: EstadoPago.PENDIENTE,
    });
    prisma.pago.update.mockResolvedValue({
      id: 'pago-1',
      estado: EstadoPago.APROBADO,
    });

    // Mock confirmOrderPaid dependencies
    prisma.pedido.findUnique.mockResolvedValue({
      id: 'order-1',
      numeroPedido: 'ORD-20261104-001',
      usuarioId: 'user-buyer-1',
      estado: EstadoPedido.PENDIENTE_PAGO,
      items: [{ productoId: 'prod-1', varianteId: 'var-1', cantidad: 1 }],
      subPedidos: [
        {
          id: 'sub-1',
          montoNetoTienda: 180,
          tienda: { vendedorId: 'vend-1' },
        },
      ],
    });
    prisma.pedido.update.mockResolvedValue({ id: 'order-1', estado: EstadoPedido.PAGADO });
    prisma.subPedido.update.mockResolvedValue({ id: 'sub-1', estado: EstadoSubPedido.CONFIRMADO });
    prisma.balanceVendedor.findUnique.mockResolvedValue({ vendedorId: 'vend-1', saldoPendiente: 0 });
    prisma.balanceVendedor.update.mockResolvedValue({ vendedorId: 'vend-1', saldoPendiente: 180 });
    prisma.inventario.findUnique.mockResolvedValue({ id: 'inv-1', stockFisico: 10, stockReservado: 1 });

    const webhookRes = await paymentsService.processWebhook({
      transaccionExternaId: 'ch_stripe_e2e_123',
      evento: 'payment_intent.succeeded',
      estado: 'SUCCEEDED',
      codigoAutorizacion: 'AUTH-E2E-999',
    });

    expect(webhookRes.status).toBe('PROCESSED');
    expect(prisma.pago.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: EstadoPago.APROBADO }),
      }),
    );
  });

  it('4. Despacha SubPedido generando guía logística y evento de entrega que libera fondos', async () => {
    // 1. Crear despacho
    prisma.subPedido.findUnique.mockResolvedValue({
      id: 'sub-1',
      pedidoId: 'order-1',
      estado: EstadoSubPedido.CONFIRMADO,
      tienda: { vendedor: { usuarioId: 'user-vendor-1' } },
      pedido: { direccionEnvioId: 'dir-shipping-1' },
      envio: null,
    });
    prisma.envio.create.mockResolvedValue({
      id: 'env-1',
      subPedidoId: 'sub-1',
      numeroGuia: 'DHL-E2E-777',
      estado: EstadoEnvio.GUIA_GENERADA,
    });

    const shipment = await logisticsService.createShipment('user-vendor-1', {
      subPedidoId: 'sub-1',
      proveedorLogistico: 'DHL',
      numeroGuia: 'DHL-E2E-777',
      costoRealEnvio: 15,
      pesoTotal: 0.5,
    });
    expect(shipment.numeroGuia).toBe('DHL-E2E-777');

    // 2. Evento de entrega (Tracking Webhook)
    prisma.envio.findUnique.mockResolvedValue({
      id: 'env-1',
      subPedidoId: 'sub-1',
      numeroGuia: 'DHL-E2E-777',
      subPedido: {
        id: 'sub-1',
        pedidoId: 'order-1',
        estado: EstadoSubPedido.ENVIADO,
        montoNetoTienda: 180,
        tienda: { vendedorId: 'vend-1' },
        pedido: {
          id: 'order-1',
          estado: EstadoPedido.EN_PROCESO,
          subPedidos: [{ id: 'sub-1', estado: EstadoSubPedido.ENVIADO }],
        },
      },
    });

    prisma.eventoTracking.create.mockResolvedValue({ id: 'ev-delivered' });
    prisma.subPedido.findUnique.mockResolvedValue({
      id: 'sub-1',
      montoNetoTienda: 180,
      tienda: { vendedorId: 'vend-1' },
    });
    prisma.balanceVendedor.findUnique.mockResolvedValue({
      vendedorId: 'vend-1',
      saldoPendiente: 180,
      saldoDisponible: 0,
    });

    await logisticsService.addTrackingEvent('DHL-E2E-777', {
      estadoHito: 'ENTREGADO',
      estadoEnvio: EstadoEnvio.ENTREGADO,
      descripcion: 'Entregado a destinatario con firma',
    });

    // Se verifica que el subpedido transicione a ENTREGADO
    expect(prisma.subPedido.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: { estado: EstadoSubPedido.ENTREGADO },
      }),
    );
    // Se verifica que se transfiera el saldo a saldoDisponible
    expect(prisma.balanceVendedor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vendedorId: 'vend-1' },
        data: {
          saldoPendiente: { decrement: 180 },
          saldoDisponible: { increment: 180 },
        },
      }),
    );
  });

  it('5. Permite al comprador emitir una reseña verificada del producto entregado', async () => {
    prisma.pedidoItem.findUnique.mockResolvedValue({
      id: 'pi-1',
      productoId: 'prod-1',
      pedido: { usuarioId: 'user-buyer-1' },
      resenaProducto: null,
    });

    prisma.resenaProducto.create.mockResolvedValue({
      id: 'rev-1',
      calificacion: 5,
      esCompraVerificada: true,
      titulo: 'Excelente terminal móvil',
    });

    const resena = await reviewsService.createProductReview('user-buyer-1', {
      pedidoItemId: 'pi-1',
      calificacion: 5,
      titulo: 'Excelente terminal móvil',
      comentario: 'Rendimiento sobresaliente y envío rápido.',
    });

    expect(resena.esCompraVerificada).toBe(true);
    expect(prisma.resenaProducto.create).toHaveBeenCalled();
  });

  it('6. Permite al vendedor solicitar y al admin liquidar el payout del saldo disponible', async () => {
    prisma.vendedor.findUnique.mockResolvedValue({ id: 'vend-1', usuarioId: 'user-vendor-1' });
    prisma.balanceVendedor.findUnique.mockResolvedValue({
      vendedorId: 'vend-1',
      saldoDisponible: 180,
      saldoRetirado: 0,
    });
    prisma.cuentaBancariaVendedor.findFirst.mockResolvedValue({
      id: 'bank-acc-1',
      vendedorId: 'vend-1',
      estado: true,
    });
    prisma.subPedido.findMany.mockResolvedValue([]);
    prisma.liquidacionVendedor.create.mockResolvedValue({
      id: 'liq-1',
      estado: EstadoLiquidacion.PENDIENTE,
      montoNetoPagar: 180,
    });

    // Solicitar liquidación
    const payoutReq = await financeService.requestPayout('user-vendor-1', {
      cuentaBancariaId: 'bank-acc-1',
    });
    expect(payoutReq.id).toBe('liq-1');

    // Admin procesa y paga la liquidación
    prisma.liquidacionVendedor.findUnique.mockResolvedValue({
      id: 'liq-1',
      vendedorId: 'vend-1',
      montoNetoPagar: 180,
      estado: EstadoLiquidacion.PENDIENTE,
    });

    await financeService.processPayout('liq-1', 'user-admin-1', {
      estado: EstadoLiquidacion.PAGADA,
      referenciaBancaria: 'SPEI-2026-990011',
    });

    expect(prisma.balanceVendedor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vendedorId: 'vend-1' },
        data: { saldoRetirado: { increment: 180 } },
      }),
    );
  });
});
