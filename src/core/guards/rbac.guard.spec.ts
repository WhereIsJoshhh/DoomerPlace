import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';
import { AccionPermiso } from '@prisma/client';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RbacGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('debe permitir acceso si no hay requerimientos de roles ni permisos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({ userId: '1', roles: ['CLIENTE'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe permitir acceso total incondicional a SUPER_ADMIN', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'roles') return ['ADMIN'];
      if (key === 'permissions') return [{ modulo: 'USUARIOS', accion: AccionPermiso.ELIMINAR }];
      return null;
    });

    const context = createMockContext({
      userId: '1',
      roles: ['SUPER_ADMIN'],
      permisos: [],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe rechazar acceso si el usuario no tiene el rol requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'roles') return ['ADMIN'];
      return null;
    });

    const context = createMockContext({
      userId: '1',
      roles: ['CLIENTE'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe permitir acceso si el usuario cuenta con el rol requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'roles') return ['VENDEDOR', 'ADMIN'];
      return null;
    });

    const context = createMockContext({
      userId: '1',
      roles: ['VENDEDOR'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('debe rechazar acceso si falta un permiso atómico requerido', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') {
        return [{ modulo: 'USUARIOS', accion: AccionPermiso.ACTUALIZAR }];
      }
      return null;
    });

    const context = createMockContext({
      userId: '1',
      roles: ['CLIENTE'],
      permisos: [{ modulo: 'USUARIOS', accion: 'LEER' }],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('debe permitir acceso si el usuario posee los permisos requeridos', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') {
        return [
          { modulo: 'CATALOGO', accion: AccionPermiso.CREAR },
          { modulo: 'CATALOGO', accion: AccionPermiso.LEER },
        ];
      }
      return null;
    });

    const context = createMockContext({
      userId: '1',
      roles: ['VENDEDOR'],
      permisos: [
        { modulo: 'CATALOGO', accion: 'CREAR' },
        { modulo: 'CATALOGO', accion: 'LEER' },
      ],
    });

    expect(guard.canActivate(context)).toBe(true);
  });
});
