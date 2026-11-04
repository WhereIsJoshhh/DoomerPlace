import { ApiProperty } from '@nestjs/swagger';
import { TipoMovimientoInventario } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AdjustInventoryDto {
  @ApiProperty({
    enum: TipoMovimientoInventario,
    example: TipoMovimientoInventario.AJUSTE_POSITIVO,
    description: 'Tipo de movimiento: AJUSTE_POSITIVO o AJUSTE_NEGATIVO',
  })
  @IsEnum(TipoMovimientoInventario)
  @IsNotEmpty()
  tipo: TipoMovimientoInventario;

  @ApiProperty({ example: 50, description: 'Cantidad a ajustar (siempre positiva, la dirección la da el tipo)' })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 'Recepción de mercancía OC-2026-001', description: 'Razón o referencia del ajuste' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({ example: 'ORDEN_COMPRA', required: false, description: 'Tipo de entidad de referencia externa' })
  @IsOptional()
  @IsString()
  referenciaTipo?: string;

  @ApiProperty({ example: 'oc-uuid-123', required: false, description: 'ID de la entidad referenciada' })
  @IsOptional()
  @IsString()
  referenciaId?: string;
}
