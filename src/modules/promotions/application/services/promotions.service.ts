import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateCouponDto, ValidateCouponDto } from '../dtos/create-coupon.dto';
import { Prisma, TipoDescuento } from '@prisma/client';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear cupón de descuento
   */
  async createCoupon(dto: CreateCouponDto) {
    const existe = await this.prisma.cupon.findUnique({
      where: { codigo: dto.codigo.toUpperCase() },
    });
    if (existe) {
      throw new BadRequestException(`El cupón "${dto.codigo}" ya se encuentra registrado.`);
    }

    return this.prisma.cupon.create({
      data: {
        codigo: dto.codigo.toUpperCase(),
        tiendaId: dto.tiendaId,
        descripcion: dto.descripcion,
        tipoDescuento: dto.tipoDescuento,
        valorDescuento: new Prisma.Decimal(dto.valorDescuento),
        montoMinimoCompra: new Prisma.Decimal(dto.montoMinimoCompra ?? 0),
        limiteUsosTotal: dto.limiteUsosTotal,
        limiteUsosPorUsuario: dto.limiteUsosPorUsuario ?? 1,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        estado: true,
      },
    });
  }

  /**
   * Validar aplicabilidad de un cupón para un usuario y monto de carrito
   */
  async validateCoupon(usuarioId: string, dto: ValidateCouponDto) {
    const cupon = await this.prisma.cupon.findUnique({
      where: { codigo: dto.codigo.toUpperCase() },
    });

    if (!cupon || !cupon.estado) {
      throw new NotFoundException('Cupón no válido o inactivo.');
    }

    const ahora = new Date();
    if (ahora < cupon.fechaInicio || ahora > cupon.fechaFin) {
      throw new BadRequestException('El cupón se encuentra fuera de su período de vigencia.');
    }

    if (dto.montoCompra < Number(cupon.montoMinimoCompra)) {
      throw new BadRequestException(
        `El monto mínimo de compra para este cupón es de \$${cupon.montoMinimoCompra}.`,
      );
    }

    if (cupon.limiteUsosTotal && cupon.usosActuales >= cupon.limiteUsosTotal) {
      throw new BadRequestException('El cupón ha alcanzado el límite máximo de usos disponibles.');
    }

    // Validar trazabilidad de usos por usuario en CuponUso
    const usosUsuario = await this.prisma.cuponUso.count({
      where: { cuponId: cupon.id, usuarioId },
    });

    if (usosUsuario >= cupon.limiteUsosPorUsuario) {
      throw new BadRequestException(
        `Ha alcanzado el límite de usos permitidos para este cupón (${cupon.limiteUsosPorUsuario} por usuario).`,
      );
    }

    // Calcular descuento
    let descuentoCalculado = 0;
    if (cupon.tipoDescuento === TipoDescuento.PORCENTAJE) {
      descuentoCalculado = (dto.montoCompra * Number(cupon.valorDescuento)) / 100;
      if (cupon.descuentoMaximoPermitido) {
        descuentoCalculado = Math.min(descuentoCalculado, Number(cupon.descuentoMaximoPermitido));
      }
    } else {
      descuentoCalculado = Number(cupon.valorDescuento);
    }

    descuentoCalculado = Math.min(descuentoCalculado, dto.montoCompra);

    return {
      valido: true,
      cuponId: cupon.id,
      codigo: cupon.codigo,
      tipoDescuento: cupon.tipoDescuento,
      valorDescuento: Number(cupon.valorDescuento),
      descuentoCalculado: Number(descuentoCalculado.toFixed(2)),
      totalConDescuento: Number((dto.montoCompra - descuentoCalculado).toFixed(2)),
    };
  }

  /**
   * Registrar trazabilidad inmutable de uso de cupón en la orden
   */
  async recordCouponUsage(cuponId: string, usuarioId: string, pedidoId: string, descuento: number) {
    return this.prisma.$transaction(async (tx) => {
      const uso = await tx.cuponUso.create({
        data: {
          cuponId,
          usuarioId,
          pedidoId,
          descuentoAplicado: new Prisma.Decimal(descuento),
        },
      });

      await tx.cupon.update({
        where: { id: cuponId },
        data: { usosActuales: { increment: 1 } },
      });

      return uso;
    });
  }
}
