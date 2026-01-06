import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DestinationEntity,
  DestinationType,
} from '../database/entities/destination.entity';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
  ) {}

  async ensureDiscordWebHookDestination(name: string, webhookUrl: string) {
    let dest = await this.destinationsRepo.findOne({
      where: { type: 'DISCORD_WEBHOOK' as DestinationType, name },
    });

    if (!dest) {
      dest = this.destinationsRepo.create({
        type: 'DISCORD_WEBHOOK',
        name,
        configJson: { webhookUrl },
        enabled: true,
      });
      dest = await this.destinationsRepo.save(dest);
    }

    return dest;
  }

  async listDestinations() {
    return this.destinationsRepo.find();
  }
}
