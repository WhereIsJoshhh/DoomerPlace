import { IsArray, ArrayMaxSize, ArrayMinSize, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportAmazonAsinsDto {
  @ApiProperty({ description: 'ASINs de Amazon a importar (máximo 10 por solicitud)', example: ['B09B2SBHQK'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/^[A-Z0-9]{10}$/, { each: true })
  @IsOptional()
  asins?: string[];

  @ApiProperty({ required: false, example: 'B09B2SBHQK' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{10}$/)
  asin?: string;
}

export class SearchAmazonDto {
  @ApiProperty({ example: 'auriculares inalámbricos' })
  @IsString()
  @MaxLength(100)
  keywords: string;
}

export interface AmazonItem {
  asin: string;
  detailPageURL?: string;
  itemInfo?: Record<string, any>;
  images?: Record<string, any>;
  offers?: Record<string, any>;
  [key: string]: any;
}

export interface AmazonImportResult {
  asin: string;
  productoId?: string;
  title?: string;
  affiliateUrl?: string;
  status: 'imported' | 'updated' | 'failed';
  message?: string;
}
