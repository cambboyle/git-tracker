import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryEntity } from '../database/entities/delivery.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/deliveries')
export class DeliveriesController {
  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveriesRepo: Repository<DeliveryEntity>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query('eventId') eventId?: string) {
    if (eventId) {
      const id = Number(eventId);
      if (Number.isNaN(id)) {
        return [];
      }

      console.log('[DeliveriesController] filtering by event id', id);

      const results = await this.deliveriesRepo.find({
        where: { event: { id } },
        order: { createdAt: 'DESC' },
        relations: ['event', 'destination'],
      });

      console.log(
        '[DeliveriesController] found',
        results.length,
        'deliveries for event id',
        id,
      );

      return results;
    }

    return this.deliveriesRepo.find({
      order: { createdAt: 'DESC' },
      take: 50,
      relations: ['event', 'destination'],
    });
  }
}
