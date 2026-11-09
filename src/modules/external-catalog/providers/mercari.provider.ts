import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalProductDTO, ExternalProviderName, InternalProductPayload, SyncResultDTO } from '../external-catalog.dto';
import { ExternalCatalogProvider, ExternalProviderStatusDTO } from '../external-catalog.provider';

@Injectable()
export class MercariProvider implements ExternalCatalogProvider {
  readonly name = ExternalProviderName.MERCARI;
  private readonly logger = new Logger(MercariProvider.name);
  private nextRequestAt = 0;

  constructor(private readonly config: ConfigService) {}

  private baseUrl() { return this.config.get<string>('MERCARI_CATALOG_PROXY_URL')?.replace(/\/$/, ''); }
  private isAvailable(statusValue: unknown) {
    const status = String(statusValue || '').toLowerCase();
    return /on_sale|active|available|in_stock|listed|open/.test(status) && !/sold|deleted|unavailable|closed|inactive/.test(status);
  }
  private id(idOrUrl: string) {
    const match = idOrUrl.match(/(?:item\/|\/)(m[0-9]+|[A-Za-z0-9_-]{8,})(?:[/?#]|$)/i);
    const id = match?.[1] || idOrUrl.trim();
    if (!/^(m[0-9]+|[A-Za-z0-9_-]{8,})$/i.test(id)) throw new NotFoundException('No se pudo extraer un ID de publicación de Mercari.');
    return id;
  }

  private async request(path: string, init?: RequestInit) {
    const base = this.baseUrl();
    if (!base) throw new ServiceUnavailableException('Configura MERCARI_CATALOG_PROXY_URL con un proxy autorizado para Mercari.');
    const token = this.config.get<string>('MERCARI_CATALOG_PROXY_TOKEN');
    const slot = Math.max(Date.now(), this.nextRequestAt);
    this.nextRequestAt = slot + 1100;
    if (slot > Date.now()) await new Promise((resolve) => setTimeout(resolve, slot - Date.now()));
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...(init?.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) throw new NotFoundException('Mercari no encontró la publicación solicitada.');
    if (response.status === 429) throw new ServiceUnavailableException('El proxy de Mercari alcanzó el límite de solicitudes.');
    if (!response.ok) {
      this.logger.error(`Proxy Mercari respondió ${response.status} en ${path}.`);
      throw new ServiceUnavailableException(`El proxy de Mercari respondió ${response.status}.`);
    }
    return response.json();
  }

  async fetchProductDetails(idOrUrl: string): Promise<ExternalProductDTO> {
    const externalId = this.id(idOrUrl);
    const path = (this.config.get<string>('MERCARI_PROXY_ITEM_PATH') || '/items/{id}').replace('{id}', encodeURIComponent(externalId));
    const response: any = await this.request(path);
    const item = response.item || response.data?.item || response.data || response;
    const title = item.title || item.name || item.itemName;
    if (!title) throw new ServiceUnavailableException('La respuesta del proxy Mercari no contiene el título del producto.');
    const rawPrice = item.price?.amount ?? item.price ?? item.priceAmount;
    const price = Number(rawPrice);
    const status = String(item.status || item.itemStatus || item.availability || '').toLowerCase();
    const conditionRaw = String(item.condition || item.itemCondition || '');
    const condition = /new|nuevo/i.test(conditionRaw) ? 'Nuevo' : /refurb|renewed|reacond/i.test(conditionRaw) ? 'Reacondicionado' : conditionRaw ? 'Usado' : undefined;
    const imageData = item.images || item.photos || item.thumbnails || [];
    const images = (Array.isArray(imageData) ? imageData : [imageData]).map((image: any) => typeof image === 'string' ? image : image?.url || image?.originalUrl).filter((url: any) => typeof url === 'string').map((url: string) => ({ url, altText: title }));
    const category = typeof item.category === 'string' ? item.category : item.category?.name || item.categoryName;
    return {
      provider: this.name,
      externalId: String(item.id || item.itemId || externalId),
      title,
      description: item.description || item.itemDescription,
      brand: item.brand?.name || item.brand,
      images,
      ...(Number.isFinite(price) ? { price } : {}),
      currency: item.currency || 'USD',
      available: this.isAvailable(status),
      condition,
      sellerName: item.seller?.name || item.sellerName || item.seller?.username,
      originalUrl: item.url || item.permalink || `https://www.mercari.com/us/item/${encodeURIComponent(externalId)}/`,
      attributes: [
        { name: 'Condición', value: condition },
        { name: 'Categoría', value: category },
        { name: 'Marca', value: typeof item.brand === 'string' ? item.brand : item.brand?.name },
      ].filter((x): x is { name: string; value: string } => typeof x.value === 'string' && !!x.value),
      raw: item,
    };
  }

  async syncPriceAndStock(externalIds: string[]): Promise<SyncResultDTO[]> {
    const path = this.config.get<string>('MERCARI_PROXY_SYNC_PATH') || '/items/sync';
    const response: any = await this.request(path, { method: 'POST', body: JSON.stringify({ externalIds: externalIds.map((id) => this.id(id)) }) });
    const items: any[] = response.items || response.data?.items || [];
    const byId = new Map(items.map((item) => [String(item.externalId || item.id || item.itemId), item]));
    const results: SyncResultDTO[] = [];
    for (const rawId of externalIds) {
      const externalId = this.id(rawId);
      const item = byId.get(externalId);
      if (!item) { results.push({ provider: this.name, externalId, status: 'not_found' }); continue; }
      const price = Number(item.price?.amount ?? item.price ?? item.priceAmount);
      results.push({ provider: this.name, externalId, status: 'synced', ...(Number.isFinite(price) ? { price } : {}), available: this.isAvailable(item.status || item.availability) });
    }
    return results;
  }

  mapToInternalSchema(dto: ExternalProductDTO): InternalProductPayload {
    return {
      skuBase: `MRC-${dto.externalId}`,
      nombre: dto.title,
      descripcionCorta: `Publicación de Mercari (${dto.externalId}); condición: ${dto.condition || 'No especificada'}. Compra externa.`,
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
    const configured = !!this.baseUrl();
    return { provider: this.name, configured, connection: configured ? 'NOT_CHECKED' : 'UNCONFIGURED', rateLimit: { requestsPerSecond: 0.9, source: 'local', note: 'El adapter limita a ~1 solicitud/segundo; cuota y límites efectivos dependen del proxy.' }, ...(configured ? { message: 'Proxy configurado; su conexión no se consulta para evitar una llamada externa.' } : { message: 'Mercari requiere configurar un proxy autorizado.' }) };
  }
}
