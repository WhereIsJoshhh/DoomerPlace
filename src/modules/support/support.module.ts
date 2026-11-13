import { Module } from '@nestjs/common';
import { SupportService } from './application/services/support.service';
import { SupportController } from './presentation/support.controller';

@Module({
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
