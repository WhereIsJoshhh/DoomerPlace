import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Carlos', description: 'Nombre del usuario' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'García', description: 'Apellido del usuario' })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiProperty({ example: 'carlos.garcia@example.com', description: 'Correo electrónico único' })
  @IsEmail({}, { message: 'El formato de correo electrónico es inválido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+525512345678', required: false, description: 'Teléfono con código de país' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 'Password123!', minLength: 8, description: 'Contraseña segura (mínimo 8 caracteres)' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe contener al menos 8 caracteres' })
  password: string;
}
