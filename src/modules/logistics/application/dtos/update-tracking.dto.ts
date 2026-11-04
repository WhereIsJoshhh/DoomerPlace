import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoEnvio } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTrackingDto {
  @ApiProperty({
    description: 'Nombre del hito o evento (ej: PAQUETE_RECOLECTADO, EN_ADUANA, EN_REPARTO, ENTREGADO)',
    example: 'EN_REPARTO',
  })
  @IsString()
  @IsNotEmpty()
  estadoHito: string;

  @ApiPropertyOptional({
    enum: EstadoEnvio,
    description: 'Nuevo estado formal del envío (si amerita transición)',
    example: EstadoEnvio.EN_REPARTO,
  })
  @IsEnum(EstadoEnvio)
  @IsOptional()
  estadoEnvio?: EstadoEnvio;

  @ApiPropertyOptional({
    description: 'Ubicación física actual del paquete (Ciudad, Centro de distribución)',
    example: 'Hub Central - Bogotá, Colombia',
  })
  @IsString()
  @IsOptional()
  ubicacion?: string;

  @ApiProperty({
    description: 'Descripción detallada del estado o incidencia',
    example: 'El paquete se encuentra en el vehículo de entrega rumbo al destinatario.',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;
}
