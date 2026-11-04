import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { EstadoProducto } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({ enum: EstadoProducto, required: false, description: 'Estado del producto (BORRADOR, ACTIVO, INACTIVO, ARCHIVADO)' })
  @IsOptional()
  @IsEnum(EstadoProducto)
  estado?: EstadoProducto;
}
