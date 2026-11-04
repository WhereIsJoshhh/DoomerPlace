import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { EstadoUsuario } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener el perfil completo del usuario autenticado (/users/me)
   */
  async getMe(userId: string) {
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
        direcciones: true,
        vendedor: {
          include: {
            tienda: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Buscar usuario por ID
   */
  async findById(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
        direcciones: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Listar usuarios paginados
   */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.usuario.findMany({
        skip,
        take: limit,
        orderBy: { fechaRegistro: 'desc' },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((u) => this.sanitizeUser(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Actualizar estado del usuario (ACTIVO, INACTIVO, SUSPENDIDO)
   */
  async updateStatus(userId: string, estado: EstadoUsuario) {
    await this.findById(userId);

    const updated = await this.prisma.usuario.update({
      where: { id: userId },
      data: { estado },
      include: {
        roles: {
          include: {
            rol: true,
          },
        },
      },
    });

    return this.sanitizeUser(updated);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, roles, ...rest } = user;
    const rolesList = roles?.map((r: any) => r.rol?.slug || r.rolId) || [];

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
