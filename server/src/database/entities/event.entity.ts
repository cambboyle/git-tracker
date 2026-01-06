import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { DeliveryEntity } from './delivery.entity';

export type EventSource = 'github';

@Entity('events')
export class EventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 32, default: 'github' })
  @Index()
  source!: EventSource;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  githubDeliveryId!: string | null;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  eventType!: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  repository!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  ref!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  actor!: string | null;

  @Column({ type: 'json', nullable: false })
  payloadJson!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => DeliveryEntity, (delivery) => delivery.event)
  deliveries!: DeliveryEntity[];
}
