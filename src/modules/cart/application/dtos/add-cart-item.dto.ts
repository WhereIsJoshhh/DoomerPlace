import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'prod-uuid-123', description: 'ID del producto a agregar' })
  @IsString()
  @IsNotEmpty()
  productoId: string;

  @ApiProperty({ example: 'var-uuid-456', required: false, description: 'ID de variante (obligatorio si el producto es VARIABLE)' })
  @IsOptional()
  @IsString()
  varianteId?: string;

  @ApiProperty({ example: 2, description: 'Cantidad a agregar al carrito' })
  @IsInt()
  @Min(1)
  cantidad: number;
}
