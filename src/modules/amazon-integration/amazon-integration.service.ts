import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@core/database/prisma.service';
import { AmazonCreatorsClient } from './amazon-creators.client';
import { AmazonImportResult } from './amazon.dto';

const path = (obj: any, key: string) => key.split('.').reduce((value, part) => value?.[part], obj);
const textValue = (value: any): string | undefined => typeof value === 'string' ? value : value?.displayValue || value?.value || value?.amount?.toString();

@Injectable()
export class AmazonIntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AmazonIntegrationService.name);
  private timer?: NodeJS.Timeout;
  private syncing = false;

  constructor(private readonly prisma: PrismaService, private readonly amazon: AmazonCreatorsClient, private readonly config: ConfigService) {}

  onModuleInit() {
    const hours = Number(this.config.get('AMAZON_SYNC_INTERVAL_HOURS') || 0);
    if (hours > 0) {
      this.timer = setInterval(() => void this.syncPriceStock().catch((error) => this.logger.error(`Sync automático falló: ${error.message}`)), hours * 60 * 60 * 1000);
      this.timer.unref?.();
    }
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  private getStoreAndCategory() {
    const tiendaId = this.config.get<string>('AMAZON_INTEGRATION_STORE_ID');
    const categoriaId = this.config.get<string>('AMAZON_DEFAULT_CATEGORY_ID');
    if (!tiendaId || !categoriaId) {
      throw new ServiceUnavailableException('Configura AMAZON_INTEGRATION_STORE_ID y AMAZON_DEFAULT_CATEGORY_ID con IDs existentes antes de importar.');
    }
    return { tiendaId, categoriaId };
  }

  async search(keywords: string) {
    const response: any = await this.amazon.searchItems(keywords.trim());
    return response.searchResult?.items || [];
  }

  async importAsins(asins: string[]): Promise<AmazonImportResult[]> {
    const unique = [...new Set(asins.map((asin) => asin.trim().toUpperCase()))];
    if (!unique.length || unique.length > 10) throw new ServiceUnavailableException('Envía de 1 a 10 ASINs por solicitud.');
    const { tiendaId, categoriaId } = this.getStoreAndCategory();
    const [store, category] = await Promise.all([
      this.prisma.tienda.findUnique({ where: { id: tiendaId } }),
      this.prisma.categoria.findUnique({ where: { id: categoriaId } }),
    ]);
    if (!store || !category) throw new ServiceUnavailableException('La tienda o categoría configurada para Amazon no existe en la base de datos.');

    const response: any = await this.amazon.getItems(unique);
    const items: any[] = response.itemsResult?.items || [];
    const results: AmazonImportResult[] = [];
    for (const asin of unique) {
      const item = items.find((entry) => entry.asin === asin);
      if (!item) {
        results.push({ asin, status: 'failed', message: response.errors?.find((err: any) => err.itemId === asin)?.message || 'Amazon no devolvió este ASIN.' });
        continue;
      }
      try { results.push(await this.persistItem(item, tiendaId, categoriaId)); }
      catch (error) {
        this.logger.error(`No se pudo importar ${asin}: ${error.message}`);
        results.push({ asin, status: 'failed', message: 'No se pudo guardar el producto en la base de datos.' });
      }
    }
    return results;
  }

  private async persistItem(item: any, tiendaId: string, categoriaId: string): Promise<AmazonImportResult> {
    const asin = String(item.asin).toUpperCase();
    const title = textValue(path(item, 'itemInfo.title')) || `Amazon ${asin}`;
    const brandName = textValue(path(item, 'itemInfo.byLineInfo.brand'));
    const description = (path(item, 'itemInfo.features.displayValues') || []).filter((v: any) => typeof v === 'string').join('\n');
    const image = path(item, 'images.primary.large.url') || path(item, 'images.primary.medium.url');
    const listing = item.offersV2?.listings?.[0] || item.offers?.listings?.[0];
    const amount = Number(listing?.price?.money?.amount ?? listing?.price?.amount);
    const price = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    const currency = listing?.price?.money?.currency || listing?.price?.currency;
    const availability = textValue(listing?.availability?.type) || textValue(listing?.availability?.message) || '';
    const available = Boolean(listing) && /in[ _-]?stock|available/i.test(availability) && !/unavailable|out of stock/i.test(availability);
    const affiliateUrl = item.detailPageURL || `https://${this.amazon.marketplace}/dp/${asin}?tag=${encodeURIComponent(this.amazon.partnerTag)}`;
    const existing = await this.prisma.amazonProductImport.findUnique({ where: { asin }, include: { producto: { include: { variantes: true } } } });

    const variantAttributes: Array<{ atributoId: string; valorAtributoId: string }> = [];
    for (const [name, rawValue] of [['Color', path(item, 'itemInfo.productInfo.color')], ['Talla', path(item, 'itemInfo.productInfo.size')]] as const) {
      const value = textValue(rawValue);
      if (!value) continue;
      let attribute = await this.prisma.atributo.findFirst({ where: { categoriaId, nombre: name } });
      if (!attribute) attribute = await this.prisma.atributo.create({ data: { categoriaId, nombre: name, esVariante: true, esFiltrable: true } });
      let attributeValue = await this.prisma.valorAtributo.findFirst({ where: { atributoId: attribute.id, valor: value } });
      if (!attributeValue) attributeValue = await this.prisma.valorAtributo.create({ data: { atributoId: attribute.id, valor: value } });
      variantAttributes.push({ atributoId: attribute.id, valorAtributoId: attributeValue.id });
    }

    const brand = brandName ? await this.prisma.marca.upsert({
      where: { slug: `amazon-${brandName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}` },
      update: {},
      create: { nombre: brandName, slug: `amazon-${brandName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}` },
    }) : null;

    let productoId: string;
    let status: 'imported' | 'updated';
    if (existing) {
      productoId = existing.productoId;
      status = 'updated';
      await this.prisma.$transaction(async (tx) => {
        await tx.producto.update({ where: { id: productoId }, data: { nombre: title, descripcionLarga: description || undefined, marcaId: brand?.id } });
        if (image) await tx.productoImagen.upsert({
          where: { id: `amazon-${asin}` },
          update: { url: image, altText: title },
          create: { id: `amazon-${asin}`, productoId, url: image, altText: title, esPrincipal: true },
        });
        const variant = existing.producto.variantes[0];
        if (variant) {
          await tx.productoVariante.update({ where: { id: variant.id }, data: { precio: price, nombreVariante: title.slice(0, 100) } });
          for (const attribute of variantAttributes) await tx.varianteAtributo.upsert({
            where: { varianteId_atributoId: { varianteId: variant.id, atributoId: attribute.atributoId } },
            update: { valorAtributoId: attribute.valorAtributoId },
            create: { varianteId: variant.id, ...attribute },
          });
        }
        await tx.amazonProductImport.update({ where: { asin }, data: { affiliateUrl, available, externalPrice: price, currency, lastSyncedAt: new Date(), lastSyncError: null } });
      });
    } else {
      status = 'imported';
      const slug = `amazon-${asin.toLowerCase()}`;
      const product = await this.prisma.producto.create({
        data: {
          tiendaId, categoriaId, marcaId: brand?.id, nombre: title, slug,
          descripcionCorta: `Producto listado en Amazon (ASIN ${asin}). Compra externa mediante enlace afiliado.`,
          descripcionLarga: description || undefined, skuBase: `AMZ-${asin}`, estado: 'ACTIVO', tipoProducto: 'SIMPLE',
          variantes: { create: { sku: `AMZ-${asin}-1`, nombreVariante: title.slice(0, 100), precio: price, estado: true, inventario: { create: { stockFisico: 0, stockDisponible: 0, permitirSobreventa: false } }, atributos: { create: variantAttributes } } },
          ...(image ? { imagenes: { create: { id: `amazon-${asin}`, url: image, altText: title, esPrincipal: true } } } : {}),
          amazonImport: { create: { asin, affiliateUrl, available, externalPrice: price, currency, lastSyncedAt: new Date() } },
        },
      });
      productoId = product.id;
    }
    return { asin, productoId, title, affiliateUrl, status };
  }

  async syncPriceStock() {
    if (this.syncing) return { status: 'already-running', synced: 0 };
    this.syncing = true;
    try {
      const rows = await this.prisma.amazonProductImport.findMany({ select: { asin: true } });
      let synced = 0;
      const failed: string[] = [];
      for (let i = 0; i < rows.length; i += 10) {
        const batch = rows.slice(i, i + 10).map((row) => row.asin);
        try {
          const result: any = await this.amazon.getItems(batch);
          const items: any[] = result.itemsResult?.items || [];
          for (const item of items) {
            try { const config = this.getStoreAndCategory(); await this.persistItem(item, config.tiendaId, config.categoriaId); synced++; }
            catch (error) { this.logger.error(`Sync ASIN ${item.asin}: ${error.message}`); failed.push(item.asin); }
          }
          for (const asin of batch) if (!items.some((item) => item.asin === asin)) failed.push(asin);
        } catch (error) { this.logger.error(`Sync Amazon batch: ${error.message}`); failed.push(...batch); }
      }
      return { status: 'completed', synced, failed };
    } finally { this.syncing = false; }
  }
}
