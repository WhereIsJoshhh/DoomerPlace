import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'carlos.garcia@example.com', description: 'Correo electrónico de la cuenta' })
  @IsEmail({}, { message: 'El formato de correo electrónico es inválido' })
  @IsNotEmpty()
  email: string;
}
