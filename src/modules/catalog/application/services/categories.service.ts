import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateCategoryDto } from '../dtos/create-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener árbol jerárquico completo de categorías
   */
  async getTree() {
    // Obtenemos todas las categorías activas
    const categories = await this.prisma.categoria.findMany({
      where: { estado: true },
      orderBy: [{ nivel: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
    });

    // Construcción en memoria de la jerarquía tipo árbol (N niveles)
    const categoryMap = new Map<string, any>();
    const roots: any[] = [];

    for (const cat of categories) {
      categoryMap.set(cat.id, { ...cat, subcategorias: [] });
    }

    for (const cat of categories) {
      const node = categoryMap.get(cat.id);
      if (cat.categoriaPadreId && categoryMap.has(cat.categoriaPadreId)) {
        categoryMap.get(cat.categoriaPadreId).subcategorias.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Listar todas las categorías planas
   */
  async findAll() {
    return this.prisma.categoria.findMany({
      orderBy: [{ nivel: 'asc' }, { orden: 'asc' }],
      include: {
        categoriaPadre: {
          select: { id: true, nombre: true, slug: true },
        },
      },
    });
  }

  /**
   * Crear nueva categoría calculando automáticamente su nivel en el árbol
   */
  async create(dto: CreateCategoryDto) {
    const slug = (dto.slug || dto.nombre)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await this.prisma.categoria.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una categoría con el slug: ${slug}`);
    }

    let nivel = 1;
    if (dto.categoriaPadreId) {
      const parent = await this.prisma.categoria.findUnique({
        where: { id: dto.categoriaPadreId },
      });
      if (!parent) {
        throw new NotFoundException('La categoría padre especificada no existe.');
      }
      nivel = parent.nivel + 1;
    }

    return this.prisma.categoria.create({
      data: {
        nombre: dto.nombre.trim(),
        slug,
        categoriaPadreId: dto.categoriaPadreId,
        descripcion: dto.descripcion?.trim(),
        imagenUrl: dto.imagenUrl?.trim(),
        icono: dto.icono?.trim(),
        nivel,
        orden: dto.orden ?? 0,
        estado: dto.estado ?? true,
      },
    });
  }

  /**
   * Buscar categoría por ID
   */
  async findById(id: string) {
    const category = await this.prisma.categoria.findUnique({
      where: { id },
      include: {
        subcategorias: true,
        atributos: {
          include: {
            valores: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    return category;
  }
}
