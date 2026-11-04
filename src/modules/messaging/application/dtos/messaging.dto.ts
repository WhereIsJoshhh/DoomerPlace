import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuestionDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID('4')
  @IsNotEmpty()
  productoId: string;

  @ApiProperty({ description: 'Pregunta sobre el producto o especificaciones', example: '¿Tiene garantía de fábrica de 1 año?' })
  @IsString()
  @IsNotEmpty()
  pregunta: string;
}

export class AnswerQuestionDto {
  @ApiProperty({ description: 'ID de la pregunta a responder' })
  @IsUUID('4')
  @IsNotEmpty()
  preguntaId: string;

  @ApiProperty({ description: 'Respuesta oficial de la tienda o vendedor', example: 'Hola, sí, cuenta con 1 año de garantía oficial.' })
  @IsString()
  @IsNotEmpty()
  respuesta: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'ID de la tienda de destino' })
  @IsUUID('4')
  @IsNotEmpty()
  tiendaId: string;

  @ApiPropertyOptional({ description: 'ID del SubPedido de referencia (opcional)' })
  @IsUUID('4')
  @IsOptional()
  subPedidoId?: string;

  @ApiProperty({ description: 'Contenido del mensaje', example: 'Buenas tardes, quisiera consultar sobre el embalaje para regalo.' })
  @IsString()
  @IsNotEmpty()
  contenido: string;
}
