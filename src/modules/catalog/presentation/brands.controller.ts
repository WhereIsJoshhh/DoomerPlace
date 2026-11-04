import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BrandsService } from '../application/services/brands.service';
import { CreateBrandDto } from '../application/dtos/create-brand.dto';
import { Public } from '@core/decorators/public.decorator';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso } from '@prisma/client';

@ApiTags('Catálogo - Marcas')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar marcas activas de productos' })
  @ApiResponse({ status: 200, description: 'Catálogo de marcas.' })
  async findAll() {
    return this.brandsService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Consultar marca por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la marca.' })
  async findById(@Param('id') id: string) {
    return this.brandsService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(RbacGuard)
  @Post()
  @RequirePermissions({ modulo: 'CATALOGO', accion: AccionPermiso.CREAR })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva marca' })
  @ApiResponse({ status: 201, description: 'Marca registrada exitosamente.' })
  async create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }
}
