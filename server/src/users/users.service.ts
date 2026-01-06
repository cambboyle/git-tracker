import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';

const PASSWORD_HASH_ROUNDS = 10;
const REFRESH_TOKEN_HASH_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async createUser(email: string, password: string): Promise<User> {
    const passwordHash = await this.hashPassword(password);
    const user = this.usersRepo.create({ email, password: passwordHash });
    return this.usersRepo.save(user);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  }

  validatePassword(
    rawPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(rawPassword, hashedPassword);
  }

  async updateRefreshTokenHash(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    let refreshTokenHash: string | null = null;

    if (refreshToken) {
      refreshTokenHash = await bcrypt.hash(
        refreshToken,
        REFRESH_TOKEN_HASH_ROUNDS,
      );
    }

    await this.usersRepo.update(userId, { refreshTokenHash });
  }
}
