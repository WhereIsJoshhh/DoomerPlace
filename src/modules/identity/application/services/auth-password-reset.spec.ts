import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '@core/database/prisma.service';
import { EstadoUsuario } from '@prisma/client';

describe('AuthService — recuperación de contraseña', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      usuario: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn(), verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('responde el mismo mensaje genérico si el correo no existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const result = await service.forgotPassword({ email: 'nadie@example.com' });

    expect(result.message).toContain('Si existe una cuenta con ese correo');
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('guarda solo el hash del token cuando la cuenta existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u-1', estado: EstadoUsuario.ACTIVO });

    const result = await service.forgotPassword({ email: 'Ana@Example.com' });

    expect(result.message).toContain('Si existe una cuenta con ese correo');
    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    const data = prisma.usuario.update.mock.calls[0][0].data;
    expect(data.tokenRestablecimientoHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.tokenRestablecimientoExpira.getTime()).toBeGreaterThan(Date.now());
  });

  it('restablece la contraseña con un token válido y lo invalida', async () => {
    const token = 'token-de-prueba';
    prisma.usuario.findFirst.mockResolvedValue({ id: 'u-1' });

    const result = await service.resetPassword({ token, nuevaPassword: 'NuevaPassword123!' });

    expect(result.message).toContain('restableció correctamente');
    const where = prisma.usuario.findFirst.mock.calls[0][0].where;
    expect(where.tokenRestablecimientoHash).toBe(createHash('sha256').update(token).digest('hex'));
    const data = prisma.usuario.update.mock.calls[0][0].data;
    expect(data.passwordHash).not.toBe('NuevaPassword123!');
    expect(data.tokenRestablecimientoHash).toBeNull();
  });

  it('rechaza un token inválido o vencido', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'invalido', nuevaPassword: 'NuevaPassword123!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
