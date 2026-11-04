import { ApiProperty } from '@nestjs/swagger';
import { TipoPersona } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class KycDocumentDto {
  @ApiProperty({ example: 'RUC', description: 'Tipo de documento (RUC, DNI, COMPROBANTE_DOMICILIO)' })
  @IsString()
  @IsNotEmpty()
  tipoDocumento: string;

  @ApiProperty({ example: '20601234567', description: 'Número del documento legal' })
  @IsString()
  @IsNotEmpty()
  numeroDocumento: string;

  @ApiProperty({ example: 'https://storage.marketplace.com/kyc/doc1.pdf', description: 'URL del archivo en almacenamiento seguro' })
  @IsString()
  @IsNotEmpty()
  archivoUrl: string;
}

export class VendorOnboardingDto {
  @ApiProperty({ example: 'Comercializadora Doomer S.A.C.', description: 'Razón Social legal' })
  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @ApiProperty({ example: 'Doomer Tech Store', description: 'Nombre comercial de la marca' })
  @IsString()
  @IsNotEmpty()
  nombreComercial: string;

  @ApiProperty({ example: '20601234567', description: 'Identificación fiscal / CIF / RUT / RFC / RUC' })
  @IsString()
  @IsNotEmpty()
  identificacionFiscal: string;

  @ApiProperty({ enum: TipoPersona, example: TipoPersona.JURIDICA, description: 'Tipo de persona: NATURAL o JURIDICA' })
  @IsEnum(TipoPersona)
  @IsNotEmpty()
  tipoPersona: TipoPersona;

  @ApiProperty({ example: '+525598765432', description: 'Teléfono oficial comercial' })
  @IsString()
  @IsNotEmpty()
  telefonoComercial: string;

  @ApiProperty({ example: 'contacto@doomertech.com', description: 'Email oficial comercial' })
  @IsEmail()
  @IsNotEmpty()
  emailComercial: string;

  @ApiProperty({ example: 'Doomer Tech', description: 'Nombre público de la tienda' })
  @IsString()
  @IsNotEmpty()
  tiendaNombre: string;

  @ApiProperty({ example: 'doomer-tech', required: false, description: 'Slug URL personalizado para la tienda' })
  @IsOptional()
  @IsString()
  tiendaSlug?: string;

  @ApiProperty({ example: 'Especialistas en hardware, computación y gadgets', required: false })
  @IsOptional()
  @IsString()
  tiendaDescripcion?: string;

  @ApiProperty({ type: [KycDocumentDto], description: 'Expediente digital de documentos KYC para validación' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KycDocumentDto)
  documentos: KycDocumentDto[];
}
