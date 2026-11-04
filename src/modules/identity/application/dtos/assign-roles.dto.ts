import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({
    example: ['SUPER_ADMIN', 'ADMIN'],
    description: 'Lista de slugs de roles a asignar al usuario (reemplaza o sincroniza roles)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  roleSlugs: string[];
}
