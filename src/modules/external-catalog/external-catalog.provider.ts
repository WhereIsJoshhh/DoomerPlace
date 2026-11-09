import { ExternalProductDTO, ExternalProviderName, InternalProductPayload, SyncResultDTO } from './external-catalog.dto';

export interface ExternalCatalogProvider {
  readonly name: ExternalProviderName;
  fetchProductDetails(externalId: string): Promise<ExternalProductDTO>;
  syncPriceAndStock(externalIds: string[]): Promise<SyncResultDTO[]>;
  mapToInternalSchema(dto: ExternalProductDTO): InternalProductPayload;
  getStatus(): Promise<ExternalProviderStatusDTO>;
}

export interface ExternalProviderStatusDTO {
  provider: ExternalProviderName;
  configured: boolean;
  connection: 'READY' | 'UNCONFIGURED' | 'ERROR' | 'NOT_CHECKED';
  rateLimit: { requestsPerSecond?: number; source: 'local' | 'provider' | 'unknown'; note: string };
  message?: string;
}
