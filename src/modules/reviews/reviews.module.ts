import { Module } from '@nestjs/common';
import { ReviewsService } from './application/services/reviews.service';
import { ReviewsController } from './presentation/reviews.controller';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
