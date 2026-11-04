import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty({ description: 'Nombre de la entidad bancaria', example: 'Banco Santander' })
  @IsString()
  @IsNotEmpty()
  banco: string;

  @ApiProperty({ description: 'Tipo de cuenta (CORRIENTE, AHORROS, etc.)', example: 'CORRIENTE' })
  @IsString()
  @IsNotEmpty()
  tipoCuenta: string;

  @ApiProperty({ description: 'Número de cuenta o CLABE/IBAN', example: '123456789012345678' })
  @IsString()
  @IsNotEmpty()
  numeroCuenta: string;

  @ApiProperty({ description: 'Nombre completo o razón social del titular', example: 'Tech Store S.A. de C.V.' })
  @IsString()
  @IsNotEmpty()
  titularCuenta: string;

  @ApiProperty({ description: 'Identificación fiscal o documento de identidad del titular', example: 'RFC123456ABC' })
  @IsString()
  @IsNotEmpty()
  identificacionTitular: string;

  @ApiPropertyOptional({ description: 'Marcar como cuenta principal de desembolso', default: false })
  @IsBoolean()
  @IsOptional()
  esPrincipal?: boolean = false;
}
