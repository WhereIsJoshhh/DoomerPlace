import { AccionPermiso } from '../enums';

export interface IPermiso {
  id: string;
  nombre: string;
  modulo: string;
  accion: AccionPermiso;
  descripcion?: string;
}

export interface IRol {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  esSistema: boolean;
  estado: boolean;
  permisos?: IPermiso[];
}
