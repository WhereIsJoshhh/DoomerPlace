import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from '../application/services/payments.service';
import { InitiatePaymentDto } from '../application/dtos/initiate-payment.dto';
import { WebhookPaymentPayloadDto } from '../application/dtos/webhook-payload.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Public } from '@core/decorators/public.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Pagos y Pasarelas')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('methods')
  @Public()
  @ApiOperation({ summary: 'Listar métodos de pago disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de métodos de pago activos.' })
  async getMethods() {
    return this.paymentsService.getPaymentMethods();
  }

  @Post('initiate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({
    summary: 'Iniciar pago para un pedido existente',
    description: 'Genera intención de pago y retorna clientSecret para checkout en pasarela.',
  })
  @ApiResponse({ status: 201, description: 'Intención de pago generada correctamente.' })
  @ApiResponse({ status: 400, description: 'El pedido no se encuentra pendiente o ya fue pagado.' })
  async initiate(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(usuarioId, dto);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook receptor de pasarelas de pago externas con IDEMPOTENCIA',
    description:
      'Endpoint idempotente que procesa eventos asíncronos de aprobación o rechazo de pago.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Clave de idempotencia del webhook.',
  })
  @ApiResponse({ status: 200, description: 'Webhook recibido y procesado idempotentemente.' })
  async webhook(
    @Body() payload: WebhookPaymentPayloadDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.processWebhook(payload, idempotencyKey);
  }

  @Get('order/:pedidoId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({ summary: 'Consultar estado de pagos de un pedido' })
  @ApiResponse({ status: 200, description: 'Historial de pagos del pedido.' })
  async getByOrder(@Param('pedidoId') pedidoId: string) {
    return this.paymentsService.getPaymentByOrderId(pedidoId);
  }
}
