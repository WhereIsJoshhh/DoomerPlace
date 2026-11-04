import { EstadoPedido, EstadoSubPedido } from '@prisma/client';

export interface IPedidoItemSnapshot {
  id: string;
  pedidoId: string;
  subPedidoId: string;
  productoId: string;
  varianteId?: string | null;
  nombreProductoSnapshot: string;
  skuSnapshot: string;
  precioUnitario: number;
  costoUnitario?: number | null;
  cantidad: number;
  descuento: number;
  impuesto: number;
  subtotal: number;
}

export interface ISubPedido {
  id: string;
  pedidoId: string;
  tiendaId: string;
  numeroSubPedido: string;
  subtotal: number;
  descuento: number;
  impuesto: number;
  costoEnvio: number;
  total: number;
  porcentajeComision: number;
  montoComisionPlataforma: number;
  montoNetoTienda: number;
  estado: EstadoSubPedido;
  items?: IPedidoItemSnapshot[];
}

export interface IPedido {
  id: string;
  usuarioId: string;
  numeroPedido: string;
  direccionEnvioId: string;
  direccionFacturacionId: string;
  subtotal: number;
  descuentoTotal: number;
  impuestoTotal: number;
  costoEnvioTotal: number;
  total: number;
  moneda: string;
  estado: EstadoPedido;
  cuponId?: string | null;
  subPedidos?: ISubPedido[];
  items?: IPedidoItemSnapshot[];
}
