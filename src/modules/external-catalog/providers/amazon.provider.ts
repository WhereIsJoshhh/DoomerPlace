import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmazonCreatorsClient } from '@modules/amazon-integration/amazon-creators.client';
import { ExternalProductDTO, ExternalProviderName, InternalProductPayload, SyncResultDTO } from '../external-catalog.dto';
import { ExternalCatalogProvider, ExternalProviderStatusDTO } from '../external-catalog.provider';

const read = (obj: any, key: string) => key.split('.').reduce((value, part) => value?.[part], obj);
const value = (obj: any) => typeof obj === 'string' ? obj : obj?.displayValue ?? obj?.value;

@Injectable()
export class AmazonProvider implements ExternalCatalogProvider {
  readonly name = ExternalProviderName.AMAZON;
  constructor(private readonly client: AmazonCreatorsClient, private readonly config: ConfigService) {}

  private asin(idOrUrl: string) {
    const match = idOrUrl.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})|^([A-Z0-9]{10})$/i);
    const asin = (match?.[1] || match?.[2] || '').toUpperCase();
    if (!asin) throw new NotFoundException('El ID o URL no contiene un ASIN válido de Amazon.');
    return asin;
  }

  async fetchProductDetails(idOrUrl: string): Promise<ExternalProductDTO> {
    const asin = this.asin(idOrUrl);
    const response: any = await this.client.getItems([asin]);
    const item = response.itemsResult?.items?.find((entry: any) => entry.asin === asin);
    if (!item) throw new NotFoundException(`Amazon no devolvió el ASIN ${asin}.`);
    const listing = item.offersV2?.listings?.[0] || item.offers?.listings?.[0];
    const availability = value(listing?.availability?.type) || value(listing?.availability?.message) || '';
    const price = Number(listing?.price?.money?.amount ?? listing?.price?.amount);
    const title = value(read(item, 'itemInfo.title')) || `Amazon ${asin}`;
    return {
      provider: this.name,
      externalId: asin,
      title,
      description: (read(item, 'itemInfo.features.displayValues') || []).filter((x: any) => typeof x === 'string').join('\n'),
      brand: value(read(item, 'itemInfo.byLineInfo.brand')),
      images: [item.images?.primary?.large, item.images?.primary?.medium].filter((x: any) => x?.url).slice(0, 1).map((x: any) => ({ url: x.url, altText: title })),
      ...(Number.isFinite(price) ? { price } : {}),
      currency: listing?.price?.money?.currency || listing?.price?.currency,
      available: Boolean(listing) && /in[ _-]?stock|available/i.test(availability) && !/unavailable|out of stock/i.test(availability),
      condition: value(listing?.condition?.value) || 'Nuevo',
      originalUrl: item.detailPageURL || `https://${this.client.marketplace}/dp/${asin}?tag=${encodeURIComponent(this.client.partnerTag)}`,
      attributes: [
        { name: 'Color', value: value(read(item, 'itemInfo.productInfo.color')) },
        { name: 'Talla', value: value(read(item, 'itemInfo.productInfo.size')) },
      ].filter((x): x is { name: string; value: string } => typeof x.value === 'string' && !!x.value),
      raw: item,
    };
  }

  async syncPriceAndStock(externalIds: string[]): Promise<SyncResultDTO[]> {
    const ids = externalIds.map((id) => this.asin(id));
    const results: SyncResultDTO[] = [];
    for (let i = 0; i < ids.length; i += 10) {
      const response: any = await this.client.getItems(ids.slice(i, i + 10));
      const items: any[] = response.itemsResult?.items || [];
      for (const id of ids.slice(i, i + 10)) {
        const item = items.find((entry) => entry.asin === id);
        if (!item) { results.push({ provider: this.name, externalId: id, status: 'not_found' }); continue; }
        const listing = item.offersV2?.listings?.[0] || item.offers?.listings?.[0];
        const availability = value(listing?.availability?.type) || value(listing?.availability?.message) || '';
        const price = Number(listing?.price?.money?.amount ?? listing?.price?.amount);
        results.push({ provider: this.name, externalId: id, status: 'synced', ...(Number.isFinite(price) ? { price } : {}), available: Boolean(listing) && /in[ _-]?stock|available/i.test(availability) && !/unavailable|out of stock/i.test(availability) });
      }
    }
    return results;
  }

  mapToInternalSchema(dto: ExternalProductDTO): InternalProductPayload {
    return {
      skuBase: `AMZ-${dto.externalId}`,
      nombre: dto.title,
      descripcionCorta: `Producto listado en Amazon (${dto.externalId}). Compra externa.`,
      descripcionLarga: dto.description,
      marca: dto.brand,
      precio: dto.price ?? 0,
      moneda: dto.currency,
      stockDisponible: 0,
      imagenes: dto.images,
      atributos: dto.attributes,
      originalUrl: dto.originalUrl,
      condicion: dto.condition,
      vendedorOriginal: dto.sellerName,
    };
  }

  async getStatus(): Promise<ExternalProviderStatusDTO> {
    const configured = !!this.config.get('AMAZON_CREATORS_CLIENT_ID') && !!this.config.get('AMAZON_CREATORS_CLIENT_SECRET') && !!this.config.get('AMAZON_PARTNER_TAG');
    return { provider: this.name, configured, connection: configured ? 'NOT_CHECKED' : 'UNCONFIGURED', rateLimit: { requestsPerSecond: 0.9, source: 'local', note: 'Limitador local ~1 solicitud/segundo; la cuota real depende del nivel asignado por Amazon.' }, ...(configured ? { message: 'Credenciales presentes; conexión no comprobada para evitar consumir cuota.' } : { message: 'Faltan credenciales de Amazon Creators API.' }) };
  }
}
