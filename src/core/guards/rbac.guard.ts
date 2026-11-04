import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';
import { AuthenticatedUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la ruta no exige roles ni permisos específicos, permite el paso
    if (!requiredRoles && !requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUserPayload = request.user;

    if (!user) {
      throw new ForbiddenException('No hay información de usuario autenticado en la solicitud.');
    }

    // Bypass automático para Super Administrador
    if (user.roles?.includes('SUPER_ADMIN')) {
      return true;
    }

    // 1. Verificación por Roles (OR: basta con tener uno de los roles requeridos)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
      if (!hasRole) {
        throw new ForbiddenException(`Acceso denegado: Se requiere uno de los roles: [${requiredRoles.join(', ')}]`);
      }
    }

    // 2. Verificación por Permisos Atómicos (AND: debe poseer todos los permisos requeridos para la acción)
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = user.permisos || [];

      const hasAllPermissions = requiredPermissions.every((reqPerm) =>
        userPermissions.some(
          (userPerm) =>
            userPerm.modulo.toUpperCase() === reqPerm.modulo.toUpperCase() &&
            userPerm.accion.toUpperCase() === reqPerm.accion.toUpperCase(),
        ),
      );

      if (!hasAllPermissions) {
        const requiredStr = requiredPermissions
          .map((p) => `${p.modulo}:${p.accion}`)
          .join(', ');
        throw new ForbiddenException(`Acceso denegado: Permisos insuficientes. Requiere: [${requiredStr}]`);
      }
    }

    return true;
  }
}
