import { Module } from '@nestjs/common';
import { PaymentsService } from './application/services/payments.service';
import { PaymentsController } from './presentation/payments.controller';
import { OrdersModule } from '@modules/orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
