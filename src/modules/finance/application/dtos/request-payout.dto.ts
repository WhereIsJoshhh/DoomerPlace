import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RequestPayoutDto {
  @ApiProperty({
    description: 'ID de la cuenta bancaria donde se depositará la liquidación',
    example: 'a0b1c2d3-4567-89ab-cdef-0123456789ab',
  })
  @IsUUID('4')
  @IsNotEmpty()
  cuentaBancariaId: string;
}

export class FilterPayoutsDto {
  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', default: 10 })
  @IsOptional()
  limit?: number = 10;
}
