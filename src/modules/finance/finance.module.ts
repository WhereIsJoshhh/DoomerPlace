import { Module } from '@nestjs/common';
import { FinanceService } from './application/services/finance.service';
import { FinanceController } from './presentation/finance.controller';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
