import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { EventEntity } from './event.entity';
import { DestinationEntity } from './destination.entity';

export type DeliveryStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

@Entity('deliveries')
export class DeliveryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => EventEntity, (event) => event.deliveries, {
    onDelete: 'CASCADE',
  })
  @Index()
  event!: EventEntity;

  @ManyToOne(() => DestinationEntity, (destination) => destination.deliveries, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @Index()
  destination!: DestinationEntity;

  @Column({ type: 'varchar', length: 20 })
  status!: DeliveryStatus;

  @Column({ type: 'int', nullable: true })
  responseCode!: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'json', nullable: true })
  requestedPayloadJson!: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  responseBody!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
