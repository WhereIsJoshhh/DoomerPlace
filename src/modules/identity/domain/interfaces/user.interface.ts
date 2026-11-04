import { EstadoUsuario } from '../enums';

export interface IUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  passwordHash: string;
  emailVerificado: boolean;
  telefonoVerificado: boolean;
  estado: EstadoUsuario;
  ultimoAcceso?: Date;
  fechaRegistro: Date;
  fechaActualizacion: Date;
}

export interface IUserProfile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  emailVerificado: boolean;
  telefonoVerificado: boolean;
  estado: EstadoUsuario;
  roles: string[];
  permisos: Array<{ modulo: string; accion: string }>;
  ultimoAcceso?: Date;
  fechaRegistro: Date;
}
