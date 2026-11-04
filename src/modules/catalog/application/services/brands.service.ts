import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateBrandDto } from '../dtos/create-brand.dto';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.marca.findMany({
      where: { estado: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async findById(id: string) {
    const brand = await this.prisma.marca.findUnique({
      where: { id },
    });
    if (!brand) {
      throw new NotFoundException('Marca no encontrada.');
    }
    return brand;
  }

  async create(dto: CreateBrandDto) {
    const slug = (dto.slug || dto.nombre)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await this.prisma.marca.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException(`Ya existe una marca con el slug: ${slug}`);
    }

    return this.prisma.marca.create({
      data: {
        nombre: dto.nombre.trim(),
        slug,
        descripcion: dto.descripcion?.trim(),
        logoUrl: dto.logoUrl?.trim(),
        sitioWeb: dto.sitioWeb?.trim(),
        estado: dto.estado ?? true,
      },
    });
  }
}
