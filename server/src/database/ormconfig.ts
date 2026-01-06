import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as process from 'process';
import 'dotenv/config';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'webhook_user',
  password: process.env.DB_PASSWORD || 'webhook_password',
  database: process.env.DB_NAME || 'webhook_service',
  entities: [],
  synchronize: true,
  logging: true,
});
