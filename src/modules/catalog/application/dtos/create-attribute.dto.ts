import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateAttributeValueDto {
  @ApiProperty({ example: 'Rojo', description: 'Nombre o etiqueta del valor' })
  @IsString()
  @IsNotEmpty()
  valor: string;

  @ApiProperty({ example: '#FF0000', required: false, description: 'Código hexadecimal para colores' })
  @IsOptional()
  @IsString()
  codigoHex?: string;

  @ApiProperty({ example: 1, required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  orden?: number;
}

export class CreateAttributeDto {
  @ApiProperty({ example: 'cat-uuid', required: false, description: 'ID de la categoría a la que aplica (o null para global)' })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiProperty({ example: 'Color', description: 'Nombre del atributo (Color, Talla, Memoria RAM)' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'TEXTO', required: false, default: 'TEXTO', description: 'Tipo de dato (TEXTO, NUMERO, COLOR)' })
  @IsOptional()
  @IsString()
  tipoDato?: string;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  esObligatorio?: boolean;

  @ApiProperty({ example: true, required: false, default: true, description: 'Si se utiliza en filtros facetados de búsqueda' })
  @IsOptional()
  @IsBoolean()
  esFiltrable?: boolean;

  @ApiProperty({ example: true, required: false, default: true, description: 'Si este atributo define variantes combinables' })
  @IsOptional()
  @IsBoolean()
  esVariante?: boolean;

  @ApiProperty({ type: [CreateAttributeValueDto], required: false, description: 'Valores iniciales predefinidos' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeValueDto)
  valores?: CreateAttributeValueDto[];
}
