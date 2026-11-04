import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateProductReviewDto {
  @ApiProperty({ description: 'ID del PedidoItem comprado que respalda la compra verificada' })
  @IsUUID('4')
  @IsNotEmpty()
  pedidoItemId: string;

  @ApiProperty({ description: 'Calificación de 1 a 5 estrellas', example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiPropertyOptional({ description: 'Título de la reseña', example: 'Excelente calidad y acabados' })
  @IsString()
  @IsOptional()
  titulo?: string;

  @ApiPropertyOptional({ description: 'Comentario detallado de la experiencia de compra' })
  @IsString()
  @IsOptional()
  comentario?: string;
}

export class CreateStoreReviewDto {
  @ApiProperty({ description: 'ID del SubPedido asociado a la tienda' })
  @IsUUID('4')
  @IsNotEmpty()
  subPedidoId: string;

  @ApiProperty({ description: 'Calificación a la tienda de 1 a 5 estrellas', example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiPropertyOptional({ description: 'Comentario sobre atención, embalaje o rapidez de despacho' })
  @IsString()
  @IsOptional()
  comentario?: string;
}
