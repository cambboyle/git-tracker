import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DestinationEntity } from './destination.entity';

@Entity('routing_rules')
export class RoutingRuleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  @Index()
  repository!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  ref!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  eventType!: string | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @ManyToOne(
    () => DestinationEntity,
    (destination) => destination.routingRules,
    {
      eager: true,
      onDelete: 'CASCADE',
    },
  )
  destination!: DestinationEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
