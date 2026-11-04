import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateBankAccountDto } from '../dtos/create-bank-account.dto';
import { RequestPayoutDto, FilterPayoutsDto } from '../dtos/request-payout.dto';
import { ProcessPayoutDto } from '../dtos/process-payout.dto';
import { EstadoLiquidacion, EstadoSubPedido, Prisma } from '@prisma/client';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener el registro de vendedor asociado a un usuario
   */
  private async getVendorByUserId(usuarioId: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { usuarioId },
      include: { balance: true },
    });
    if (!vendedor) {
      throw new NotFoundException('No se encontró el perfil de vendedor asociado a este usuario.');
    }
    return vendedor;
  }

  /**
   * Registrar o actualizar cuenta bancaria del vendedor
   */
  async addBankAccount(usuarioId: string, dto: CreateBankAccountDto) {
    const vendedor = await this.getVendorByUserId(usuarioId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.esPrincipal) {
        await tx.cuentaBancariaVendedor.updateMany({
          where: { vendedorId: vendedor.id },
          data: { esPrincipal: false },
        });
      }

      return tx.cuentaBancariaVendedor.create({
        data: {
          vendedorId: vendedor.id,
          banco: dto.banco,
          tipoCuenta: dto.tipoCuenta,
          numeroCuenta: dto.numeroCuenta,
          titularCuenta: dto.titularCuenta,
          identificacionTitular: dto.identificacionTitular,
          esPrincipal: dto.esPrincipal ?? false,
        },
      });
    });
  }

  /**
   * Listar cuentas bancarias de un vendedor
   */
  async getBankAccounts(usuarioId: string) {
    const vendedor = await this.getVendorByUserId(usuarioId);
    return this.prisma.cuentaBancariaVendedor.findMany({
      where: { vendedorId: vendedor.id, estado: true },
      orderBy: { esPrincipal: 'desc' },
    });
  }

  /**
   * Consultar balance financiero del vendedor (saldo pendiente, disponible y retirado)
   */
  async getBalance(usuarioId: string) {
    const vendedor = await this.getVendorByUserId(usuarioId);
    let balance = await this.prisma.balanceVendedor.findUnique({
      where: { vendedorId: vendedor.id },
    });

    if (!balance) {
      balance = await this.prisma.balanceVendedor.create({
        data: { vendedorId: vendedor.id },
      });
    }

    return balance;
  }

  /**
   * Transicionar saldo pendiente a saldo disponible al completarse el período de entrega / garantía
   */
  async transferPendingToAvailable(subPedidoId: string) {
    const subPedido = await this.prisma.subPedido.findUnique({
      where: { id: subPedidoId },
      include: { tienda: true },
    });

    if (!subPedido) throw new NotFoundException('SubPedido no encontrado.');

    const vendedorId = subPedido.tienda.vendedorId;
    const balance = await this.prisma.balanceVendedor.findUnique({
      where: { vendedorId },
    });

    if (!balance) throw new NotFoundException('Balance de vendedor no encontrado.');

    const monto = subPedido.montoNetoTienda;

    return this.prisma.balanceVendedor.update({
      where: { vendedorId },
      data: {
        saldoPendiente: { decrement: monto },
        saldoDisponible: { increment: monto },
      },
    });
  }

  /**
   * Solicitar liquidación / payout de saldo disponible
   */
  async requestPayout(usuarioId: string, dto: RequestPayoutDto) {
    const vendedor = await this.getVendorByUserId(usuarioId);
    const balance = await this.getBalance(usuarioId);

    const saldoDisponible = Number(balance.saldoDisponible);
    if (saldoDisponible <= 0) {
      throw new BadRequestException('El vendedor no tiene saldo disponible suficiente para liquidar.');
    }

    // Validar cuenta bancaria
    const cuenta = await this.prisma.cuentaBancariaVendedor.findFirst({
      where: { id: dto.cuentaBancariaId, vendedorId: vendedor.id, estado: true },
    });
    if (!cuenta) {
      throw new NotFoundException('Cuenta bancaria no encontrada o no pertenece al vendedor.');
    }

    // Buscar subpedidos entregados de la tienda del vendedor aún no liquidados
    const subpedidosEntregados = await this.prisma.subPedido.findMany({
      where: {
        tienda: { vendedorId: vendedor.id },
        estado: EstadoSubPedido.ENTREGADO,
        liquidaciones: { none: {} },
      },
    });

    const numeroLiquidacion = `LIQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Deducir saldo disponible en balance
      await tx.balanceVendedor.update({
        where: { vendedorId: vendedor.id },
        data: {
          saldoDisponible: { decrement: balance.saldoDisponible },
        },
      });

      // 2. Crear LiquidacionVendedor
      const liquidacion = await tx.liquidacionVendedor.create({
        data: {
          vendedorId: vendedor.id,
          cuentaBancariaId: dto.cuentaBancariaId,
          numeroLiquidacion,
          periodoInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          periodoFin: new Date(),
          totalVentasBrutas: new Prisma.Decimal(saldoDisponible),
          totalComisionesDescontadas: new Prisma.Decimal(0),
          totalEnviosReembolsados: new Prisma.Decimal(0),
          totalRetencionesFiscales: new Prisma.Decimal(0),
          montoNetoPagar: balance.saldoDisponible,
          estado: EstadoLiquidacion.PENDIENTE,
        },
      });

      // 3. Vincular subpedidos a la liquidación
      for (const sp of subpedidosEntregados) {
        await tx.detalleLiquidacionSubPedido.create({
          data: {
            liquidacionId: liquidacion.id,
            subPedidoId: sp.id,
            montoLiberado: sp.montoNetoTienda,
          },
        });
      }

      return liquidacion;
    });
  }

  /**
   * Procesar liquidación por Administrador (Aprobar pago bancario o rechazar con devolución de saldo)
   */
  async processPayout(liquidacionId: string, adminUserId: string, dto: ProcessPayoutDto) {
    const liquidacion = await this.prisma.liquidacionVendedor.findUnique({
      where: { id: liquidacionId },
      include: { vendedor: true },
    });

    if (!liquidacion) throw new NotFoundException('Liquidación no encontrada.');

    if (
      liquidacion.estado === EstadoLiquidacion.PAGADA ||
      liquidacion.estado === EstadoLiquidacion.RECHAZADA
    ) {
      throw new BadRequestException(
        `La liquidación ya se encuentra en estado final: "${liquidacion.estado}".`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.estado === EstadoLiquidacion.PAGADA) {
        // Incrementar saldo retirado en balance
        await tx.balanceVendedor.update({
          where: { vendedorId: liquidacion.vendedorId },
          data: {
            saldoRetirado: { increment: liquidacion.montoNetoPagar },
          },
        });

        return tx.liquidacionVendedor.update({
          where: { id: liquidacionId },
          data: {
            estado: EstadoLiquidacion.PAGADA,
            referenciaBancaria: dto.referenciaBancaria,
            comprobanteUrl: dto.comprobanteUrl,
            fechaPago: new Date(),
            procesadoPorUsuarioId: adminUserId,
          },
        });
      } else {
        // En caso de rechazo, revertir el dinero a saldo disponible
        await tx.balanceVendedor.update({
          where: { vendedorId: liquidacion.vendedorId },
          data: {
            saldoDisponible: { increment: liquidacion.montoNetoPagar },
          },
        });

        return tx.liquidacionVendedor.update({
          where: { id: liquidacionId },
          data: {
            estado: EstadoLiquidacion.RECHAZADA,
            procesadoPorUsuarioId: adminUserId,
          },
        });
      }
    });
  }

  /**
   * Listar liquidaciones del vendedor autenticado
   */
  async getMyPayouts(usuarioId: string, filter: FilterPayoutsDto) {
    const vendedor = await this.getVendorByUserId(usuarioId);
    const { page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.liquidacionVendedor.count({ where: { vendedorId: vendedor.id } }),
      this.prisma.liquidacionVendedor.findMany({
        where: { vendedorId: vendedor.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { cuentaBancaria: true, detalles: true },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
