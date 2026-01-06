import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryEntity } from '../database/entities/delivery.entity';
import { DeliveriesController } from './deliveries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryEntity])],
  controllers: [DeliveriesController],
})
export class DeliveriesModule {}
