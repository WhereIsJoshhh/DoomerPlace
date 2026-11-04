import { ApiProperty } from '@nestjs/swagger';
import { EstadoVendedor } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReviewVendorStatusDto {
  @ApiProperty({
    enum: EstadoVendedor,
    example: EstadoVendedor.APROBADO,
    description: 'Estado definitivo: APROBADO, RECHAZADO o SUSPENDIDO',
  })
  @IsEnum(EstadoVendedor)
  @IsNotEmpty()
  estado: EstadoVendedor;

  @ApiProperty({
    example: 8.5,
    required: false,
    description: 'Porcentaje de comisión base personalizado para la tienda (%)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeComisionBase?: number;

  @ApiProperty({
    example: 'Validación KYC completada satisfactoriamente.',
    required: false,
    description: 'Motivo o comentarios de la decisión',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}
