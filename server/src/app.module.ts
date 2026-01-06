import { Module, RequestMethod, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhookHandlerModule } from './webhook-handler/webhook-handler.module';
import { RawBodyMiddleware } from './common/middleware/middleware.service';
import { ConfigModule } from '@nestjs/config';
import { EventEntity } from './database/entities/event.entity';
import { EventsModule } from './events/events.module';
import { RoutingRuleEntity } from './database/entities/routing-rule.entity';
import { DestinationEntity } from './database/entities/destination.entity';
import { DestinationsModule } from './destinations/destinations.module';
import { DeliveryEntity } from './database/entities/delivery.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { RoutingRulesModule } from './routing-rules/routing-rules.module';
import { User } from './users/user.entity';
// import { TestEventEntity } from './database/entities/test-event.entity';
// import { TestModule } from './test/test.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    WebhookHandlerModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql' as const,
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.DB_USERNAME || 'webhook_user',
        password: process.env.DB_PASSWORD || 'webhook_password',
        database: process.env.DB_NAME || 'webhook_service',
        entities: [
          EventEntity,
          DestinationEntity,
          DeliveryEntity,
          RoutingRuleEntity,
          User,
        ],
        synchronize: true, // we'll do migrations; can be true temporarily while prototyping
        logging: true,
      }),
    }),
    EventsModule,
    DestinationsModule,
    NotificationsModule,
    DeliveriesModule,
    RoutingRulesModule,
    AuthModule,
    // TypeOrmModule.forFeature([TestEventEntity]),
  ],
  controllers: [AppController],
  providers: [AppService, RawBodyMiddleware],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: 'webhook-handler', method: RequestMethod.POST });
  }
}
