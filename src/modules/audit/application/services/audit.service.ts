import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { UpdateConfigDto, FilterAuditDto } from '../dtos/audit.dto';
import { Prisma } from '@prisma/client';

export interface ILogAudit {
  usuarioId?: string;
  modulo: string;
  accion: string;
  entidad: string;
  entidadId?: string;
  datosPrevios?: any;
  datosNuevos?: any;
  direccionIp?: string;
  agenteUsuario?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registrar evento de auditoría de seguridad o negocio
   */
  async log(entry: ILogAudit) {
    try {
      return await this.prisma.auditoria.create({
        data: {
          usuarioId: entry.usuarioId,
          modulo: entry.modulo,
          accion: entry.accion,
          entidad: entry.entidad,
          entidadId: entry.entidadId,
          datosPrevios: entry.datosPrevios ? (entry.datosPrevios as Prisma.InputJsonValue) : Prisma.DbNull,
          datosNuevos: entry.datosNuevos ? (entry.datosNuevos as Prisma.InputJsonValue) : Prisma.DbNull,
          direccionIp: entry.direccionIp,
          agenteUsuario: entry.agenteUsuario,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error guardando auditoría: ${err.message}`);
    }
  }

  /**
   * Consultar logs de auditoría paginados
   */
  async getAuditLogs(filter: FilterAuditDto) {
    const { page = 1, limit = 20, modulo } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditoriaWhereInput = {
      ...(modulo && { modulo }),
    };

    const [total, items] = await Promise.all([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Guardar o actualizar configuración global
   */
  async setConfig(dto: UpdateConfigDto) {
    return this.prisma.configuracion.upsert({
      where: { clave: dto.clave },
      update: {
        valor: dto.valor,
        tipoDato: dto.tipoDato ?? 'STRING',
        grupo: dto.grupo ?? 'GENERAL',
        descripcion: dto.descripcion,
      },
      create: {
        clave: dto.clave,
        valor: dto.valor,
        tipoDato: dto.tipoDato ?? 'STRING',
        grupo: dto.grupo ?? 'GENERAL',
        descripcion: dto.descripcion,
      },
    });
  }

  /**
   * Obtener todas las configuraciones globales
   */
  async getAllConfig() {
    return this.prisma.configuracion.findMany({
      orderBy: { grupo: 'asc' },
    });
  }
}
