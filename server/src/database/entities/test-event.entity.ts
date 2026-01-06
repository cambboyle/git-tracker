import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('test_events')
export class TestEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  message!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
