import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionsService } from '../application/services/promotions.service';
import { CreateCouponDto, ValidateCouponDto } from '../application/dtos/create-coupon.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Roles } from '@core/decorators/roles.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Promociones, Cupones y Descuentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('coupons')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Crear nuevo cupón de descuento (Admin o Vendedor)' })
  @ApiResponse({ status: 201, description: 'Cupón creado correctamente.' })
  async create(@Body() dto: CreateCouponDto) {
    return this.promotionsService.createCoupon(dto);
  }

  @Post('coupons/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar cupón y simular descuento sobre carrito' })
  @ApiResponse({ status: 200, description: 'Resultado del cálculo del descuento.' })
  @ApiResponse({ status: 400, description: 'Cupón expirado, límite alcanzado o monto insuficiente.' })
  async validate(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.promotionsService.validateCoupon(usuarioId, dto);
  }
}
