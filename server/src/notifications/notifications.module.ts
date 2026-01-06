import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationEntity } from '../database/entities/destination.entity';
import { DeliveryEntity } from '../database/entities/delivery.entity';
import { RoutingRuleEntity } from 'src/database/entities/routing-rule.entity';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DestinationEntity,
      DeliveryEntity,
      RoutingRuleEntity,
    ]),
  ],
  providers: [NotificationDispatcherService],
  exports: [NotificationDispatcherService],
})
export class NotificationsModule {}
