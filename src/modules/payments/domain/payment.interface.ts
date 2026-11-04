import { EstadoPago } from '@prisma/client';

export interface IPago {
  id: string;
  pedidoId: string;
  metodoPagoId: string;
  transaccionExternaId?: string | null;
  monto: number;
  moneda: string;
  estado: EstadoPago;
  codigoAutorizacion?: string | null;
  datosRespuestaPasarela?: any;
  fechaPago?: Date | null;
}

export interface IMetodoPago {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  esPasarelaOnline: boolean;
  activo: boolean;
}
