import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { UpdateStoreDto } from '../dtos/update-store.dto';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener perfil público de una tienda por su slug (/stores/:slug)
   */
  async findBySlug(slug: string) {
    const tienda = await this.prisma.tienda.findUnique({
      where: { slug },
      include: {
        vendedor: {
          select: {
            nombreComercial: true,
            calificacionPromedio: true,
            estado: true,
          },
        },
        _count: {
          select: {
            productos: true,
            resenas: true,
          },
        },
      },
    });

    if (!tienda || !tienda.estado) {
      throw new NotFoundException('La tienda solicitada no existe o se encuentra inactiva.');
    }

    return tienda;
  }

  /**
   * Obtener tienda por ID
   */
  async findById(id: string) {
    const tienda = await this.prisma.tienda.findUnique({
      where: { id },
      include: {
        vendedor: true,
      },
    });

    if (!tienda) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    return tienda;
  }

  /**
   * Actualizar configuración de la tienda por parte del vendedor propietario
   */
  async updateStore(tiendaId: string, vendedorUsuarioId: string, dto: UpdateStoreDto) {
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId },
      include: { vendedor: true },
    });

    if (!tienda) {
      throw new NotFoundException('Tienda no encontrada.');
    }

    if (tienda.vendedor.usuarioId !== vendedorUsuarioId) {
      throw new ForbiddenException('No posee permisos para administrar esta tienda.');
    }

    return this.prisma.tienda.update({
      where: { id: tiendaId },
      data: {
        ...dto,
      },
    });
  }

  /**
   * Listado público de tiendas activas
   */
  async findAllStores(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.tienda.count({
        where: { estado: true, vendedor: { estado: 'APROBADO' } },
      }),
      this.prisma.tienda.findMany({
        where: { estado: true, vendedor: { estado: 'APROBADO' } },
        skip,
        take: limit,
        orderBy: { fechaCreacion: 'desc' },
        include: {
          vendedor: {
            select: {
              calificacionPromedio: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
