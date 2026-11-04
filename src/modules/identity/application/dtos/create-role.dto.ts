import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Soporte al Cliente', description: 'Nombre legible del rol' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'SOPORTE_CLIENTE', description: 'Slug único en mayúsculas del rol' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Atención a tickets y consultas de clientes', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: ['permiso-uuid-1', 'permiso-uuid-2'], required: false, description: 'Lista de IDs de permisos asignados' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permisoIds?: string[];
}
