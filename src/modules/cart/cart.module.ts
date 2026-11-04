import { Module } from '@nestjs/common';
import { CartService } from './application/services/cart.service';
import { CartController } from './presentation/cart.controller';

@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
