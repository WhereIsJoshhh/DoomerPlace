import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateStoreDto {
  @ApiProperty({ example: 'Doomer Tech Oficial', required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ example: 'Tu tienda geek de confianza', required: false })
  @IsOptional()
  @IsString()
  lema?: string;

  @ApiProperty({ example: 'Líderes en venta de hardware de última generación.', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 'https://cdn.marketplace.com/logos/store.png', required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ example: 'https://cdn.marketplace.com/banners/store.jpg', required: false })
  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @ApiProperty({ example: '+525598765432', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 'ventas@doomertech.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Av. Tecnológica 404, CDMX', required: false })
  @IsOptional()
  @IsString()
  direccionFisica?: string;

  @ApiProperty({ example: 'Lunes a Viernes 09:00 - 18:00', required: false })
  @IsOptional()
  @IsString()
  horarioAtencion?: string;

  @ApiProperty({ example: '30 días de garantía con cambio directo en defectos de fábrica.', required: false })
  @IsOptional()
  @IsString()
  politicasDevolucion?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  estado?: boolean;
}
