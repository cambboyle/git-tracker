import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DeliveryEntity } from './delivery.entity';
import { RoutingRuleEntity } from './routing-rule.entity';

export type DestinationType = 'DISCORD_WEBHOOK' | 'SLACK_WEBHOOK';

@Entity('destinations')
export class DestinationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  type!: DestinationType;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'json' })
  configJson!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => DeliveryEntity, (delivery) => delivery.destination)
  deliveries!: DeliveryEntity[];

  @OneToMany(() => RoutingRuleEntity, (rule) => rule.destination)
  routingRules!: RoutingRuleEntity[];
}
