import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'ID del pedido a pagar',
    example: 'a0b1c2d3-4567-89ab-cdef-0123456789ab',
  })
  @IsUUID('4', { message: 'El ID del pedido debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El ID del pedido es obligatorio.' })
  pedidoId: string;

  @ApiProperty({
    description: 'Código del método de pago (ej: STRIPE, PAYPAL, TRANSFERENCIA)',
    example: 'STRIPE',
  })
  @IsString({ message: 'El código del método de pago debe ser un texto.' })
  @IsNotEmpty({ message: 'El método de pago es obligatorio.' })
  metodoPagoCodigo: string;
}
