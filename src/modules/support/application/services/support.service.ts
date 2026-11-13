import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateContactMessageDto } from '../dtos/create-contact-message.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Guardar un mensaje del formulario público de contacto.
   * Los mensajes quedan en estado NUEVO para que el equipo los revise.
   */
  async createContactMessage(dto: CreateContactMessageDto) {
    const mensaje = await this.prisma.mensajeContacto.create({
      data: {
        nombre: dto.nombre.trim(),
        email: dto.email.toLowerCase().trim(),
        asunto: dto.asunto?.trim() || null,
        mensaje: dto.mensaje.trim(),
      },
    });

    return {
      id: mensaje.id,
      message:
        'Recibimos tu mensaje. Te responderemos al correo que nos dejaste.',
    };
  }

  /**
   * Listar mensajes de contacto (solo administradores, vía controlador).
   */
  async listContactMessages() {
    return this.prisma.mensajeContacto.findMany({
      orderBy: { fechaCreacion: 'desc' },
      take: 100,
    });
  }
}
