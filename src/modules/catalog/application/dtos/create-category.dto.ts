import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Tecnología', description: 'Nombre de la categoría' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'tecnologia', required: false, description: 'Slug único URL' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'cat-uuid-padre', required: false, description: 'ID de la categoría superior en el árbol' })
  @IsOptional()
  @IsString()
  categoriaPadreId?: string;

  @ApiProperty({ example: 'Dispositivos electrónicos, computadoras y gadgets', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 'https://cdn.marketplace.com/categories/tech.png', required: false })
  @IsOptional()
  @IsString()
  imagenUrl?: string;

  @ApiProperty({ example: 'cpu', required: false, description: 'Nombre de ícono o clase SVG' })
  @IsOptional()
  @IsString()
  icono?: string;

  @ApiProperty({ example: 0, required: false, default: 0, description: 'Orden de visualización' })
  @IsOptional()
  @IsNumber()
  orden?: number;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
