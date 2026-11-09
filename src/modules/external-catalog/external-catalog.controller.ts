import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@core/decorators/roles.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { BatchImportExternalProductsDto, ImportExternalProductDto, SyncExternalProductsDto } from './external-catalog.dto';
import { ExternalCatalogService } from './external-catalog.service';

@ApiTags('Integraciones de Catálogo Externo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('integrations')
export class ExternalCatalogController {
  constructor(private readonly service: ExternalCatalogService) {}

  @Post('import')
  @ApiOperation({ summary: 'Importar un producto desde Amazon o Mercari' })
  import(@Body() dto: ImportExternalProductDto) { return this.service.importProduct(dto.provider, dto.externalId, dto.tiendaDestinoId); }

  @Post('batch-import')
  @ApiOperation({ summary: 'Importar hasta 50 productos de un proveedor' })
  batchImport(@Body() dto: BatchImportExternalProductsDto) { return this.service.batchImport(dto.provider, dto.items, dto.tiendaDestinoId); }

  @Post('sync')
  @ApiOperation({ summary: 'Sincronizar precio y disponibilidad de productos externos' })
  sync(@Body() dto: SyncExternalProductsDto) { return this.service.sync(dto.provider, dto.externalIds); }

  @Get('providers/status')
  @ApiOperation({ summary: 'Consultar configuración y límites locales de los conectores' })
  providersStatus() { return this.service.providersStatus(); }
}
