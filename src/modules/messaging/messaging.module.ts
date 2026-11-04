import { Module } from '@nestjs/common';
import { MessagingService } from './application/services/messaging.service';
import { MessagingController } from './presentation/messaging.controller';

@Module({
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
