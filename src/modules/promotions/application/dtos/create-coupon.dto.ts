import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDescuento } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateCouponDto {
  @ApiPropertyOptional({ description: 'ID de la tienda si es cupón exclusivo de vendedor' })
  @IsUUID('4')
  @IsOptional()
  tiendaId?: string;

  @ApiProperty({ description: 'Código alfanumérico del cupón', example: 'PROMO2026' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiPropertyOptional({ description: 'Descripción o condiciones del cupón' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ enum: TipoDescuento, description: 'Tipo de descuento: PORCENTAJE o MONTO_FIJO', example: TipoDescuento.PORCENTAJE })
  @IsEnum(TipoDescuento)
  @IsNotEmpty()
  tipoDescuento: TipoDescuento;

  @ApiProperty({ description: 'Valor del descuento (% o monto en USD)', example: 15.0 })
  @IsNumber()
  @IsPositive()
  valorDescuento: number;

  @ApiPropertyOptional({ description: 'Monto mínimo de compra para aplicar el cupón', default: 0 })
  @IsNumber()
  @IsOptional()
  montoMinimoCompra?: number = 0;

  @ApiPropertyOptional({ description: 'Límite máximo de usos globales' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  limiteUsosTotal?: number;

  @ApiPropertyOptional({ description: 'Límite de usos por usuario', default: 1 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  limiteUsosPorUsuario?: number = 1;

  @ApiProperty({ description: 'Fecha de inicio de vigencia' })
  @Type(() => Date)
  @IsDate()
  fechaInicio: Date;

  @ApiProperty({ description: 'Fecha de fin de vigencia' })
  @Type(() => Date)
  @IsDate()
  fechaFin: Date;
}

export class ValidateCouponDto {
  @ApiProperty({ description: 'Código del cupón a validar', example: 'PROMO2026' })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({ description: 'Monto subtotal actual del carrito', example: 120.0 })
  @IsNumber()
  @IsPositive()
  montoCompra: number;
}
