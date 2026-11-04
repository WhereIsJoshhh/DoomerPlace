import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@core/decorators/public.decorator';
import { PrismaService } from '@core/database/prisma.service';
import { CacheService } from '@core/cache/cache.service';
import { Response } from 'express';

@ApiTags('Salud y Disponibilidad')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Verificar estado del servicio, base de datos y memoria' })
  @ApiResponse({ status: 200, description: 'Servicio en óptimo funcionamiento (Liveness/Readiness).' })
  @ApiResponse({ status: 503, description: 'Uno o más servicios dependientes no responden.' })
  async checkHealth(@Res() res: Response) {
    const startTime = Date.now();
    let dbStatus = 'UP';
    let dbError: string | null = null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      dbStatus = 'DOWN';
      dbError = err.message;
    }

    // Cache probe
    let cacheStatus = 'UP';
    try {
      await this.cacheService.set('health:probe', { ok: true }, 5);
      const probe = await this.cacheService.get('health:probe');
      if (!probe) cacheStatus = 'DEGRADED';
    } catch (err) {
      cacheStatus = 'DOWN';
    }

    const memoryUsage = process.memoryUsage();
    const isHealthy = dbStatus === 'UP';

    const healthData = {
      status: isHealthy ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
      services: {
        database: {
          status: dbStatus,
          ...(dbError && { error: dbError }),
        },
        cache: {
          status: cacheStatus,
        },
      },
      system: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
    };

    return res
      .status(isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(healthData);
  }
}
