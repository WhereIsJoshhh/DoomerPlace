import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 'item-uuid-123', description: 'ID del ítem del carrito a actualizar' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 5, description: 'Nueva cantidad deseada (0 elimina el ítem)' })
  @IsInt()
  @Min(0)
  cantidad: number;
}
