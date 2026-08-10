import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { isTrackingPosition, TrackingPosition } from './tracking.types';

@Injectable()
export class TrackingLatestService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(TrackingLatestService.name);

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
    this.client.on('error', (error) =>
      this.logger.warn(`Latest tracking snapshot unavailable: ${error.message}`),
    );
  }

  async get(tripId: string): Promise<TrackingPosition | null> {
    const raw = await this.client.get(`tracking:latest:${tripId}`).catch(() => null);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      return isTrackingPosition(value) ? value : null;
    } catch {
      return null;
    }
  }

  onModuleDestroy() {
    this.client.quit();
  }
}
