import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DestinationEntity } from '../database/entities/destination.entity';
import { DestinationsService } from './destinations.service';
import { DestinationsController } from './destinations.controller';
import { DestinationsAdminController } from './destinations.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DestinationEntity])],
  providers: [DestinationsService],
  controllers: [DestinationsController, DestinationsAdminController],
  exports: [DestinationsService],
})
export class DestinationsModule {}
