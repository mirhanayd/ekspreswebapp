import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DatabaseModule } from '../database';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [DatabaseModule, TrackingModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
