import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutingRuleEntity } from '../database/entities/routing-rule.entity';
import { RoutingRulesController } from './routing-rules.controller';
import { RoutingRulesAdminController } from './routing-rules.admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoutingRuleEntity])],
  controllers: [RoutingRulesController, RoutingRulesAdminController],
})
export class RoutingRulesModule {}
