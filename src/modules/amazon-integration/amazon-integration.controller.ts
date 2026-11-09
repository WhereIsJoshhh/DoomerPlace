import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@core/decorators/roles.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { ImportAmazonAsinsDto, SearchAmazonDto } from './amazon.dto';
import { AmazonIntegrationService } from './amazon-integration.service';

@ApiTags('Integración Amazon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RbacGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
@Controller('integrations/amazon')
export class AmazonIntegrationController {
  constructor(private readonly service: AmazonIntegrationService) {}

  @Post('import-asin')
  @ApiOperation({ summary: 'Importar uno o varios productos Amazon por ASIN (máximo 10)' })
  importAsins(@Body() dto: ImportAmazonAsinsDto) {
    const asins = [...(dto.asins || []), ...(dto.asin ? [dto.asin] : [])];
    if (!asins.length) throw new BadRequestException('Envía asin o asins con al menos un ASIN.');
    if (asins.length > 10) throw new BadRequestException('Se permiten hasta 10 ASINs por solicitud.');
    return this.service.importAsins(asins);
  }

  @Post('search')
  @ApiOperation({ summary: 'Buscar productos en Amazon por palabra clave' })
  search(@Body() dto: SearchAmazonDto) { return this.service.search(dto.keywords); }

  @Post('sync-price-stock')
  @ApiOperation({ summary: 'Sincronizar precio y disponibilidad externa de productos Amazon importados' })
  sync() { return this.service.syncPriceStock(); }
}
