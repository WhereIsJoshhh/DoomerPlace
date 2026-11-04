import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPedido, EstadoSubPedido } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: EstadoPedido, description: 'Nuevo estado del pedido' })
  @IsEnum(EstadoPedido)
  @IsNotEmpty()
  estado: EstadoPedido;

  @ApiPropertyOptional({ description: 'Comentario explicativo del cambio de estado' })
  @IsString()
  @IsOptional()
  comentario?: string;
}

export class UpdateSubOrderStatusDto {
  @ApiProperty({ enum: EstadoSubPedido, description: 'Nuevo estado del subpedido' })
  @IsEnum(EstadoSubPedido)
  @IsNotEmpty()
  estado: EstadoSubPedido;

  @ApiPropertyOptional({ description: 'Comentario o justificación del cambio' })
  @IsString()
  @IsOptional()
  comentario?: string;
}
