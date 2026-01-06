import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestEventEntity } from '../database/entities/test-event.entity';
import { TestDbController } from './test.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TestEventEntity])],
  controllers: [TestDbController],
})
export class TestModule {}
