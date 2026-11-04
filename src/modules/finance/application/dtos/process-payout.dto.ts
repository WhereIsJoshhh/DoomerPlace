import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoLiquidacion } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ProcessPayoutDto {
  @ApiProperty({
    enum: [EstadoLiquidacion.PAGADA, EstadoLiquidacion.RECHAZADA],
    description: 'Resolución de la liquidación',
    example: EstadoLiquidacion.PAGADA,
  })
  @IsEnum(EstadoLiquidacion)
  @IsNotEmpty()
  estado: EstadoLiquidacion;

  @ApiPropertyOptional({
    description: 'Número de comprobante o referencia de transferencia bancaria SPEI/ACH/Wire',
    example: 'TRANSF-2026-998811',
  })
  @IsString()
  @IsOptional()
  referenciaBancaria?: string;

  @ApiPropertyOptional({
    description: 'URL del comprobante o archivo PDF de la transferencia',
    example: 'https://storage.marketplace.com/payouts/proof-998811.pdf',
  })
  @IsString()
  @IsOptional()
  comprobanteUrl?: string;
}
