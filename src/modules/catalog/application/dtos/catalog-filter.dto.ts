import { ApiProperty } from '@nestjs/swagger';
import { EstadoProducto } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CatalogFilterDto {
  @ApiProperty({ required: false, description: 'Término de búsqueda libre por título, descripción o SKU' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filtrar por slug o ID de categoría' })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiProperty({ required: false, description: 'Filtrar por slug o ID de marca' })
  @IsOptional()
  @IsString()
  marcaId?: string;

  @ApiProperty({ required: false, description: 'Filtrar por ID de tienda' })
  @IsOptional()
  @IsString()
  tiendaId?: string;

  @ApiProperty({ required: false, description: 'Precio mínimo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioMin?: number;

  @ApiProperty({ required: false, description: 'Precio máximo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioMax?: number;

  @ApiProperty({ enum: EstadoProducto, required: false, default: EstadoProducto.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoProducto)
  estado?: EstadoProducto;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ required: false, description: 'Campo de ordenación: precio_asc, precio_desc, reciente, popular' })
  @IsOptional()
  @IsString()
  orden?: string = 'reciente';
}
