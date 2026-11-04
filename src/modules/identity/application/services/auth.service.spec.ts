import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { EstadoUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const mockUser = {
    id: 'user-uuid-1',
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan.perez@example.com',
    passwordHash: '',
    estado: EstadoUsuario.ACTIVO,
    roles: [
      {
        rol: {
          slug: 'CLIENTE',
          permisos: [
            {
              permiso: {
                modulo: 'CATALOGO',
                accion: 'LEER',
              },
            },
          ],
        },
      },
    ],
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('SecurePassword123!', 10);
  });

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      rol: {
        findUnique: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        const configMap: Record<string, string> = {
          'jwt.secret': 'access-secret',
          'jwt.expiresIn': '15m',
          'jwt.refreshSecret': 'refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return configMap[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('debe registrar un nuevo usuario con éxito y retornar tokens', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.rol.findUnique.mockResolvedValue({ id: 'role-client-id', slug: 'CLIENTE' });
      prisma.usuario.create.mockResolvedValue(mockUser);

      const result = await service.register({
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan.perez@example.com',
        password: 'SecurePassword123!',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(mockUser.email);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('debe lanzar ConflictException si el email ya existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'juan.perez@example.com',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('debe autenticar con credenciales correctas y retornar tokens', async () => {
      prisma.usuario.findUnique.mockResolvedValue(mockUser);
      prisma.usuario.update.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'juan.perez@example.com',
        password: 'SecurePassword123!',
      });

      expect(result.tokens).toBeDefined();
      expect(result.user.roles).toContain('CLIENTE');
    });

    it('debe lanzar UnauthorizedException ante contraseña incorrecta', async () => {
      prisma.usuario.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'juan.perez@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'inexistente@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar UnauthorizedException si el usuario está suspendido', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...mockUser,
        estado: EstadoUsuario.SUSPENDIDO,
      });

      await expect(
        service.login({
          email: 'juan.perez@example.com',
          password: 'SecurePassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('debe emitir nuevos tokens si el refresh token es válido', async () => {
      jwtService.verify.mockReturnValue({ sub: mockUser.id });
      prisma.usuario.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('tokens');
      expect(result.tokens.accessToken).toBe('mock-jwt-token');
    });

    it('debe lanzar UnauthorizedException si el token es inválido', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
