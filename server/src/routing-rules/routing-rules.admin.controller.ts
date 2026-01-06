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
import { RoutingRuleEntity } from '../database/entities/routing-rule.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

/**
 * Admin-only CRUD controller for routing rules.
 *
 * Routes:
 *   GET    /api/admin/routing-rules
 *   GET    /api/admin/routing-rules/:id
 *   POST   /api/admin/routing-rules
 *   PATCH  /api/admin/routing-rules/:id
 *   DELETE /api/admin/routing-rules/:id
 *
 * This is intentionally light on validation for now to keep the
 * dashboard iteration fast. You can later introduce DTOs with
 * class-validator if you want stricter contracts.
 */
@Controller('api/admin/routing-rules')
@UseGuards(JwtAuthGuard, AdminGuard)
export class RoutingRulesAdminController {
  constructor(
    @InjectRepository(RoutingRuleEntity)
    private readonly rulesRepo: Repository<RoutingRuleEntity>,
  ) {}

  /**
   * List all routing rules, newest first, including their destination relation.
   */
  @Get()
  async list(): Promise<RoutingRuleEntity[]> {
    return this.rulesRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['destination'],
    });
  }

  /**
   * Get a single routing rule by id, including its destination relation.
   */
  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RoutingRuleEntity | null> {
    return this.rulesRepo.findOne({
      where: { id },
      relations: ['destination'],
    });
  }

  /**
   * Create a new routing rule.
   *
   * Example body:
   *   {
   *     "repository": "owner/repo", // or null/omitted for any
   *     "ref": "refs/heads/main",   // or null/omitted for any
   *     "eventType": "push",        // or null/omitted for any
   *     "enabled": true,
   *     "destinationId": 1
   *   }
   */
  @Post()
  async create(
    @Body()
    body: {
      repository?: string | null;
      ref?: string | null;
      eventType?: string | null;
      enabled?: boolean;
      destinationId: number;
    },
  ): Promise<RoutingRuleEntity> {
    const rule = this.rulesRepo.create({
      repository: body.repository ?? null,
      ref: body.ref ?? null,
      eventType: body.eventType ?? null,
      enabled: body.enabled ?? true,
      // Associate by id without loading full destination
      destination: { id: body.destinationId } as any,
    });

    return this.rulesRepo.save(rule);
  }

  /**
   * Update an existing routing rule.
   *
   * You can PATCH any subset of the fields:
   *   {
   *     "repository"?: string | null,
   *     "ref"?: string | null,
   *     "eventType"?: string | null,
   *     "enabled"?: boolean,
   *     "destinationId"?: number
   *   }
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      repository?: string | null;
      ref?: string | null;
      eventType?: string | null;
      enabled?: boolean;
      destinationId?: number;
    },
  ): Promise<RoutingRuleEntity> {
    const rule = await this.rulesRepo.findOneOrFail({
      where: { id },
      relations: ['destination'],
    });

    if (body.repository !== undefined) {
      rule.repository = body.repository;
    }
    if (body.ref !== undefined) {
      rule.ref = body.ref;
    }
    if (body.eventType !== undefined) {
      rule.eventType = body.eventType;
    }
    if (body.enabled !== undefined) {
      rule.enabled = body.enabled;
    }
    if (body.destinationId !== undefined) {
      rule.destination = { id: body.destinationId } as any;
    }

    return this.rulesRepo.save(rule);
  }

  /**
   * Delete a routing rule by id.
   *
   * NOTE: This is a hard delete. If you want auditability, consider
   * adding a soft-delete flag to RoutingRuleEntity instead.
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: true }> {
    await this.rulesRepo.delete(id);
    return { success: true };
  }
}
