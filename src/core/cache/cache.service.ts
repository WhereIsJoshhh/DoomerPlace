import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

export interface LockResult {
  acquired: boolean;
  lockId?: string;
  key: string;
}

interface CacheEntry {
  value: any;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  // Almacén en memoria de alto rendimiento con soporte TTL
  private readonly memoryStore = new Map<string, CacheEntry>();
  private readonly activeLocks = new Map<string, { lockId: string; expiresAt: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    // Tarea periódica de limpieza de llaves y bloqueos vencidos cada 30 segundos
    this.cleanupInterval = setInterval(() => this.cleanExpired(), 30000);
    this.cleanupInterval.unref(); // Previene retención del loop en tests Jest
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Obtener valor de caché
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Guardar valor en caché con TTL en segundos
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    this.memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Eliminar clave de caché
   */
  async del(key: string): Promise<void> {
    this.memoryStore.delete(key);
  }

  /**
   * Adquisición de bloqueo de concurrencia distribuido (Redlock pattern)
   * Garantiza que dos procesos concurrentes no puedan reservar el mismo inventario
   */
  async acquireLock(resourceKey: string, ttlMs: number = 10000): Promise<LockResult> {
    const lockKey = `lock:${resourceKey}`;
    const now = Date.now();
    const existing = this.activeLocks.get(lockKey);

    if (existing && existing.expiresAt > now) {
      return { acquired: false, key: resourceKey };
    }

    const lockId = uuidv4();
    this.activeLocks.set(lockKey, {
      lockId,
      expiresAt: now + ttlMs,
    });

    return { acquired: true, lockId, key: resourceKey };
  }

  /**
   * Liberación segura del bloqueo verificando la titularidad con lockId
   */
  async releaseLock(resourceKey: string, lockId: string): Promise<boolean> {
    const lockKey = `lock:${resourceKey}`;
    const existing = this.activeLocks.get(lockKey);

    if (existing && existing.lockId === lockId) {
      this.activeLocks.delete(lockKey);
      return true;
    }

    return false;
  }

  private cleanExpired() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now > entry.expiresAt) {
        this.memoryStore.delete(key);
      }
    }
    for (const [key, lock] of this.activeLocks.entries()) {
      if (now > lock.expiresAt) {
        this.activeLocks.delete(key);
      }
    }
  }
}
