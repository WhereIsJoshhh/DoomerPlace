import { Test, TestingModule } from '@nestjs/testing';
import { AddressesService } from './addresses.service';
import { PrismaService } from '@core/database/prisma.service';
import { TipoDireccion } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateAddressDto } from '../dtos/create-address.dto';

describe('AddressesService', () => {
  let service: AddressesService;
  let prisma: any;

  const mockAddress = {
    id: 'addr-1',
    usuarioId: 'user-1',
    tipo: TipoDireccion.ENVIO,
    alias: 'Casa',
    receptor: 'Carlos',
    telefono: '+525512345678',
    pais: 'México',
    departamento: 'CDMX',
    ciudad: 'CDMX',
    calle: 'Av. Siempre Viva 123',
    codigoPostal: '01000',
    esPrincipal: true,
    fechaRegistro: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      direccion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findByUser', () => {
    it('debe listar las direcciones de un usuario ordenadas por esPrincipal', async () => {
      prisma.direccion.findMany.mockResolvedValue([mockAddress]);

      const result = await service.findByUser('user-1');

      expect(result).toHaveLength(1);
      expect(prisma.direccion.findMany).toHaveBeenCalledWith({
        where: { usuarioId: 'user-1' },
        orderBy: [{ esPrincipal: 'desc' }, { fechaRegistro: 'desc' }],
      });
    });
  });

  describe('create', () => {
    it('debe marcar como principal si es la primera dirección registrada', async () => {
      prisma.direccion.count.mockResolvedValue(0);
      prisma.direccion.create.mockResolvedValue(mockAddress);

      const dto: CreateAddressDto = {
        tipo: TipoDireccion.ENVIO,
        receptor: 'Carlos',
        telefono: '+525512345678',
        pais: 'México',
        departamento: 'CDMX',
        ciudad: 'CDMX',
        calle: 'Av. Siempre Viva 123',
        codigoPostal: '01000',
      };

      const result = await service.create('user-1', dto);

      expect(dto.esPrincipal).toBe(true);
      expect(result).toEqual(mockAddress);
    });

    it('debe desmarcar otras direcciones si esPrincipal viene como true', async () => {
      prisma.direccion.updateMany.mockResolvedValue({ count: 1 });
      prisma.direccion.create.mockResolvedValue(mockAddress);

      const dto = {
        tipo: TipoDireccion.ENVIO,
        receptor: 'Carlos',
        telefono: '+525512345678',
        pais: 'México',
        departamento: 'CDMX',
        ciudad: 'CDMX',
        calle: 'Av. Siempre Viva 123',
        codigoPostal: '01000',
        esPrincipal: true,
      };

      await service.create('user-1', dto);

      expect(prisma.direccion.updateMany).toHaveBeenCalledWith({
        where: {
          usuarioId: 'user-1',
          tipo: TipoDireccion.ENVIO,
          esPrincipal: true,
        },
        data: {
          esPrincipal: false,
        },
      });
    });
  });

  describe('findOne', () => {
    it('debe lanzar ForbiddenException si la dirección no pertenece al usuario', async () => {
      prisma.direccion.findUnique.mockResolvedValue({
        ...mockAddress,
        usuarioId: 'otro-usuario',
      });

      await expect(service.findOne('addr-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar NotFoundException si la dirección no existe', async () => {
      prisma.direccion.findUnique.mockResolvedValue(null);

      await expect(service.findOne('no-existe', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
