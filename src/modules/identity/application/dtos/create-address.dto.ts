import { ApiProperty } from '@nestjs/swagger';
import { TipoDireccion } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ enum: TipoDireccion, example: TipoDireccion.ENVIO, description: 'Tipo de dirección: ENVIO o FACTURACION' })
  @IsEnum(TipoDireccion)
  @IsNotEmpty()
  tipo: TipoDireccion;

  @ApiProperty({ example: 'Casa', required: false, description: 'Alias identificador' })
  @IsOptional()
  @IsString()
  alias?: string;

  @ApiProperty({ example: 'Carlos García', description: 'Nombre completo de quien recibe' })
  @IsString()
  @IsNotEmpty()
  receptor: string;

  @ApiProperty({ example: '+525512345678', description: 'Teléfono de contacto para entrega' })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({ example: 'México', description: 'País de destino' })
  @IsString()
  @IsNotEmpty()
  pais: string;

  @ApiProperty({ example: 'Ciudad de México', description: 'Departamento / Estado / Provincia' })
  @IsString()
  @IsNotEmpty()
  departamento: string;

  @ApiProperty({ example: 'Benito Juárez', description: 'Ciudad o Municipio' })
  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @ApiProperty({ example: 'Del Valle Sur', required: false, description: 'Colonia / Barrio' })
  @IsOptional()
  @IsString()
  colonia?: string;

  @ApiProperty({ example: 'Av. Insurgentes Sur 1234, Depto 402', description: 'Calle y número' })
  @IsString()
  @IsNotEmpty()
  calle: string;

  @ApiProperty({ example: 'Entre calle A y B, edificio color beige', required: false, description: 'Referencias de entrega' })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiProperty({ example: '03100', description: 'Código Postal' })
  @IsString()
  @IsNotEmpty()
  codigoPostal: string;

  @ApiProperty({ example: 19.3756, required: false, description: 'Latitud geográfica' })
  @IsOptional()
  @IsNumber()
  latitud?: number;

  @ApiProperty({ example: -99.1782, required: false, description: 'Longitud geográfica' })
  @IsOptional()
  @IsNumber()
  longitud?: number;

  @ApiProperty({ example: true, required: false, description: 'Marcar como dirección principal de este tipo' })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;
}
