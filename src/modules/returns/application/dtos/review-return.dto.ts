import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoDevolucion, InspeccionEstado } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ReviewReturnDto {
  @ApiProperty({
    enum: [EstadoDevolucion.APROBADA, EstadoDevolucion.RECHAZADA],
    description: 'Dictamen de la devolución',
    example: EstadoDevolucion.APROBADA,
  })
  @IsEnum(EstadoDevolucion)
  @IsNotEmpty()
  estado: EstadoDevolucion;

  @ApiPropertyOptional({
    enum: InspeccionEstado,
    description: 'Resultado de la inspección física del producto devuelto',
    example: InspeccionEstado.CONFORME,
  })
  @IsEnum(InspeccionEstado)
  @IsOptional()
  inspeccionEstado?: InspeccionEstado;

  @ApiPropertyOptional({ description: 'Monto a reembolsar al cliente', example: 49.99 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  montoReembolso?: number;

  @ApiPropertyOptional({ description: 'Observaciones de la resolución' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
