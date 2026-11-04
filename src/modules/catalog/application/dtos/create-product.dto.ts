import { ApiProperty } from '@nestjs/swagger';
import { TipoProducto } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductImageDto {
  @ApiProperty({ example: 'https://cdn.marketplace.com/products/img1.jpg' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: 'Vista frontal del producto', required: false })
  @IsOptional()
  @IsString()
  altText?: string;

  @ApiProperty({ example: 0, required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  orden?: number;

  @ApiProperty({ example: true, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;
}

export class ProductVariantAttributeDto {
  @ApiProperty({ example: 'attr-uuid-color', description: 'ID del atributo (ej. Color)' })
  @IsString()
  @IsNotEmpty()
  atributoId: string;

  @ApiProperty({ example: 'val-uuid-rojo', description: 'ID del valor de atributo (ej. Rojo)' })
  @IsString()
  @IsNotEmpty()
  valorAtributoId: string;
}

export class CreateProductVariantDto {
  @ApiProperty({ example: 'CAMISETA-ROJO-XL', description: 'SKU vendible único de la variante' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Rojo / XL', description: 'Nombre descriptivo de la variante' })
  @IsString()
  @IsNotEmpty()
  nombreVariante: string;

  @ApiProperty({ example: 29.99, description: 'Precio de venta al público' })
  @IsNumber()
  @Min(0)
  precio: number;

  @ApiProperty({ example: 39.99, required: false, description: 'Precio tachado o de comparación' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioComparacion?: number;

  @ApiProperty({ example: 15.00, required: false, description: 'Costo interno para cálculo de margen' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @ApiProperty({ example: 0.25, required: false, description: 'Peso en Kg específico de esta variante' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number;

  @ApiProperty({ example: '7751234567890', required: false })
  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @ApiProperty({ example: 50, required: false, default: 0, description: 'Stock físico inicial a ingresar' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockInicial?: number;

  @ApiProperty({
    type: [ProductVariantAttributeDto],
    description: 'Mapeo de combinaciones únicas de atributos que definen la variante (VarianteAtributo)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantAttributeDto)
  atributos: ProductVariantAttributeDto[];
}

export class ProductDescriptiveAttributeDto {
  @ApiProperty({ example: 'attr-uuid-material' })
  @IsString()
  @IsNotEmpty()
  atributoId: string;

  @ApiProperty({ example: 'val-uuid-algodon', required: false })
  @IsOptional()
  @IsString()
  valorAtributoId?: string;

  @ApiProperty({ example: '100% Algodón Pima Peruano', required: false })
  @IsOptional()
  @IsString()
  valorTextoPersonalizado?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Camiseta Básica de Algodón', description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'camiseta-basica-algodon', required: false, description: 'Slug único URL' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'cat-uuid-ropa', description: 'Categoría a la que pertenece' })
  @IsString()
  @IsNotEmpty()
  categoriaId: string;

  @ApiProperty({ example: 'brand-uuid-nike', required: false, description: 'Marca del producto' })
  @IsOptional()
  @IsString()
  marcaId?: string;

  @ApiProperty({ example: 'Camiseta de alta calidad 100% algodón', required: false })
  @IsOptional()
  @IsString()
  descripcionCorta?: string;

  @ApiProperty({ example: 'Detalle extendido de especificaciones, cuidados y garantía.', required: false })
  @IsOptional()
  @IsString()
  descripcionLarga?: string;

  @ApiProperty({ example: 'CAMISETA-BASICA', description: 'SKU base o raíz del producto' })
  @IsString()
  @IsNotEmpty()
  skuBase: string;

  @ApiProperty({ enum: TipoProducto, example: TipoProducto.VARIABLE, description: 'SIMPLE o VARIABLE' })
  @IsEnum(TipoProducto)
  @IsNotEmpty()
  tipoProducto: TipoProducto;

  @ApiProperty({ example: 0.25, required: false, default: 0.0, description: 'Peso estándar en Kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number;

  @ApiProperty({ example: 20.0, required: false, default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ancho?: number;

  @ApiProperty({ example: 2.0, required: false, default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  alto?: number;

  @ApiProperty({ example: 30.0, required: false, default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  largo?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  requiereEnvio?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  esDestacado?: boolean;

  // Para producto SIMPLE
  @ApiProperty({ example: 25.00, required: false, description: 'Obligatorio si tipoProducto es SIMPLE' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioSimple?: number;

  @ApiProperty({ example: 30.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioComparacionSimple?: number;

  @ApiProperty({ example: 100, required: false, default: 0, description: 'Stock inicial para producto SIMPLE' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockInicialSimple?: number;

  // Para producto VARIABLE
  @ApiProperty({
    type: [CreateProductVariantDto],
    required: false,
    description: 'Obligatorio si tipoProducto es VARIABLE',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variantes?: CreateProductVariantDto[];

  @ApiProperty({ type: [ProductImageDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  imagenes?: ProductImageDto[];

  @ApiProperty({ type: [ProductDescriptiveAttributeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDescriptiveAttributeDto)
  atributosDescriptivos?: ProductDescriptiveAttributeDto[];
}
