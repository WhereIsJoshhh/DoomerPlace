import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '@core/database/prisma.service';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      mensajeContacto: {
        create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SupportService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('guarda el mensaje de contacto normalizando el correo', async () => {
    const result = await service.createContactMessage({
      nombre: ' Ana ',
      email: 'ANA@Example.com',
      mensaje: 'Necesito ayuda con un producto.',
    });

    expect(result.id).toBe('msg-1');
    const data = prisma.mensajeContacto.create.mock.calls[0][0].data;
    expect(data.nombre).toBe('Ana');
    expect(data.email).toBe('ana@example.com');
    expect(data.asunto).toBeNull();
  });
});
