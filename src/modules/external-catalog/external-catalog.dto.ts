import { IsArray, ArrayMaxSize, ArrayMinSize, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExternalProviderName { AMAZON = 'AMAZON', MERCARI = 'MERCARI' }

export class ImportExternalProductDto {
  @ApiProperty({ enum: ExternalProviderName }) @IsEnum(ExternalProviderName) provider: ExternalProviderName;
  @ApiProperty({ description: 'ASIN, ID de publicación o URL del producto' }) @IsString() @MaxLength(500) externalId: string;
  @ApiPropertyOptional({ description: 'ID de una tienda existente del Marketplace' }) @IsOptional() @IsString() tiendaDestinoId?: string;
}

export class BatchImportExternalProductsDto {
  @ApiProperty({ enum: ExternalProviderName }) @IsEnum(ExternalProviderName) provider: ExternalProviderName;
  @ApiProperty({ type: [String], description: 'IDs o URLs; máximo 50 por lote' }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsString({ each: true }) items: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() tiendaDestinoId?: string;
}

export class SyncExternalProductsDto {
  @ApiPropertyOptional({ enum: ExternalProviderName }) @IsOptional() @IsEnum(ExternalProviderName) provider?: ExternalProviderName;
  @ApiPropertyOptional({ type: [String], description: 'IDs externos opcionales' }) @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) externalIds?: string[];
}

export interface ExternalImageDTO { url: string; altText?: string }
export interface ExternalAttributeDTO { name: string; value: string }
export interface ExternalProductDTO {
  provider: ExternalProviderName;
  externalId: string;
  title: string;
  description?: string;
  brand?: string;
  images: ExternalImageDTO[];
  price?: number;
  currency?: string;
  available: boolean;
  condition?: string;
  sellerName?: string;
  originalUrl: string;
  attributes: ExternalAttributeDTO[];
  raw?: unknown;
}
export interface InternalProductPayload {
  skuBase: string;
  nombre: string;
  descripcionCorta: string;
  descripcionLarga?: string;
  marca?: string;
  precio: number;
  moneda?: string;
  stockDisponible: number;
  imagenes: ExternalImageDTO[];
  atributos: ExternalAttributeDTO[];
  originalUrl: string;
  condicion?: string;
  vendedorOriginal?: string;
}
export interface SyncResultDTO {
  provider: ExternalProviderName;
  externalId: string;
  status: 'synced' | 'failed' | 'not_found';
  price?: number;
  available?: boolean;
  message?: string;
}
