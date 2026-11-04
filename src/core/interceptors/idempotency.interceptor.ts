import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

interface CachedResponse {
  statusCode: number;
  data: any;
  expiresAt: number;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  // Almacenamiento en memoria con TTL (Reemplazable por Redis en producción)
  private readonly cache = new Map<string, CachedResponse>();
  private readonly inFlight = new Set<string>();
  private readonly ttlMs = 15 * 60 * 1000; // 15 minutos

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = request.headers['idempotency-key'] as string;

    if (!idempotencyKey || !['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return next.handle();
    }

    const now = Date.now();
    const cached = this.cache.get(idempotencyKey);

    if (cached) {
      if (cached.expiresAt > now) {
        return of(cached.data);
      }
      this.cache.delete(idempotencyKey);
    }

    if (this.inFlight.has(idempotencyKey)) {
      throw new ConflictException(
        'Una petición idéntica ya se encuentra en procesamiento con esta Idempotency-Key.',
      );
    }

    this.inFlight.add(idempotencyKey);

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.cache.set(idempotencyKey, {
            statusCode: context.switchToHttp().getResponse().statusCode,
            data,
            expiresAt: Date.now() + this.ttlMs,
          });
          this.inFlight.delete(idempotencyKey);
        },
        error: () => {
          this.inFlight.delete(idempotencyKey);
        },
      }),
    );
  }
}
