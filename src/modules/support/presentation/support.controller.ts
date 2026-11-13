import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { Roles } from '@core/decorators/roles.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { SupportService } from '../application/services/support.service';
import { CreateContactMessageDto } from '../application/dtos/create-contact-message.dto';

@ApiTags('Contacto y Soporte')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Public()
  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enviar un mensaje desde el formulario público de contacto' })
  @ApiResponse({ status: 201, description: 'Mensaje recibido y guardado.' })
  @ApiResponse({ status: 400, description: 'Datos del formulario inválidos.' })
  async createContactMessage(@Body() dto: CreateContactMessageDto) {
    return this.supportService.createContactMessage(dto);
  }

  @Get('contact')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Listar mensajes de contacto (solo administradores)' })
  @ApiResponse({ status: 200, description: 'Mensajes de contacto más recientes.' })
  async listContactMessages() {
    return this.supportService.listContactMessages();
  }
}
