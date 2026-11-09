import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import configuration from './core/config/configuration';
import { DatabaseModule } from './core/database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { IdempotencyInterceptor } from './core/interceptors/idempotency.interceptor';
import { IdentityModule } from './modules/identity/identity.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FinanceModule } from './modules/finance/finance.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './core/health/health.module';
import { AmazonIntegrationModule } from './modules/amazon-integration/amazon-integration.module';
import { ExternalCatalogModule } from './modules/external-catalog/external-catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule,
    CacheModule,
    HealthModule,
    IdentityModule,
    VendorsModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    FinanceModule,
    LogisticsModule,
    ReturnsModule,
    PromotionsModule,
    ReviewsModule,
    MessagingModule,
    AuditModule,
    AmazonIntegrationModule,
    ExternalCatalogModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
