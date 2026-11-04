import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from '../application/services/finance.service';
import { CreateBankAccountDto } from '../application/dtos/create-bank-account.dto';
import { RequestPayoutDto, FilterPayoutsDto } from '../application/dtos/request-payout.dto';
import { ProcessPayoutDto } from '../application/dtos/process-payout.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Roles } from '@core/decorators/roles.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Finanzas, Balances y Liquidaciones a Vendedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('balance')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Consultar balance financiero del vendedor autenticado' })
  @ApiResponse({ status: 200, description: 'Saldos pendiente, disponible y retirado.' })
  async getBalance(@CurrentUser('userId') usuarioId: string) {
    return this.financeService.getBalance(usuarioId);
  }

  @Get('bank-accounts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Listar cuentas bancarias registradas del vendedor' })
  async getBankAccounts(@CurrentUser('userId') usuarioId: string) {
    return this.financeService.getBankAccounts(usuarioId);
  }

  @Post('bank-accounts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Registrar nueva cuenta bancaria para desembolsos' })
  @ApiResponse({ status: 201, description: 'Cuenta bancaria registrada satisfactoriamente.' })
  async addBankAccount(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.financeService.addBankAccount(usuarioId, dto);
  }

  @Post('payouts/request')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Solicitar liquidación/retiro del saldo disponible' })
  @ApiResponse({ status: 201, description: 'Solicitud de liquidación generada en estado PENDIENTE.' })
  @ApiResponse({ status: 400, description: 'Saldo disponible insuficiente.' })
  async requestPayout(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: RequestPayoutDto,
  ) {
    return this.financeService.requestPayout(usuarioId, dto);
  }

  @Get('payouts/my-payouts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Historial de liquidaciones del vendedor autenticado' })
  async getMyPayouts(
    @CurrentUser('userId') usuarioId: string,
    @Query() filter: FilterPayoutsDto,
  ) {
    return this.financeService.getMyPayouts(usuarioId, filter);
  }

  @Patch('payouts/:id/process')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({
    summary: 'Procesar desembolso de liquidación (Aprobar pago bancario o Rechazar)',
    description: 'Endpoint exclusivo para Administradores de la plataforma.',
  })
  @ApiResponse({ status: 200, description: 'Liquidación procesada correctamente.' })
  async processPayout(
    @Param('id') liquidacionId: string,
    @CurrentUser('userId') adminUserId: string,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.financeService.processPayout(liquidacionId, adminUserId, dto);
  }
}
