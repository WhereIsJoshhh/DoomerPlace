import { Module } from '@nestjs/common';
import { VendorsService } from './application/services/vendors.service';
import { StoresService } from './application/services/stores.service';
import { VendorsController } from './presentation/vendors.controller';
import { StoresController } from './presentation/stores.controller';

@Module({
  controllers: [VendorsController, StoresController],
  providers: [VendorsService, StoresService],
  exports: [VendorsService, StoresService],
})
export class VendorsModule {}
