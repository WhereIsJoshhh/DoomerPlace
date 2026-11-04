import { TipoDireccion } from '../enums';

export interface IDireccion {
  id: string;
  usuarioId: string;
  tipo: TipoDireccion;
  alias?: string;
  receptor: string;
  telefono: string;
  pais: string;
  departamento: string;
  ciudad: string;
  colonia?: string;
  calle: string;
  referencia?: string;
  codigoPostal: string;
  latitud?: number;
  longitud?: number;
  esPrincipal: boolean;
  fechaRegistro: Date;
}
