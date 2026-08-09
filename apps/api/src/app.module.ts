import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { validateEnv } from './config/env.config';
import { AuthModule } from './auth/auth.module';
import { TransportModule } from './transport/transport.module';
import { SeatsModule } from './seats/seats.module';
import { CheckoutModule } from './checkout/checkout.module';
import { TicketsModule } from './tickets/tickets.module';
import { DatabaseModule } from './database';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    DatabaseModule,
    AuthModule,
    TransportModule,
    SeatsModule,
    CheckoutModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
