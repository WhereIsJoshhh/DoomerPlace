import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID de la dirección de envío del usuario',
    example: 'd9b1c9c4-1111-2222-3333-444455556666',
  })
  @IsUUID('4', { message: 'El ID de la dirección de envío debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'La dirección de envío es obligatoria.' })
  direccionEnvioId: string;

  @ApiPropertyOptional({
    description: 'ID de la dirección de facturación (si es omitida, se usa la de envío)',
    example: 'd9b1c9c4-1111-2222-3333-444455556666',
  })
  @IsUUID('4', { message: 'El ID de la dirección de facturación debe ser un UUID válido.' })
  @IsOptional()
  direccionFacturacionId?: string;

  @ApiPropertyOptional({
    description: 'Código de cupón de descuento a aplicar',
    example: 'VERANO2026',
  })
  @IsString({ message: 'El cupón debe ser una cadena de texto.' })
  @IsOptional()
  cuponCodigo?: string;

  @ApiProperty({
    description: 'Código del método de pago elegido (ej: STRIPE, PAYPAL, TRANSFERENCIA)',
    example: 'STRIPE',
  })
  @IsString({ message: 'El código de método de pago debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El método de pago es obligatorio.' })
  metodoPagoCodigo: string;
}
