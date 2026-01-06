import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestinationEntity } from '../database/entities/destination.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/destinations')
export class DestinationsController {
  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    return this.destinationsRepo.find();
  }
}
