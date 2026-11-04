import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateAttributeDto, CreateAttributeValueDto } from '../dtos/create-attribute.dto';

@Injectable()
export class AttributesService {
  private readonly logger = new Logger(AttributesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listar atributos asociados a una categoría (o globales si categoriaId es nulo)
   */
  async findByCategory(categoriaId?: string) {
    const where: any = {};
    if (categoriaId) {
      where.OR = [{ categoriaId }, { categoriaId: null }];
    }

    return this.prisma.atributo.findMany({
      where,
      include: {
        valores: {
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Crear nuevo atributo con valores iniciales
   */
  async create(dto: CreateAttributeDto) {
    return this.prisma.$transaction(async (tx) => {
      const atributo = await tx.atributo.create({
        data: {
          categoriaId: dto.categoriaId,
          nombre: dto.nombre.trim(),
          tipoDato: dto.tipoDato || 'TEXTO',
          esObligatorio: dto.esObligatorio ?? false,
          esFiltrable: dto.esFiltrable ?? true,
          esVariante: dto.esVariante ?? true,
        },
      });

      if (dto.valores && dto.valores.length > 0) {
        await tx.valorAtributo.createMany({
          data: dto.valores.map((v, index) => ({
            atributoId: atributo.id,
            valor: v.valor.trim(),
            codigoHex: v.codigoHex?.trim(),
            orden: v.orden ?? index,
          })),
        });
      }

      return tx.atributo.findUnique({
        where: { id: atributo.id },
        include: {
          valores: {
            orderBy: { orden: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Agregar un valor a un atributo existente
   */
  async addValue(atributoId: string, dto: CreateAttributeValueDto) {
    const atributo = await this.prisma.atributo.findUnique({
      where: { id: atributoId },
    });

    if (!atributo) {
      throw new NotFoundException('Atributo no encontrado.');
    }

    return this.prisma.valorAtributo.create({
      data: {
        atributoId,
        valor: dto.valor.trim(),
        codigoHex: dto.codigoHex?.trim(),
        orden: dto.orden ?? 0,
      },
    });
  }
}
