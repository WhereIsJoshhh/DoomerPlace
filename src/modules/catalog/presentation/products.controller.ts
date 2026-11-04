import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from '../application/services/products.service';
import { CreateProductDto } from '../application/dtos/create-product.dto';
import { UpdateProductDto } from '../application/dtos/update-product.dto';
import { CatalogFilterDto } from '../application/dtos/catalog-filter.dto';
import { Public } from '@core/decorators/public.decorator';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RequirePermissions } from '@core/decorators/permissions.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';
import { AccionPermiso } from '@prisma/client';

@ApiTags('Catálogo - Productos')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Búsqueda facetada en el catálogo de productos' })
  @ApiResponse({ status: 200, description: 'Listado de productos con paginación, filtros de precio, categorías y marcas.' })
  async findAll(@Query() query: CatalogFilterDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Obtener detalle completo de un producto por su slug' })
  @ApiResponse({ status: 200, description: 'Ficha técnica, galería de imágenes, variantes dinámicas (VarianteAtributo), inventario y tienda.' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado.' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @ApiBearerAuth()
  @UseGuards(RbacGuard)
  @Post()
  @RequirePermissions({ modulo: 'CATALOGO', accion: AccionPermiso.CREAR })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un producto (Simple o Variable con Variantes Dinámicas)' })
  @ApiResponse({ status: 201, description: 'Producto creado y variantes asociadas con inventario inicial.' })
  @ApiResponse({ status: 403, description: 'El usuario no es un vendedor aprobado.' })
  async create(
    @CurrentUser('userId') vendorUserId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.createProduct(vendorUserId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RbacGuard)
  @Put(':id')
  @RequirePermissions({ modulo: 'CATALOGO', accion: AccionPermiso.ACTUALIZAR })
  @ApiOperation({ summary: 'Actualizar un producto existente' })
  @ApiResponse({ status: 200, description: 'Producto actualizado.' })
  @ApiResponse({ status: 403, description: 'El usuario no es propietario del producto.' })
  async update(
    @Param('id') id: string,
    @CurrentUser('userId') vendorUserId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, vendorUserId, dto);
  }
}
