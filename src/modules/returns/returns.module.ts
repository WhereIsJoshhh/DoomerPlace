import { Module } from '@nestjs/common';
import { ReturnsService } from './application/services/returns.service';
import { ReturnsController } from './presentation/returns.controller';
import { InventoryModule } from '@modules/inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
