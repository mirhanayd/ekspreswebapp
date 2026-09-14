import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database';
import { TransportModule } from '../transport/transport.module';
import { DriverAdminController } from './driver-admin.controller';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

@Module({
  imports: [DatabaseModule, TransportModule],
  controllers: [DriverController, DriverAdminController],
  providers: [DriverService],
})
export class DriverModule {}
