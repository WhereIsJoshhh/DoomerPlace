import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { PrismaService } from '@core/database/prisma.service';
import { EstadoVendedor, TipoPersona, EstadoDocumento } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('VendorsService', () => {
  let service: VendorsService;
  let prisma: any;

  const mockVendor = {
    id: 'vendor-1',
    usuarioId: 'user-1',
    razonSocial: 'Comercializadora Doomer S.A.C.',
    nombreComercial: 'Doomer Store',
    identificacionFiscal: '20601234567',
    tipoPersona: TipoPersona.JURIDICA,
    telefonoComercial: '+525512345678',
    emailComercial: 'contacto@doomer.com',
    estado: EstadoVendedor.PENDIENTE,
    porcentajeComisionBase: 10.0,
    calificacionPromedio: 0.0,
    fechaSolicitud: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      vendedor: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      tienda: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      documentoVendedor: {
        findUnique: jest.fn(),
        createMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      rol: {
        findUnique: jest.fn(),
      },
      usuarioRol: {
        upsert: jest.fn(),
      },
      balanceVendedor: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('applyForOnboarding', () => {
    it('debe crear solicitud de vendedor, tienda y documentos en estado PENDIENTE', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);
      prisma.tienda.findUnique.mockResolvedValue(null);
      prisma.vendedor.create.mockResolvedValue(mockVendor);
      prisma.tienda.create.mockResolvedValue({ id: 'tienda-1', nombre: 'Doomer Store', slug: 'doomer-store' });
      prisma.documentoVendedor.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        razonSocial: 'Comercializadora Doomer S.A.C.',
        nombreComercial: 'Doomer Store',
        identificacionFiscal: '20601234567',
        tipoPersona: TipoPersona.JURIDICA,
        telefonoComercial: '+525512345678',
        emailComercial: 'contacto@doomer.com',
        tiendaNombre: 'Doomer Store',
        documentos: [
          {
            tipoDocumento: 'RUC',
            numeroDocumento: '20601234567',
            archivoUrl: 'https://cdn.com/doc.pdf',
          },
        ],
      };

      await service.applyForOnboarding('user-1', dto);

      expect(prisma.vendedor.create).toHaveBeenCalled();
      expect(prisma.tienda.create).toHaveBeenCalled();
      expect(prisma.documentoVendedor.createMany).toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el usuario ya tiene un expediente de vendedor', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(mockVendor);

      const dto = {
        razonSocial: 'Comercializadora Doomer S.A.C.',
        nombreComercial: 'Doomer Store',
        identificacionFiscal: '20601234567',
        tipoPersona: TipoPersona.JURIDICA,
        telefonoComercial: '+525512345678',
        emailComercial: 'contacto@doomer.com',
        tiendaNombre: 'Doomer Store',
        documentos: [],
      };

      await expect(service.applyForOnboarding('user-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('reviewVendorStatus', () => {
    it('al aprobar el vendedor debe actualizar estado, asignar rol VENDEDOR e inicializar balance', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...mockVendor,
        tienda: { id: 'tienda-1' },
      });
      prisma.rol.findUnique.mockResolvedValue({ id: 'role-vendedor-id', slug: 'VENDEDOR' });
      prisma.vendedor.update.mockResolvedValue({
        ...mockVendor,
        estado: EstadoVendedor.APROBADO,
      });

      const result = await service.reviewVendorStatus('vendor-1', 'admin-id', {
        estado: EstadoVendedor.APROBADO,
        porcentajeComisionBase: 8.5,
      });

      expect(prisma.usuarioRol.upsert).toHaveBeenCalled();
      expect(prisma.balanceVendedor.upsert).toHaveBeenCalled();
      expect(prisma.vendedor.update).toHaveBeenCalled();
      expect(result.estado).toBe(EstadoVendedor.APROBADO);
    });

    it('debe lanzar NotFoundException si el vendedor no existe', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewVendorStatus('inexistente', 'admin-id', {
          estado: EstadoVendedor.APROBADO,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
