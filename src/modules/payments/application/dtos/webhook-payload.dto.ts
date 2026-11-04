import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class WebhookPaymentPayloadDto {
  @ApiProperty({
    description: 'Identificador único de la transacción en la pasarela externa',
    example: 'ch_3MtwxGAES',
  })
  @IsString()
  @IsNotEmpty()
  transaccionExternaId: string;

  @ApiProperty({
    description: 'Evento recibido (ej: payment_intent.succeeded, charge.failed)',
    example: 'payment_intent.succeeded',
  })
  @IsString()
  @IsNotEmpty()
  evento: string;

  @ApiProperty({
    description: 'Estado de la transacción reportado por la pasarela (ej: SUCCEEDED, FAILED, REFUNDED)',
    example: 'SUCCEEDED',
  })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @ApiPropertyOptional({
    description: 'Monto procesado',
    example: 99.99,
  })
  @IsNumber()
  @IsOptional()
  monto?: number;

  @ApiPropertyOptional({
    description: 'Código de autorización de la tarjeta o banco',
    example: 'AUTH-987654',
  })
  @IsString()
  @IsOptional()
  codigoAutorizacion?: string;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales retornados por la pasarela',
  })
  @IsOptional()
  metadatos?: Record<string, any>;
}
