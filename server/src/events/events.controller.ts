import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { EventEntity } from 'src/database/entities/event.entity';
import { Repository, FindOptionsWhere } from 'typeorm';

@Controller('api/events')
export class EventsController {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepo: Repository<EventEntity>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async listEvents(
    @Query('eventType') eventType?: string,
    @Query('repository') repository?: string,
  ) {
    const where: FindOptionsWhere<EventEntity> = {};

    if (eventType) {
      where.eventType = eventType;
    }
    if (repository) {
      where.repository = repository;
    }

    const events = await this.eventsRepo.find({
      where: Object.keys(where).length ? where : undefined,
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return events;
  }
}
