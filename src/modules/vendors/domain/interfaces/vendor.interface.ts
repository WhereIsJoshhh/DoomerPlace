import { EstadoVendedor, TipoPersona, EstadoDocumento } from '@prisma/client';

export interface IDocumentoVendedor {
  id: string;
  vendedorId: string;
  tipoDocumento: string;
  numeroDocumento: string;
  archivoUrl: string;
  estado: EstadoDocumento;
  observacionesRevision?: string;
  revisadoPorUsuarioId?: string;
  fechaSubida: Date;
  fechaRevision?: Date;
}

export interface IVendedor {
  id: string;
  usuarioId: string;
  razonSocial: string;
  nombreComercial: string;
  identificacionFiscal: string;
  tipoPersona: TipoPersona;
  telefonoComercial: string;
  emailComercial: string;
  estado: EstadoVendedor;
  porcentajeComisionBase: number;
  calificacionPromedio: number;
  fechaSolicitud: Date;
  fechaAprobacion?: Date;
  documentos?: IDocumentoVendedor[];
}
