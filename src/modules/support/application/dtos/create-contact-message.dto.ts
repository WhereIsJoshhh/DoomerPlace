import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'Ana López', description: 'Nombre de quien escribe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'ana@example.com', description: 'Correo para responder' })
  @IsEmail({}, { message: 'El formato de correo electrónico es inválido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Duda sobre un producto', required: false, description: 'Asunto del mensaje' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  asunto?: string;

  @ApiProperty({ example: 'Hola, necesito ayuda con…', description: 'Mensaje de contacto' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Cuéntanos un poco más (mínimo 10 caracteres)' })
  @MaxLength(2000)
  mensaje: string;
}
