import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AmazonCreatorsClient {
  private readonly logger = new Logger(AmazonCreatorsClient.name);
  private token?: { value: string; expiresAt: number };
  private nextRequestAt = 0;

  constructor(private readonly config: ConfigService) {}

  private setting(name: string, fallback?: string) {
    return this.config.get<string>(name) || fallback;
  }

  private requireConfig() {
    const clientId = this.setting('AMAZON_CREATORS_CLIENT_ID');
    const clientSecret = this.setting('AMAZON_CREATORS_CLIENT_SECRET');
    const partnerTag = this.setting('AMAZON_PARTNER_TAG');
    if (!clientId || !clientSecret || !partnerTag) {
      throw new ServiceUnavailableException('Configura AMAZON_CREATORS_CLIENT_ID, AMAZON_CREATORS_CLIENT_SECRET y AMAZON_PARTNER_TAG para habilitar la integración.');
    }
    return { clientId, clientSecret, partnerTag };
  }

  get partnerTag() { return this.requireConfig().partnerTag; }
  get marketplace() { return this.setting('AMAZON_MARKETPLACE', 'www.amazon.com'); }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const { clientId, clientSecret } = this.requireConfig();
    const tokenUrl = this.setting('AMAZON_CREATORS_TOKEN_URL', 'https://api.amazon.com/auth/o2/token');
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret, scope: 'creatorsapi::default' }),
    });
    if (!response.ok) {
      this.logger.error(`Amazon OAuth rechazó la solicitud (${response.status}).`);
      throw new ServiceUnavailableException('No se pudo autenticar con Amazon Creators API. Verifica credenciales y región.');
    }
    const data = await response.json() as { access_token: string; expires_in?: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
    return this.token.value;
  }

  private async throttle() {
    const now = Date.now();
    const scheduledAt = Math.max(now, this.nextRequestAt);
    this.nextRequestAt = scheduledAt + 1100;
    const wait = scheduledAt - now;
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  }

  private async call(operation: 'getItems' | 'searchItems', params: Record<string, unknown>) {
    this.requireConfig();
    await this.throttle();
    const token = await this.accessToken();
    const response = await fetch(`https://creatorsapi.amazon/catalog/v1/${operation}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-marketplace': this.marketplace },
      body: JSON.stringify({ ...params, marketplace: this.marketplace, partnerTag: this.partnerTag }),
    });
    if (response.status === 429) {
      this.logger.warn('Amazon Creators API aplicó rate limit (429).');
      const seconds = Number(response.headers.get('retry-after')) || 2;
      await new Promise((resolve) => setTimeout(resolve, Math.min(seconds, 30) * 1000));
      throw new ServiceUnavailableException('Amazon alcanzó su límite temporal de solicitudes; vuelve a intentar en unos segundos.');
    }
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Amazon ${operation} falló (${response.status}): ${detail.slice(0, 500)}`);
      throw new ServiceUnavailableException(`Amazon Creators API respondió ${response.status}. Revisa acceso, marketplace y Partner Tag.`);
    }
    return response.json();
  }

  async getItems(asins: string[]) {
    return this.call('getItems', {
      itemIds: asins,
      itemIdType: 'ASIN',
      resources: ['itemInfo.title', 'itemInfo.features', 'itemInfo.byLineInfo', 'itemInfo.productInfo', 'images.primary.large', 'offersV2.listings.price', 'offersV2.listings.availability'],
    });
  }

  async searchItems(keywords: string) {
    return this.call('searchItems', { keywords, itemCount: 10, resources: ['itemInfo.title', 'itemInfo.byLineInfo', 'images.primary.medium', 'offersV2.listings.price', 'offersV2.listings.availability'] });
  }
}
