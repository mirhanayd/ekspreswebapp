import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  path: '/api/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Clients will emit a 'subscribe_trip' event to join a room for a specific trip
    client.on('subscribe_trip', (tripId: string) => {
      this.logger.log(`Client ${client.id} subscribed to trip: ${tripId}`);
      client.join(`trip_${tripId}`);
    });

    client.on('unsubscribe_trip', (tripId: string) => {
      this.logger.log(`Client ${client.id} unsubscribed from trip: ${tripId}`);
      client.leave(`trip_${tripId}`);
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Called by TrackingService when a new location update arrives from Redis
  broadcastLocation(tripId: string, locationData: any) {
    // this.logger.debug(`Broadcasting location for trip ${tripId}`);
    this.server.to(`trip_${tripId}`).emit('location_update', locationData);
  }
}
