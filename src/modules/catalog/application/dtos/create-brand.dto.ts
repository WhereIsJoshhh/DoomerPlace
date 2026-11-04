import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Apple', description: 'Nombre de la marca' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'apple', required: false, description: 'Slug único' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'Fabricante de tecnología global', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 'https://cdn.marketplace.com/brands/apple.svg', required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ example: 'https://www.apple.com', required: false })
  @IsOptional()
  @IsString()
  sitioWeb?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
