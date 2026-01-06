import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestEventEntity } from '../database/entities/test-event.entity';

@Controller('test-db')
export class TestDbController {
  constructor(
    @InjectRepository(TestEventEntity)
    private readonly testRepo: Repository<TestEventEntity>,
  ) {}

  @Get()
  async createTestEvent() {
    const event = this.testRepo.create({ message: 'Hello from TypeORM' });
    const saved = await this.testRepo.save(event);
    return saved;
  }
}
