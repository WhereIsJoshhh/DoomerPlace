import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { AssignRolesDto } from '../dtos/assign-roles.dto';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar todos los roles con sus permisos asociados
   */
  async findAllRoles() {
    return this.prisma.rol.findMany({
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Buscar un rol por ID
   */
  async findRoleById(id: string) {
    const role = await this.prisma.rol.findUnique({
      where: { id },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado.');
    }

    return role;
  }

  /**
   * Crear un nuevo rol con permisos opcionales
   */
  async createRole(dto: CreateRoleDto) {
    const slugUpper = dto.slug.toUpperCase().trim();
    const existing = await this.prisma.rol.findUnique({
      where: { slug: slugUpper },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un rol con el slug: ${slugUpper}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const newRole = await tx.rol.create({
        data: {
          nombre: dto.nombre.trim(),
          slug: slugUpper,
          descripcion: dto.descripcion?.trim(),
          esSistema: false,
          estado: true,
        },
      });

      if (dto.permisoIds && dto.permisoIds.length > 0) {
        await tx.rolPermiso.createMany({
          data: dto.permisoIds.map((permisoId) => ({
            rolId: newRole.id,
            permisoId,
          })),
        });
      }

      return tx.rol.findUnique({
        where: { id: newRole.id },
        include: {
          permisos: {
            include: {
              permiso: true,
            },
          },
        },
      });
    });
  }

  /**
   * Asignar o sincronizar roles de un usuario
   */
  async assignRolesToUser(usuarioId: string, dto: AssignRolesDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    // Validar que los roles existan
    const roles = await this.prisma.rol.findMany({
      where: {
        slug: { in: dto.roleSlugs },
      },
    });

    if (roles.length !== dto.roleSlugs.length) {
      throw new NotFoundException('Uno o más roles especificados no existen en el sistema.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Eliminar asignaciones actuales
      await tx.usuarioRol.deleteMany({
        where: { usuarioId },
      });

      // Crear nuevas asignaciones N:M
      await tx.usuarioRol.createMany({
        data: roles.map((r) => ({
          usuarioId,
          rolId: r.id,
        })),
      });

      return tx.usuario.findUnique({
        where: { id: usuarioId },
        include: {
          roles: {
            include: {
              rol: true,
            },
          },
        },
      });
    });
  }

  /**
   * Listar todos los permisos del catálogo
   */
  async findAllPermissions() {
    return this.prisma.permiso.findMany({
      orderBy: [{ modulo: 'asc' }, { accion: 'asc' }],
    });
  }

  /**
   * Sincronizar permisos de un rol
   */
  async syncRolePermissions(rolId: string, permisoIds: string[]) {
    await this.findRoleById(rolId);

    return this.prisma.$transaction(async (tx) => {
      await tx.rolPermiso.deleteMany({
        where: { rolId },
      });

      if (permisoIds.length > 0) {
        await tx.rolPermiso.createMany({
          data: permisoIds.map((permisoId) => ({
            rolId,
            permisoId,
          })),
        });
      }

      return tx.rol.findUnique({
        where: { id: rolId },
        include: {
          permisos: {
            include: {
              permiso: true,
            },
          },
        },
      });
    });
  }
}
