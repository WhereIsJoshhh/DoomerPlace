import { ApiProperty } from '@nestjs/swagger';
import { EstadoDocumento } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReviewKycDocumentDto {
  @ApiProperty({ enum: EstadoDocumento, example: EstadoDocumento.APROBADO, description: 'Nuevo estado: APROBADO o RECHAZADO' })
  @IsEnum(EstadoDocumento)
  @IsNotEmpty()
  estado: EstadoDocumento;

  @ApiProperty({ example: 'Documento vigente y legible.', required: false, description: 'Observaciones de la revisión' })
  @IsOptional()
  @IsString()
  observacionesRevision?: string;
}
