import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { TrackingAccessService } from './tracking-access.service';
import { TrackingPosition } from './tracking.types';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: [process.env.WEB_ORIGIN || 'http://localhost:3000'],
  },
  path: '/api/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(private readonly trackingAccessService: TrackingAccessService) {}

  async handleConnection(client: Socket) {
    const token =
      typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : '';
    try {
      const claims = await this.trackingAccessService.authorizeSocketToken(token);
      client.data.tracking = claims;
      await client.join(`trip:${claims.tripId}:tracking`);
      client.emit('tracking:ready', { tripId: claims.tripId, ticketId: claims.ticketId });
      this.logger.log(`Authorized tracking client connected: ${client.id}`);
    } catch {
      client.emit('tracking:error', { code: 'TRACKING_FORBIDDEN' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Called by TrackingService when a new location update arrives from Redis
  broadcastLocation(position: TrackingPosition) {
    this.server.to(`trip:${position.tripId}:tracking`).emit('tracking:position', position);
  }
}
