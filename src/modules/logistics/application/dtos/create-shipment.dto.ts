import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty({
    description: 'ID del SubPedido a despachar',
    example: 'a0b1c2d3-4567-89ab-cdef-0123456789ab',
  })
  @IsUUID('4')
  @IsNotEmpty()
  subPedidoId: string;

  @ApiProperty({
    description: 'Nombre de la empresa o courier logístico (ej: DHL, FedEx, Servientrega)',
    example: 'DHL Express',
  })
  @IsString()
  @IsNotEmpty()
  proveedorLogistico: string;

  @ApiProperty({
    description: 'Número de guía / rastreo asignado',
    example: 'DHL-TRACK-99887766',
  })
  @IsString()
  @IsNotEmpty()
  numeroGuia: string;

  @ApiPropertyOptional({
    description: 'Enlace web directo para rastreo de paquete',
    example: 'https://track.dhl.com/?trackNum=DHL-TRACK-99887766',
  })
  @IsString()
  @IsOptional()
  urlTracking?: string;

  @ApiProperty({ description: 'Costo real de despacho logístico', example: 12.5 })
  @IsNumber()
  @IsPositive()
  costoRealEnvio: number;

  @ApiProperty({ description: 'Peso total del paquete en kg', example: 1.85 })
  @IsNumber()
  @IsPositive()
  pesoTotal: number;

  @ApiPropertyOptional({ description: 'Fecha estimada de entrega' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  fechaEstimadaEntrega?: Date;
}
