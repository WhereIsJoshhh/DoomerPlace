import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from '../application/services/returns.service';
import { CreateReturnDto } from '../application/dtos/create-return.dto';
import { ReviewReturnDto } from '../application/dtos/review-return.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Roles } from '@core/decorators/roles.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Devoluciones, Garantías y Reembolsos (RMA)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Solicitar devolución de productos sobre un pedido entregado' })
  @ApiResponse({ status: 201, description: 'Solicitud RMA registrada en estado SOLICITADA.' })
  async requestReturn(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.requestReturn(usuarioId, dto);
  }

  @Get('my-returns')
  @ApiOperation({ summary: 'Consultar solicitudes de devolución del usuario autenticado' })
  async getMyReturns(@CurrentUser('userId') usuarioId: string) {
    return this.returnsService.getMyReturns(usuarioId);
  }

  @Patch(':id/review')
  @Roles('SUPER_ADMIN', 'ADMIN', 'VENDEDOR')
  @ApiOperation({ summary: 'Dictamen de devolución (Aprobación, Inspección de Calidad y Reembolso)' })
  @ApiResponse({ status: 200, description: 'Devolución resuelta.' })
  async reviewReturn(
    @Param('id') devolucionId: string,
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('roles') roles: string[],
    @Body() dto: ReviewReturnDto,
  ) {
    const esAdmin = roles?.includes('SUPER_ADMIN') || roles?.includes('ADMIN');
    return this.returnsService.reviewReturn(devolucionId, usuarioId, dto, esAdmin);
  }
}
