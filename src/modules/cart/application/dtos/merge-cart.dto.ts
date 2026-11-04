import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MergeCartDto {
  @ApiProperty({
    example: 'guest-token-uuid-789',
    required: false,
    description: 'Token de sesión del carrito anónimo a fusionar con el carrito del usuario autenticado',
  })
  @IsOptional()
  @IsString()
  tokenSesion?: string;
}
