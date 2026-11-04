import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from '../application/services/vendors.service';
import { VendorOnboardingDto, KycDocumentDto } from '../application/dtos/vendor-onboarding.dto';
import { ReviewKycDocumentDto } from '../application/dtos/review-kyc-document.dto';
import { ReviewVendorStatusDto } from '../application/dtos/review-vendor-status.dto';
import { FilterVendorsDto } from '../application/dtos/filter-vendors.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso } from '@prisma/client';

@ApiTags('Vendedores y Onboarding KYC')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post('onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Solicitar registro y Onboarding como Vendedor (KYC)' })
  @ApiResponse({ status: 201, description: 'Expediente de vendedor y tienda creados en estado PENDIENTE.' })
  @ApiResponse({ status: 409, description: 'Identificación fiscal o expediente ya existente.' })
  async applyForOnboarding(
    @CurrentUser('userId') userId: string,
    @Body() dto: VendorOnboardingDto,
  ) {
    return this.vendorsService.applyForOnboarding(userId, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Consultar estado del expediente KYC de vendedor del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Información del vendedor, tienda y documentos subidos.' })
  async getMyStatus(@CurrentUser('userId') userId: string) {
    return this.vendorsService.getMyVendorStatus(userId);
  }

  @Post(':id/documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subir documento adicional al expediente KYC' })
  @ApiResponse({ status: 201, description: 'Documento registrado para validación.' })
  async uploadKycDocument(
    @Param('id') vendorId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: KycDocumentDto,
  ) {
    return this.vendorsService.uploadKycDocument(vendorId, userId, dto);
  }

  @Patch('documents/:documentId/review')
  @RequirePermissions({ modulo: 'VENDEDORES', accion: AccionPermiso.APROBAR })
  @ApiOperation({ summary: 'Revisión administrativa de un documento KYC individual' })
  @ApiResponse({ status: 200, description: 'Estado del documento actualizado (APROBADO/RECHAZADO).' })
  async reviewDocument(
    @Param('documentId') documentId: string,
    @CurrentUser('userId') reviewerId: string,
    @Body() dto: ReviewKycDocumentDto,
  ) {
    return this.vendorsService.reviewKycDocument(documentId, reviewerId, dto);
  }

  @Patch(':id/review')
  @RequirePermissions({ modulo: 'VENDEDORES', accion: AccionPermiso.APROBAR })
  @ApiOperation({ summary: 'Aprobar, rechazar o suspender expediente de Vendedor' })
  @ApiResponse({ status: 200, description: 'Resolución de estado aplicada; si se aprueba, se asigna rol VENDEDOR y balance inicial.' })
  async reviewVendor(
    @Param('id') vendorId: string,
    @CurrentUser('userId') reviewerId: string,
    @Body() dto: ReviewVendorStatusDto,
  ) {
    return this.vendorsService.reviewVendorStatus(vendorId, reviewerId, dto);
  }

  @Get()
  @RequirePermissions({ modulo: 'VENDEDORES', accion: AccionPermiso.LEER })
  @ApiOperation({ summary: 'Listar expedientes de vendedores (Paginado y con filtros)' })
  @ApiResponse({ status: 200, description: 'Listado de vendedores para auditoría y gestión.' })
  async findAll(@Query() query: FilterVendorsDto) {
    return this.vendorsService.findAll(query);
  }
}
