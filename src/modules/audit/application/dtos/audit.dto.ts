import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateConfigDto {
  @ApiProperty({ description: 'Clave única del parámetro global', example: 'TAX_RATE_DEFAULT' })
  @IsString()
  @IsNotEmpty()
  clave: string;

  @ApiProperty({ description: 'Valor del parámetro', example: '15.00' })
  @IsString()
  @IsNotEmpty()
  valor: string;

  @ApiPropertyOptional({ description: 'Tipo de dato (STRING, NUMBER, BOOLEAN, JSON)', default: 'STRING' })
  @IsString()
  @IsOptional()
  tipoDato?: string;

  @ApiPropertyOptional({ description: 'Grupo funcional', default: 'GENERAL' })
  @IsString()
  @IsOptional()
  grupo?: string;

  @ApiPropertyOptional({ description: 'Descripción explicativa del parámetro' })
  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class FilterAuditDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar por módulo funcional' })
  @IsOptional()
  modulo?: string;
}
