import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DestinationEntity } from '../database/entities/destination.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

/**
 * Admin-only CRUD controller for Destinations.
 *
 * Routes (all require admin privileges):
 *   GET    /api/admin/destinations
 *   GET    /api/admin/destinations/:id
 *   POST   /api/admin/destinations
 *   PATCH  /api/admin/destinations/:id
 *   DELETE /api/admin/destinations/:id
 *
 * This is intentionally permissive on fields (no DTO validation layer yet)
 * so that the dashboard can quickly iterate. You can later introduce
 * class-validator DTOs if you want stricter contracts.
 */
@Controller('api/admin/destinations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class DestinationsAdminController {
  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
  ) {}

  /**
   * List all destinations, newest first.
   */
  @Get()
  async list(): Promise<DestinationEntity[]> {
    return this.destinationsRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single destination by id.
   */
  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DestinationEntity | null> {
    return this.destinationsRepo.findOne({ where: { id } });
  }

  /**
   * Create a new destination.
   *
   * Expected body shape (may vary depending on your entity definition):
   *   {
   *     "name": string,
   *     "type": string,              // e.g. "slack", "discord"
   *     "enabled": boolean,
   *     "config": { ... } | string   // depending on how you store config
   *   }
   */
  @Post()
  async create(
    @Body()
    body: Partial<DestinationEntity> & {
      name: string;
      type: string;
      enabled?: boolean;
    },
  ): Promise<DestinationEntity> {
    const { name, type, enabled, ...rest } = body as DestinationEntity & {
      enabled?: boolean;
    };

    const destination = this.destinationsRepo.create({
      name,
      type,
      enabled: enabled ?? true,
      ...rest,
    });

    return this.destinationsRepo.save(destination);
  }

  /**
   * Update an existing destination.
   *
   * You can send any subset of fields to patch:
   *   {
   *     "name"?: string,
   *     "type"?: string,
   *     "enabled"?: boolean,
   *     "config"?: ...
   *   }
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<DestinationEntity>,
  ): Promise<DestinationEntity> {
    const destination = await this.destinationsRepo.findOneOrFail({
      where: { id },
    });

    Object.assign(destination, body);

    return this.destinationsRepo.save(destination);
  }

  /**
   * Delete a destination by id.
   *
   * NOTE: This is a hard delete. If you want auditability,
   * consider adding a soft-delete flag instead of removing rows.
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: true }> {
    await this.destinationsRepo.delete(id);
    return { success: true };
  }
}
