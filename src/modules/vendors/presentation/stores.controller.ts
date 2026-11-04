import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from '../application/services/stores.service';
import { UpdateStoreDto } from '../application/dtos/update-store.dto';
import { Public } from '@core/decorators/public.decorator';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Tiendas')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar tiendas activas del marketplace' })
  @ApiResponse({ status: 200, description: 'Catálogo de tiendas públicas con calificaciones promedio.' })
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.storesService.findAllStores(parseInt(page, 10), parseInt(limit, 10));
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Consultar perfil público de una tienda por su slug' })
  @ApiResponse({ status: 200, description: 'Perfil, logotipo, banner, políticas y estadísticas de la tienda.' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada o inactiva.' })
  async findBySlug(@Param('slug') slug: string) {
    return this.storesService.findBySlug(slug);
  }

  @ApiBearerAuth()
  @UseGuards(RbacGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar información y políticas de la tienda' })
  @ApiResponse({ status: 200, description: 'Tienda actualizada por el vendedor propietario.' })
  @ApiResponse({ status: 403, description: 'El usuario no es propietario de esta tienda.' })
  async updateStore(
    @Param('id') storeId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.updateStore(storeId, userId, dto);
  }
}
