import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '@core/database/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      auditoria: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      configuracion: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    it('debe registrar un evento de auditoría', async () => {
      prisma.auditoria.create.mockResolvedValue({ id: 'aud-1' });

      await service.log({
        modulo: 'ORDERS',
        accion: 'CREATE',
        entidad: 'Pedido',
        entidadId: 'ord-1',
      });

      expect(prisma.auditoria.create).toHaveBeenCalled();
    });
  });

  describe('setConfig', () => {
    it('debe guardar o actualizar una variable de configuración global', async () => {
      prisma.configuracion.upsert.mockResolvedValue({ clave: 'RESERVATION_TTL', valor: '15' });

      const res = await service.setConfig({
        clave: 'RESERVATION_TTL',
        valor: '15',
      });

      expect(prisma.configuracion.upsert).toHaveBeenCalled();
      expect(res.clave).toBe('RESERVATION_TTL');
    });
  });
});
