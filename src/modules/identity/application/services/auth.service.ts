import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@core/database/prisma.service';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { EstadoUsuario } from '@prisma/client';

const MENSAJE_RECUPERACION =
  'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Registro de nuevo usuario (asigna rol CLIENTE por defecto)
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Obtener rol CLIENTE por defecto
    const clienteRol = await this.prisma.rol.findUnique({
      where: { slug: 'CLIENTE' },
    });

    const user = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        email: dto.email.toLowerCase().trim(),
        telefono: dto.telefono?.trim(),
        passwordHash,
        estado: EstadoUsuario.ACTIVO,
        roles: clienteRol
          ? {
              create: {
                rolId: clienteRol.id,
              },
            }
          : undefined,
      },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: {
                  include: {
                    permiso: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Inicio de sesión con verificación de credenciales y estado del usuario
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: {
                  include: {
                    permiso: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales de acceso incorrectas.');
    }

    if (user.estado !== EstadoUsuario.ACTIVO) {
      throw new UnauthorizedException(`La cuenta de usuario se encuentra en estado: ${user.estado}.`);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales de acceso incorrectas.');
    }

    // Actualizar último acceso de manera asíncrona
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { ultimoAcceso: new Date() },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Renovación de token de acceso mediante Refresh Token
   */
  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
        include: {
          roles: {
            include: {
              rol: {
                include: {
                  permisos: {
                    include: {
                      permiso: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user || user.estado !== EstadoUsuario.ACTIVO) {
        throw new UnauthorizedException('Usuario inactivo o sesión no válida.');
      }

      const tokens = await this.generateTokens(user);

      return {
        tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token expirado o inválido.');
    }
  }

  /**
   * Solicitud de recuperación de contraseña.
   * La respuesta es siempre la misma, exista o no la cuenta, para no
   * revelar qué correos están registrados. El token viaja en claro solo
   * en el enlace enviado; en base de datos se guarda su hash SHA-256.
   *
   * PENDIENTE DE INFRAESTRUCTURA: el proyecto aún no tiene un proveedor
   * de correo configurado. Mientras tanto el token se registra en el log
   * del servidor solo en entornos que no sean producción.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.usuario.findUnique({ where: { email } });

    if (user && user.estado === EstadoUsuario.ACTIVO) {
      const token = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await this.prisma.usuario.update({
        where: { id: user.id },
        data: {
          tokenRestablecimientoHash: tokenHash,
          tokenRestablecimientoExpira: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(
          `[dev] Enlace de restablecimiento para ${email}: /restablecer?token=${token} (sin proveedor de correo configurado)`,
        );
      } else {
        this.logger.warn(
          `Restablecimiento solicitado para el usuario ${user.id}, pero no hay un proveedor de correo configurado para entregar el enlace.`,
        );
      }
    }

    return { message: MENSAJE_RECUPERACION };
  }

  /**
   * Restablecer la contraseña con el token recibido.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token.trim()).digest('hex');
    const user = await this.prisma.usuario.findFirst({
      where: {
        tokenRestablecimientoHash: tokenHash,
        tokenRestablecimientoExpira: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'El enlace de restablecimiento no es válido o ya venció. Solicita uno nuevo.',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.nuevaPassword, salt);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenRestablecimientoHash: null,
        tokenRestablecimientoExpira: null,
      },
    });

    return { message: 'Tu contraseña se restableció correctamente. Ya puedes iniciar sesión.' };
  }

  /**
   * Validación para JwtStrategy
   */
  async validateUserFromJwt(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            rol: {
              include: {
                permisos: {
                  include: {
                    permiso: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.estado !== EstadoUsuario.ACTIVO) {
      return null;
    }

    const roles = user.roles.map((r) => r.rol.slug);
    const permisosMap = new Map<string, { modulo: string; accion: string }>();

    for (const userRol of user.roles) {
      for (const rolPerm of userRol.rol.permisos) {
        const key = `${rolPerm.permiso.modulo}:${rolPerm.permiso.accion}`;
        if (!permisosMap.has(key)) {
          permisosMap.set(key, {
            modulo: rolPerm.permiso.modulo,
            accion: rolPerm.permiso.accion,
          });
        }
      }
    }

    return {
      userId: user.id,
      email: user.email,
      roles,
      permisos: Array.from(permisosMap.values()),
    };
  }

  /**
   * Generación de Access Token y Refresh Token con claims de roles y permisos
   */
  private async generateTokens(user: any): Promise<AuthTokens> {
    const roles = user.roles?.map((r: any) => r.rol.slug) || [];
    const permisos: Array<{ modulo: string; accion: string }> = [];

    const permisosSet = new Set<string>();
    for (const userRol of user.roles || []) {
      for (const rolPerm of userRol.rol.permisos || []) {
        const key = `${rolPerm.permiso.modulo}:${rolPerm.permiso.accion}`;
        if (!permisosSet.has(key)) {
          permisosSet.add(key);
          permisos.push({
            modulo: rolPerm.permiso.modulo,
            accion: rolPerm.permiso.accion,
          });
        }
      }
    }

    const jwtSecret = this.configService.get<string>('jwt.secret');
    const expiresIn = this.configService.get<string>('jwt.expiresIn');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');

    const payload = {
      sub: user.id,
      email: user.email,
      roles,
      permisos,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn,
      }),
      this.jwtService.signAsync(
        { sub: user.id, email: user.email },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
    };
  }

  /**
   * Sanitiza el usuario para remover campos sensibles (passwordHash)
   */
  private sanitizeUser(user: any) {
    const { passwordHash, tokenRestablecimientoHash, tokenRestablecimientoExpira, roles, ...rest } = user;
    const rolesList = roles?.map((r: any) => r.rol.slug) || [];
    const permisosMap = new Map<string, { modulo: string; accion: string }>();

    for (const userRol of roles || []) {
      for (const rolPerm of userRol.rol?.permisos || []) {
        const key = `${rolPerm.permiso.modulo}:${rolPerm.permiso.accion}`;
        if (!permisosMap.has(key)) {
          permisosMap.set(key, {
            modulo: rolPerm.permiso.modulo,
            accion: rolPerm.permiso.accion,
          });
        }
      }
    }

    return {
      ...rest,
      roles: rolesList,
      permisos: Array.from(permisosMap.values()),
    };
  }
}
