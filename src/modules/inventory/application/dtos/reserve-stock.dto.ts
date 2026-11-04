import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ReserveStockDto {
  @ApiProperty({ example: 'inv-uuid-123', description: 'ID del registro de inventario a reservar' })
  @IsString()
  @IsNotEmpty()
  inventarioId: string;

  @ApiProperty({ example: 3, description: 'Cantidad a reservar (checkout TTL 15 min)' })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 'carrito-uuid-456', required: false, description: 'ID del carrito o referencia del checkout' })
  @IsOptional()
  @IsString()
  referenciaId?: string;
}

export class ReleaseReservationDto {
  @ApiProperty({ example: 'inv-uuid-123', description: 'ID del registro de inventario' })
  @IsString()
  @IsNotEmpty()
  inventarioId: string;

  @ApiProperty({ example: 3, description: 'Cantidad a liberar de la reserva' })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 'carrito-uuid-456', required: false })
  @IsOptional()
  @IsString()
  referenciaId?: string;
}
