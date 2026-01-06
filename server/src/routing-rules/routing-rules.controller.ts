import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { RoutingRuleEntity } from '../database/entities/routing-rule.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('api/routing-rules')
export class RoutingRulesController {
  constructor(
    @InjectRepository(RoutingRuleEntity)
    private readonly routingRulesRepo: Repository<RoutingRuleEntity>,
  ) {}

  /**
   * List routing rules with optional basic filters.
   *
   * Example:
   *   GET /api/routing-rules
   *   GET /api/routing-rules?repository=owner/repo
   *   GET /api/routing-rules?eventType=pull_request
   *   GET /api/routing-rules?enabled=true
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async listRoutingRules(
    @Query('repository') repository?: string,
    @Query('ref') ref?: string,
    @Query('eventType') eventType?: string,
    @Query('enabled') enabled?: string,
  ): Promise<RoutingRuleEntity[]> {
    const where: FindOptionsWhere<RoutingRuleEntity> = {};

    if (repository) {
      where.repository = repository;
    }
    if (ref) {
      where.ref = ref;
    }
    if (eventType) {
      where.eventType = eventType;
    }
    if (enabled !== undefined) {
      const normalized = enabled.toLowerCase();
      if (normalized === 'true') {
        where.enabled = true;
      } else if (normalized === 'false') {
        where.enabled = false;
      }
    }

    const rules = await this.routingRulesRepo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['destination'],
    });
    return rules;
  }
}
