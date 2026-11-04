import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { VendorOnboardingDto, KycDocumentDto } from '../dtos/vendor-onboarding.dto';
import { ReviewKycDocumentDto } from '../dtos/review-kyc-document.dto';
import { ReviewVendorStatusDto } from '../dtos/review-vendor-status.dto';
import { FilterVendorsDto } from '../dtos/filter-vendors.dto';
import { EstadoVendedor, EstadoDocumento } from '@prisma/client';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registro y solicitud de Onboarding para convertirse en vendedor (KYC)
   */
  async applyForOnboarding(usuarioId: string, dto: VendorOnboardingDto) {
    const existingVendor = await this.prisma.vendedor.findUnique({
      where: { usuarioId },
    });

    if (existingVendor) {
      throw new ConflictException(
        `El usuario ya cuenta con una solicitud de vendedor en estado: ${existingVendor.estado}`,
      );
    }

    const existingFiscal = await this.prisma.vendedor.findUnique({
      where: { identificacionFiscal: dto.identificacionFiscal.trim() },
    });

    if (existingFiscal) {
      throw new ConflictException('La identificación fiscal ya se encuentra registrada en el sistema.');
    }

    // Generar slug para la tienda
    let baseSlug = (dto.tiendaSlug || dto.tiendaNombre)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingStore = await this.prisma.tienda.findUnique({
      where: { slug: baseSlug },
    });

    if (existingStore) {
      baseSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear Vendedor
      const vendedor = await tx.vendedor.create({
        data: {
          usuarioId,
          razonSocial: dto.razonSocial.trim(),
          nombreComercial: dto.nombreComercial.trim(),
          identificacionFiscal: dto.identificacionFiscal.trim(),
          tipoPersona: dto.tipoPersona,
          telefonoComercial: dto.telefonoComercial.trim(),
          emailComercial: dto.emailComercial.toLowerCase().trim(),
          estado: EstadoVendedor.PENDIENTE,
        },
      });

      // 2. Crear Tienda asociada
      const tienda = await tx.tienda.create({
        data: {
          vendedorId: vendedor.id,
          nombre: dto.tiendaNombre.trim(),
          slug: baseSlug,
          descripcion: dto.tiendaDescripcion?.trim(),
          telefono: dto.telefonoComercial.trim(),
          email: dto.emailComercial.toLowerCase().trim(),
        },
      });

      // 3. Crear Documentos KYC iniciales
      if (dto.documentos && dto.documentos.length > 0) {
        await tx.documentoVendedor.createMany({
          data: dto.documentos.map((doc) => ({
            vendedorId: vendedor.id,
            tipoDocumento: doc.tipoDocumento.toUpperCase().trim(),
            numeroDocumento: doc.numeroDocumento.trim(),
            archivoUrl: doc.archivoUrl.trim(),
            estado: EstadoDocumento.PENDIENTE,
          })),
        });
      }

      return tx.vendedor.findUnique({
        where: { id: vendedor.id },
        include: {
          tienda: true,
          documentos: true,
        },
      });
    });
  }

  /**
   * Consultar estado y expediente del vendedor para el usuario actual (/vendors/status)
   */
  async getMyVendorStatus(usuarioId: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { usuarioId },
      include: {
        tienda: true,
        documentos: true,
        balance: true,
      },
    });

    if (!vendedor) {
      throw new NotFoundException('El usuario no posee expediente de vendedor registrado.');
    }

    return vendedor;
  }

  /**
   * Subir un documento adicional al expediente KYC
   */
  async uploadKycDocument(vendedorId: string, usuarioId: string, dto: KycDocumentDto) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id: vendedorId },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor no encontrado.');
    }

    if (vendedor.usuarioId !== usuarioId) {
      throw new ForbiddenException('No tiene permisos para modificar este expediente.');
    }

    return this.prisma.documentoVendedor.create({
      data: {
        vendedorId,
        tipoDocumento: dto.tipoDocumento.toUpperCase().trim(),
        numeroDocumento: dto.numeroDocumento.trim(),
        archivoUrl: dto.archivoUrl.trim(),
        estado: EstadoDocumento.PENDIENTE,
      },
    });
  }

  /**
   * Revisión administrativa de un documento KYC individual
   */
  async reviewKycDocument(documentId: string, reviewerId: string, dto: ReviewKycDocumentDto) {
    const doc = await this.prisma.documentoVendedor.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Documento KYC no encontrado.');
    }

    return this.prisma.documentoVendedor.update({
      where: { id: documentId },
      data: {
        estado: dto.estado,
        observacionesRevision: dto.observacionesRevision?.trim(),
        revisadoPorUsuarioId: reviewerId,
        fechaRevision: new Date(),
      },
    });
  }

  /**
   * Revisión y resolución de estado global de un vendedor (Aprobación, Rechazo, Suspensión)
   */
  async reviewVendorStatus(vendedorId: string, reviewerId: string, dto: ReviewVendorStatusDto) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id: vendedorId },
      include: { tienda: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor no encontrado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        estado: dto.estado,
      };

      if (dto.porcentajeComisionBase !== undefined) {
        updateData.porcentajeComisionBase = dto.porcentajeComisionBase;
      }

      if (dto.estado === EstadoVendedor.APROBADO) {
        updateData.fechaAprobacion = new Date();

        // 1. Asignar rol VENDEDOR al usuario
        const vendedorRol = await tx.rol.findUnique({
          where: { slug: 'VENDEDOR' },
        });

        if (vendedorRol) {
          await tx.usuarioRol.upsert({
            where: {
              usuarioId_rolId: {
                usuarioId: vendedor.usuarioId,
                rolId: vendedorRol.id,
              },
            },
            update: {},
            create: {
              usuarioId: vendedor.usuarioId,
              rolId: vendedorRol.id,
            },
          });
        }

        // 2. Inicializar BalanceVendedor si aún no existe
        await tx.balanceVendedor.upsert({
          where: { vendedorId: vendedor.id },
          update: {},
          create: {
            vendedorId: vendedor.id,
            saldoPendiente: 0.0,
            saldoDisponible: 0.0,
            saldoRetirado: 0.0,
          },
        });
      }

      const updated = await tx.vendedor.update({
        where: { id: vendedorId },
        data: updateData,
        include: {
          tienda: true,
          documentos: true,
          balance: true,
        },
      });

      this.logger.log(`Vendedor ${vendedorId} actualizado a estado ${dto.estado} por admin ${reviewerId}`);
      return updated;
    });
  }

  /**
   * Listar vendedores con filtros y paginación para administración
   */
  async findAll(query: FilterVendorsDto) {
    const { estado, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (estado) {
      where.estado = estado;
    }

    if (search) {
      where.OR = [
        { razonSocial: { contains: search, mode: 'insensitive' } },
        { nombreComercial: { contains: search, mode: 'insensitive' } },
        { identificacionFiscal: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.vendedor.count({ where }),
      this.prisma.vendedor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaSolicitud: 'desc' },
        include: {
          tienda: true,
          documentos: true,
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
