import { Module } from '@nestjs/common';
import { AmazonIntegrationModule } from '@modules/amazon-integration/amazon-integration.module';
import { AmazonCreatorsClient } from '@modules/amazon-integration/amazon-creators.client';
import { AmazonProvider } from './providers/amazon.provider';
import { MercariProvider } from './providers/mercari.provider';
import { ExternalCatalogController } from './external-catalog.controller';
import { EXTERNAL_CATALOG_PROVIDERS, ExternalCatalogService } from './external-catalog.service';

@Module({
  imports: [AmazonIntegrationModule],
  controllers: [ExternalCatalogController],
  providers: [
    AmazonProvider,
    MercariProvider,
    { provide: EXTERNAL_CATALOG_PROVIDERS, useFactory: (amazon: AmazonProvider, mercari: MercariProvider) => [amazon, mercari], inject: [AmazonProvider, MercariProvider] },
    ExternalCatalogService,
  ],
  exports: [ExternalCatalogService],
})
export class ExternalCatalogModule {}
