import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database';
import { AuthModule } from '../auth/auth.module';
import { TrackingAccessService } from './tracking-access.service';
import { TrackingController } from './tracking.controller';
import { TrackingLatestService } from './tracking-latest.service';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingService, TrackingLatestService, TrackingAccessService],
  exports: [TrackingService, TrackingGateway, TrackingAccessService, TrackingLatestService],
})
export class TrackingModule {}
