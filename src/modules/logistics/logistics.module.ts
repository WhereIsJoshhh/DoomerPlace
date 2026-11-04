import { Module } from '@nestjs/common';
import { LogisticsService } from './application/services/logistics.service';
import { LogisticsController } from './presentation/logistics.controller';
import { FinanceModule } from '@modules/finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
