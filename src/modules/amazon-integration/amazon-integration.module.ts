import { Module } from '@nestjs/common';
import { AmazonCreatorsClient } from './amazon-creators.client';
import { AmazonIntegrationController } from './amazon-integration.controller';
import { AmazonIntegrationService } from './amazon-integration.service';

@Module({
  controllers: [AmazonIntegrationController],
  providers: [AmazonCreatorsClient, AmazonIntegrationService],
})
export class AmazonIntegrationModule {}
