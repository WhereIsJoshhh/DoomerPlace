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
import { CategoriesService } from '../application/services/categories.service';
import { CreateCategoryDto } from '../application/dtos/create-category.dto';
import { Public } from '@core/decorators/public.decorator';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso } from '@prisma/client';

@ApiTags('Catálogo - Categorías')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get('tree')
  @ApiOperation({ summary: 'Obtener árbol jerárquico completo de categorías (N niveles)' })
  @ApiResponse({ status: 200, description: 'Árbol de categorías anidadas para menú de navegación.' })
  async getTree() {
    return this.categoriesService.getTree();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar todas las categorías planas' })
  @ApiResponse({ status: 200, description: 'Lista plana de categorías con categoría padre asociada.' })
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Consultar categoría por ID con sus atributos configurados' })
  @ApiResponse({ status: 200, description: 'Detalle de categoría y atributos específicos.' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(RbacGuard)
  @Post()
  @RequirePermissions({ modulo: 'CATALOGO', accion: AccionPermiso.CREAR })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva categoría en el árbol' })
  @ApiResponse({ status: 201, description: 'Categoría creada con nivel calculado.' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }
}
