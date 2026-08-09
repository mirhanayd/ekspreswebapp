import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TrackingGateway } from './tracking.gateway';

@Injectable()
export class TrackingService implements OnModuleInit, OnModuleDestroy {
  private subscriber: Redis;
  private readonly logger = new Logger(TrackingService.name);

  constructor(
    private configService: ConfigService,
    private trackingGateway: TrackingGateway,
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.subscriber = new Redis(redisUrl);

    this.subscriber.on('connect', () => {
      this.logger.log('Connected to Redis for tracking pub/sub');
    });

    this.subscriber.on('error', (err) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });

    // Subscribe to the global tracking channel
    this.subscriber.subscribe('trip_locations', (err, count) => {
      if (err) {
        this.logger.error(`Failed to subscribe to trip_locations: ${err.message}`);
      } else {
        this.logger.log(`Subscribed to trip_locations channel`);
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === 'trip_locations') {
        try {
          const data = JSON.parse(message);
          if (data.tripId && data.location) {
            // Forward to connected clients in the trip's room
            this.trackingGateway.broadcastLocation(data.tripId, data.location);
          }
        } catch (e) {
          this.logger.error('Failed to parse location message', e);
        }
      }
    });
  }

  onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.quit();
    }
  }
}
