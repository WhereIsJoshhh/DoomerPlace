import { Module } from '@nestjs/common';
import { OrdersService } from './application/services/orders.service';
import { OrdersController } from './presentation/orders.controller';
import { InventoryModule } from '@modules/inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
