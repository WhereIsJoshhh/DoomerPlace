import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttributesService } from '../application/services/attributes.service';
import { CreateAttributeDto, CreateAttributeValueDto } from '../application/dtos/create-attribute.dto';
import { Public } from '@core/decorators/public.decorator';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso } from '@prisma/client';

@ApiTags('Catálogo - Atributos Dinámicos')
@Controller('attributes')
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Consultar catálogo de atributos dinámicos (opcional por categoría)' })
  @ApiResponse({ status: 200, description: 'Lista de atributos con sus valores predefinidos.' })
  async findByCategory(@Query('categoriaId') categoriaId?: string) {
    return this.attributesService.findByCategory(categoriaId);
  }

  @ApiBearerAuth()
  @UseGuards(RbacGuard)
  @Post()
  @RequirePermissions({ modulo: 'CATALOGO', accion: AccionPermiso.CREAR })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Definir nuevo atributo de catálogo (ej. Color, Talla, Memoria)' })
  @ApiResponse({ status: 201, description: 'Atributo y valores iniciales registrados.' })
  async create(@Body() dto: CreateAttributeDto) {
    return this.attributesService.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RbacGuard)
  @Post(':id/values')
  @RequirePermissions({ modulo: 'CATALOGO', accion: AccionPermiso.CREAR })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar un valor a un atributo existente' })
  @ApiResponse({ status: 201, description: 'Valor de atributo registrado.' })
  async addValue(
    @Param('id') attributeId: string,
    @Body() dto: CreateAttributeValueDto,
  ) {
    return this.attributesService.addValue(attributeId, dto);
  }
}
