import { Module } from '@nestjs/common';
import { PromotionsService } from './application/services/promotions.service';
import { PromotionsController } from './presentation/promotions.controller';

@Module({
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
