import { EstadoLiquidacion } from '@prisma/client';

export interface ICuentaBancaria {
  id: string;
  vendedorId: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titularCuenta: string;
  identificacionTitular: string;
  esPrincipal: boolean;
  estado: boolean;
}

export interface IBalanceVendedor {
  id: string;
  vendedorId: string;
  saldoPendiente: number;
  saldoDisponible: number;
  saldoRetirado: number;
}

export interface ILiquidacionVendedor {
  id: string;
  vendedorId: string;
  cuentaBancariaId: string;
  numeroLiquidacion: string;
  periodoInicio: Date;
  periodoFin: Date;
  totalVentasBrutas: number;
  totalComisionesDescontadas: number;
  totalEnviosReembolsados: number;
  totalRetencionesFiscales: number;
  montoNetoPagar: number;
  estado: EstadoLiquidacion;
  referenciaBancaria?: string | null;
  comprobanteUrl?: string | null;
  fechaPago?: Date | null;
}
