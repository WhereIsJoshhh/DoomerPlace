import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateAddressDto } from '../dtos/create-address.dto';
import { UpdateAddressDto } from '../dtos/update-address.dto';

@Injectable()
export class AddressesService {
  private readonly logger = new Logger(AddressesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener todas las direcciones del usuario
   */
  async findByUser(usuarioId: string) {
    return this.prisma.direccion.findMany({
      where: { usuarioId },
      orderBy: [{ esPrincipal: 'desc' }, { fechaRegistro: 'desc' }],
    });
  }

  /**
   * Obtener una dirección por ID verificando propiedad
   */
  async findOne(id: string, usuarioId: string) {
    const address = await this.prisma.direccion.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException('Dirección no encontrada.');
    }

    if (address.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para acceder a esta dirección.');
    }

    return address;
  }

  /**
   * Crear nueva dirección con regla de negocio para dirección principal única por tipo
   */
  async create(usuarioId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      // Si se marca como principal, desmarcar las existentes del mismo tipo
      if (dto.esPrincipal) {
        await tx.direccion.updateMany({
          where: {
            usuarioId,
            tipo: dto.tipo,
            esPrincipal: true,
          },
          data: {
            esPrincipal: false,
          },
        });
      } else {
        // Si es la primera dirección de este tipo, hacerla principal automáticamente
        const count = await tx.direccion.count({
          where: { usuarioId, tipo: dto.tipo },
        });
        if (count === 0) {
          dto.esPrincipal = true;
        }
      }

      return tx.direccion.create({
        data: {
          usuarioId,
          tipo: dto.tipo,
          alias: dto.alias?.trim(),
          receptor: dto.receptor.trim(),
          telefono: dto.telefono.trim(),
          pais: dto.pais.trim(),
          departamento: dto.departamento.trim(),
          ciudad: dto.ciudad.trim(),
          colonia: dto.colonia?.trim(),
          calle: dto.calle.trim(),
          referencia: dto.referencia?.trim(),
          codigoPostal: dto.codigoPostal.trim(),
          latitud: dto.latitud,
          longitud: dto.longitud,
          esPrincipal: dto.esPrincipal ?? false,
        },
      });
    });
  }

  /**
   * Actualizar dirección existente
   */
  async update(id: string, usuarioId: string, dto: UpdateAddressDto) {
    await this.findOne(id, usuarioId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.esPrincipal && dto.tipo) {
        await tx.direccion.updateMany({
          where: {
            usuarioId,
            tipo: dto.tipo,
            esPrincipal: true,
            id: { not: id },
          },
          data: {
            esPrincipal: false,
          },
        });
      }

      return tx.direccion.update({
        where: { id },
        data: {
          ...dto,
        },
      });
    });
  }

  /**
   * Eliminar dirección
   */
  async remove(id: string, usuarioId: string) {
    const address = await this.findOne(id, usuarioId);

    await this.prisma.direccion.delete({
      where: { id },
    });

    // Si era la principal, promover la más reciente del mismo tipo
    if (address.esPrincipal) {
      const nextCandidate = await this.prisma.direccion.findFirst({
        where: { usuarioId, tipo: address.tipo },
        orderBy: { fechaRegistro: 'desc' },
      });

      if (nextCandidate) {
        await this.prisma.direccion.update({
          where: { id: nextCandidate.id },
          data: { esPrincipal: true },
        });
      }
    }

    return { message: 'Dirección eliminada correctamente' };
  }
}
