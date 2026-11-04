import { EstadoEnvio } from '@prisma/client';

export interface IEventoTracking {
  id: string;
  envioId: string;
  estadoHito: string;
  ubicacion?: string | null;
  descripcion: string;
  fechaEvento: Date;
}

export interface IEnvio {
  id: string;
  subPedidoId: string;
  direccionEnvioId: string;
  proveedorLogistico: string;
  numeroGuia?: string | null;
  urlTracking?: string | null;
  costoRealEnvio: number;
  pesoTotal: number;
  fechaDespacho?: Date | null;
  fechaEstimadaEntrega?: Date | null;
  fechaEntregaReal?: Date | null;
  estado: EstadoEnvio;
  eventos?: IEventoTracking[];
}
