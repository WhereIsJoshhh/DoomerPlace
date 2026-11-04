import { ApiProperty } from '@nestjs/swagger';
import { EstadoVendedor } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FilterVendorsDto {
  @ApiProperty({ enum: EstadoVendedor, required: false, description: 'Filtrar por estado KYC' })
  @IsOptional()
  @IsEnum(EstadoVendedor)
  estado?: EstadoVendedor;

  @ApiProperty({ required: false, description: 'Búsqueda por razón social, nombre comercial o identificación fiscal' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
