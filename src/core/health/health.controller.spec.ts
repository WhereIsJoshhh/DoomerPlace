import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '@core/database/prisma.service';
import { CacheService } from '@core/cache/cache.service';
import { HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: any;
  let cacheService: any;

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };
    cacheService = {
      set: jest.fn().mockResolvedValue(true),
      get: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('debe responder 200 OK cuando los servicios están UP', async () => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await controller.checkHealth(res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'OK',
        services: expect.objectContaining({
          database: { status: 'UP' },
          cache: { status: 'UP' },
        }),
      }),
    );
  });

  it('debe responder 503 SERVICE_UNAVAILABLE si la base de datos no responde', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection lost'));

    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await controller.checkHealth(res);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERROR',
        services: expect.objectContaining({
          database: expect.objectContaining({ status: 'DOWN', error: 'Connection lost' }),
        }),
      }),
    );
  });
});
