import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@core/database/prisma.service';
import { ExternalProviderName, ExternalProductDTO, InternalProductPayload, SyncResultDTO } from './external-catalog.dto';
import { ExternalCatalogProvider, ExternalProviderStatusDTO } from './external-catalog.provider';

export const EXTERNAL_CATALOG_PROVIDERS = 'EXTERNAL_CATALOG_PROVIDERS';

@Injectable()
export class ExternalCatalogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExternalCatalogService.name);
  private timer?: NodeJS.Timeout;
  private syncing = false;
  private readonly providerMap: Map<ExternalProviderName, ExternalCatalogProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EXTERNAL_CATALOG_PROVIDERS) providers: ExternalCatalogProvider[],
  ) { this.providerMap = new Map(providers.map((provider) => [provider.name, provider])); }

  onModuleInit() {
    const hours = Number(this.config.get('EXTERNAL_CATALOG_SYNC_INTERVAL_HOURS') || 0);
    if (hours > 0) {
      this.timer = setInterval(() => void this.sync().catch((error) => this.logger.error(`Sincronización externa programada: ${error.message}`)), hours * 60 * 60 * 1000);
      this.timer.unref?.();
    }
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private provider(name: ExternalProviderName) {
    const provider = this.providerMap.get(name);
    if (!provider) throw new BadRequestException(`Proveedor no registrado: ${name}`);
    return provider;
  }

  private async resolveStore(provider: ExternalProviderName, tiendaDestinoId?: string) {
    const storeId = tiendaDestinoId || this.config.get<string>(provider === ExternalProviderName.AMAZON ? 'AMAZON_INTEGRATION_STORE_ID' : 'MERCARI_INTEGRATION_STORE_ID');
    const categoriaId = this.config.get<string>('EXTERNAL_CATALOG_DEFAULT_CATEGORY_ID') || this.config.get<string>('AMAZON_DEFAULT_CATEGORY_ID');
    if (!storeId || !categoriaId) throw new ServiceUnavailableException('Configura la tienda de integración y EXTERNAL_CATALOG_DEFAULT_CATEGORY_ID con IDs existentes.');
    const [store, category] = await Promise.all([this.prisma.tienda.findUnique({ where: { id: storeId } }), this.prisma.categoria.findUnique({ where: { id: categoriaId } })]);
    if (!store || !category) throw new ServiceUnavailableException('La tienda destino o categoría configurada no existe.');
    return { tiendaId: store.id, categoriaId: category.id };
  }

  async importProduct(providerName: ExternalProviderName, externalId: string, tiendaDestinoId?: string) {
    const provider = this.provider(providerName);
    const dto: ExternalProductDTO = await provider.fetchProductDetails(externalId);
    const payload: InternalProductPayload = provider.mapToInternalSchema(dto);
    const { tiendaId, categoriaId } = await this.resolveStore(providerName, tiendaDestinoId);
    return this.persist(providerName, dto, payload, tiendaId, categoriaId);
  }

  async batchImport(providerName: ExternalProviderName, items: string[], tiendaDestinoId?: string) {
    const results = [];
    for (const externalId of [...new Set(items.map((value) => value.trim()).filter(Boolean))]) {
      try { results.push({ externalId, ...(await this.importProduct(providerName, externalId, tiendaDestinoId)) }); }
      catch (error) {
        this.logger.warn(`Importación ${providerName}/${externalId} falló: ${error.message}`);
        results.push({ externalId, status: 'failed', message: error.message });
      }
    }
    return { provider: providerName, total: results.length, results };
  }

  private async persist(provider: ExternalProviderName, dto: ExternalProductDTO, payload: InternalProductPayload, tiendaId: string, categoriaId: string) {
    const externalId = dto.externalId;
    const key = `${provider}-${externalId}`.toUpperCase().replace(/[^A-Z0-9_-]/g, '-').slice(0, 80);
    const slug = `ext-${provider.toLowerCase()}-${externalId.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const brandName = payload.marca?.trim();
    const brandSlug = brandName ? `ext-${brandName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}` : undefined;
    const brand = brandName && brandSlug ? await this.prisma.marca.upsert({ where: { slug: brandSlug }, update: {}, create: { nombre: brandName, slug: brandSlug } }) : null;
    const attributes = [];
    for (const entry of payload.atributos) {
      let attribute = await this.prisma.atributo.findFirst({ where: { categoriaId, nombre: entry.name } });
      if (!attribute) attribute = await this.prisma.atributo.create({ data: { categoriaId, nombre: entry.name, esVariante: true, esFiltrable: true } });
      let value = await this.prisma.valorAtributo.findFirst({ where: { atributoId: attribute.id, valor: entry.value } });
      if (!value) value = await this.prisma.valorAtributo.create({ data: { atributoId: attribute.id, valor: entry.value } });
      attributes.push({ atributoId: attribute.id, valorAtributoId: value.id });
    }
    const imageData = payload.imagenes.slice(0, 10);
    const existing = await this.prisma.externalProductImport.findUnique({ where: { provider_externalId: { provider, externalId } }, include: { producto: { include: { variantes: true } } } });
    const amount = Number.isFinite(payload.precio) ? Math.max(0, payload.precio) : 0;
    const externalData = { originalUrl: payload.originalUrl, sellerName: payload.vendedorOriginal, condition: payload.condicion, available: dto.available, externalPrice: amount, currency: payload.moneda, lastSyncedAt: new Date(), lastSyncError: null };

    if (existing) {
      const variant = existing.producto.variantes[0];
      await this.prisma.$transaction(async (tx) => {
        await tx.producto.update({ where: { id: existing.productoId }, data: { nombre: payload.nombre, descripcionCorta: payload.descripcionCorta, descripcionLarga: payload.descripcionLarga, marcaId: brand?.id } });
        await tx.externalProductImport.update({ where: { id: existing.id }, data: externalData });
        if (variant) {
          await tx.productoVariante.update({ where: { id: variant.id }, data: { precio: amount } });
          for (const attr of attributes) await tx.varianteAtributo.upsert({ where: { varianteId_atributoId: { varianteId: variant.id, atributoId: attr.atributoId } }, update: { valorAtributoId: attr.valorAtributoId }, create: { varianteId: variant.id, ...attr } });
        }
        for (let i = 0; i < imageData.length; i++) {
          const imageId = `ext-${key}-${i}`;
          await tx.productoImagen.upsert({ where: { id: imageId }, update: { url: imageData[i].url, altText: imageData[i].altText || payload.nombre }, create: { id: imageId, productoId: existing.productoId, url: imageData[i].url, altText: imageData[i].altText || payload.nombre, orden: i, esPrincipal: i === 0 } });
        }
      });
      return { status: 'updated', provider, externalId, productoId: existing.productoId, originalUrl: payload.originalUrl };
    }

    const product = await this.prisma.producto.create({ data: {
      tiendaId, categoriaId, marcaId: brand?.id, nombre: payload.nombre, slug,
      descripcionCorta: payload.descripcionCorta, descripcionLarga: payload.descripcionLarga,
      skuBase: key, estado: 'ACTIVO', tipoProducto: 'SIMPLE',
      variantes: { create: { sku: `${key}-1`, nombreVariante: payload.nombre.slice(0, 100), precio: amount, estado: true, inventario: { create: { stockFisico: 0, stockDisponible: payload.stockDisponible, permitirSobreventa: false } }, atributos: { create: attributes } } },
      imagenes: { create: imageData.map((image, i) => ({ id: `ext-${key}-${i}`, url: image.url, altText: image.altText || payload.nombre, orden: i, esPrincipal: i === 0 })) },
      externalImports: { create: { provider, externalId, ...externalData } },
    } });
    return { status: 'imported', provider, externalId, productoId: product.id, originalUrl: payload.originalUrl };
  }

  async sync(providerName?: ExternalProviderName, externalIds?: string[]) {
    if (this.syncing) return { status: 'already_running', results: [] };
    this.syncing = true;
    try {
      const tracked = await this.prisma.externalProductImport.findMany({ where: { ...(providerName ? { provider: providerName } : {}), ...(externalIds?.length ? { externalId: { in: externalIds } } : {}) }, select: { provider: true, externalId: true, id: true, productoId: true } });
      const grouped = new Map<string, typeof tracked>();
      for (const item of tracked) grouped.set(item.provider, [...(grouped.get(item.provider) || []), item]);
      const results: SyncResultDTO[] = [];
      for (const [name, records] of grouped) {
        const currentProvider = this.provider(name as ExternalProviderName);
        for (let offset = 0; offset < records.length; offset += 50) {
          const batch = records.slice(offset, offset + 50);
          let batchResults: SyncResultDTO[];
          try { batchResults = await currentProvider.syncPriceAndStock(batch.map((record) => record.externalId)); }
          catch (error) {
            this.logger.error(`Sync ${name} falló: ${error.message}`);
            batchResults = batch.map((record) => ({ provider: name as ExternalProviderName, externalId: record.externalId, status: 'failed' as const, message: error.message }));
          }
          for (const result of batchResults) {
          const record = records.find((entry) => entry.externalId === result.externalId);
          if (!record) continue;
          if (result.status === 'synced') {
            await this.prisma.$transaction(async (tx) => {
              await tx.externalProductImport.update({ where: { id: record.id }, data: { available: result.available ?? false, externalPrice: result.price, lastSyncedAt: new Date(), lastSyncError: null } });
              if (result.price !== undefined) await tx.productoVariante.updateMany({ where: { productoId: record.productoId }, data: { precio: result.price } });
            });
          } else {
            await this.prisma.externalProductImport.update({ where: { id: record.id }, data: { lastSyncError: result.message || result.status } });
          }
          }
          results.push(...batchResults);
        }
      }
      return { status: 'completed', total: results.length, results };
    } finally { this.syncing = false; }
  }

  async providersStatus(): Promise<ExternalProviderStatusDTO[]> {
    return Promise.all([...this.providerMap.values()].map((provider) => provider.getStatus()));
  }
}
