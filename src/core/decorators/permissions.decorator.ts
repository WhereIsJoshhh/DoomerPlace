import { SetMetadata } from '@nestjs/common';
import { AccionPermiso } from '@prisma/client';

export interface RequiredPermission {
  modulo: string;
  accion: AccionPermiso;
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
