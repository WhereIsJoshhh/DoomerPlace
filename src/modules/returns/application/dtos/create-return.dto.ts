import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ReturnItemDto {
  @ApiProperty({ description: 'ID del PedidoItem a devolver' })
  @IsUUID('4')
  @IsNotEmpty()
  pedidoItemId: string;

  @ApiProperty({ description: 'Cantidad de unidades a devolver', example: 1 })
  @IsInt()
  @IsPositive()
  cantidad: number;
}

export class CreateReturnDto {
  @ApiProperty({ description: 'ID del SubPedido asociado' })
  @IsUUID('4')
  @IsNotEmpty()
  subPedidoId: string;

  @ApiProperty({ description: 'Motivo de la solicitud de devolución', example: 'Producto defectuoso o no corresponde a la descripción' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiPropertyOptional({ description: 'Detalles adicionales o descripción de la falla' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({ type: [ReturnItemDto], description: 'Listado de ítems a devolver' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
