import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookHandlerService } from './webhook-handler.service';
import { WebhookHandlerController } from './webhook-handler.controller';
import { EventEntity } from 'src/database/entities/event.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity]), NotificationsModule],
  providers: [WebhookHandlerService],
  controllers: [WebhookHandlerController],
})
export class WebhookHandlerModule {}
