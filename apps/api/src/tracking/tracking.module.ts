import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingService, TrackingGateway],
})
export class TrackingModule {}
