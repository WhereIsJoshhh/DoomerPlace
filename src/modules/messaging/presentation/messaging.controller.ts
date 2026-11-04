import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from '../application/services/messaging.service';
import { CreateQuestionDto, AnswerQuestionDto, SendMessageDto } from '../application/dtos/messaging.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Public } from '@core/decorators/public.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Comunicación, Mensajería y Preguntas')
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('questions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({ summary: 'Realizar una pregunta pública sobre un producto' })
  @ApiResponse({ status: 201, description: 'Pregunta enviada satisfactoriamente.' })
  async askQuestion(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.messagingService.askQuestion(usuarioId, dto);
  }

  @Post('questions/answer')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({ summary: 'Responder pregunta oficial (Vendedor de la tienda o Admin)' })
  @ApiResponse({ status: 201, description: 'Respuesta publicada.' })
  async answerQuestion(
    @CurrentUser('userId') usuarioId: string,
    @CurrentUser('roles') roles: string[],
    @Body() dto: AnswerQuestionDto,
  ) {
    const esAdmin = roles?.includes('SUPER_ADMIN') || roles?.includes('ADMIN');
    return this.messagingService.answerQuestion(usuarioId, dto, esAdmin);
  }

  @Get('questions/product/:productoId')
  @Public()
  @ApiOperation({ summary: 'Listar preguntas y respuestas públicas de un producto' })
  async getProductQuestions(@Param('productoId') productoId: string) {
    return this.messagingService.getProductQuestions(productoId);
  }

  @Post('conversations/messages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({ summary: 'Enviar mensaje directo a una tienda/vendedor' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado.' })
  async sendMessage(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(usuarioId, dto);
  }

  @Get('conversations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({ summary: 'Listar conversaciones del usuario' })
  async getConversations(@CurrentUser('userId') usuarioId: string) {
    return this.messagingService.getConversations(usuarioId);
  }
}
