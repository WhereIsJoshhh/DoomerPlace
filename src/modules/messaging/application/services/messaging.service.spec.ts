import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { PrismaService } from '@core/database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      producto: {
        findUnique: jest.fn(),
      },
      preguntaProducto: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      respuestaPregunta: {
        create: jest.fn(),
      },
      tienda: {
        findUnique: jest.fn(),
      },
      conversacion: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      mensaje: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  describe('askQuestion', () => {
    it('debe registrar la pregunta de un usuario', async () => {
      prisma.producto.findUnique.mockResolvedValue({ id: 'prod-1' });
      prisma.preguntaProducto.create.mockResolvedValue({ id: 'q-1', pregunta: '¿Talla M?' });

      const res = await service.askQuestion('user-1', {
        productoId: 'prod-1',
        pregunta: '¿Talla M?',
      });

      expect(prisma.preguntaProducto.create).toHaveBeenCalled();
      expect(res.id).toBe('q-1');
    });
  });

  describe('answerQuestion', () => {
    it('debe prohibir responder si el usuario no es el vendedor de la tienda ni admin', async () => {
      prisma.preguntaProducto.findUnique.mockResolvedValue({
        id: 'q-1',
        producto: {
          tienda: { vendedor: { usuarioId: 'vendor-owner' } },
        },
      });

      await expect(
        service.answerQuestion('other-user', {
          preguntaId: 'q-1',
          respuesta: 'Respuesta inválida',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe registrar respuesta si el usuario es el vendedor de la tienda', async () => {
      prisma.preguntaProducto.findUnique.mockResolvedValue({
        id: 'q-1',
        producto: {
          tienda: { vendedor: { usuarioId: 'vendor-owner' } },
        },
      });

      prisma.respuestaPregunta.create.mockResolvedValue({ id: 'ans-1', respuesta: 'Respuesta oficial' });

      const res = await service.answerQuestion('vendor-owner', {
        preguntaId: 'q-1',
        respuesta: 'Respuesta oficial',
      });

      expect(prisma.respuestaPregunta.create).toHaveBeenCalled();
      expect(res.id).toBe('ans-1');
    });
  });

  describe('sendMessage', () => {
    it('debe crear conversación si no existe y registrar mensaje', async () => {
      prisma.tienda.findUnique.mockResolvedValue({ id: 'store-1' });
      prisma.conversacion.findFirst.mockResolvedValue(null);
      prisma.conversacion.create.mockResolvedValue({ id: 'conv-1' });
      prisma.mensaje.create.mockResolvedValue({ id: 'msg-1', contenido: 'Hola' });

      const res = await service.sendMessage('user-1', {
        tiendaId: 'store-1',
        contenido: 'Hola',
      });

      expect(prisma.conversacion.create).toHaveBeenCalled();
      expect(prisma.mensaje.create).toHaveBeenCalled();
      expect(res.id).toBe('msg-1');
    });
  });
});
