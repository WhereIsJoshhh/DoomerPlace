import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPedido, EstadoSubPedido } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, Min } from 'class-validator';

export class FilterOrdersDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite de registros por página', default: 10 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: EstadoPedido, description: 'Filtrar por estado del pedido general' })
  @IsEnum(EstadoPedido)
  @IsOptional()
  estado?: EstadoPedido;
}

export class FilterSubOrdersDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite de registros por página', default: 10 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ enum: EstadoSubPedido, description: 'Filtrar por estado del subpedido' })
  @IsEnum(EstadoSubPedido)
  @IsOptional()
  estado?: EstadoSubPedido;
}
