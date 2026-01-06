import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

/**
 * Admin-only CRUD controller for users.
 *
 * Routes:
 *   GET    /api/admin/users
 *   GET    /api/admin/users/:id
 *   POST   /api/admin/users
 *   PATCH  /api/admin/users/:id
 *   DELETE /api/admin/users/:id
 *
 * Notes:
 * - Passwords are always hashed via UsersService.
 * - Be careful not to remove the last admin account in production.
 */
@Controller('api/admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersAdminController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * List all users, newest first.
   */
  @Get()
  async list(): Promise<User[]> {
    return this.usersRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single user by id.
   */
  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  /**
   * Create a new user.
   *
   * Body:
   *   {
   *     "email": string,
   *     "password": string,
   *     "isAdmin"?: boolean
   *   }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body()
    body: {
      email: string;
      password: string;
      isAdmin?: boolean;
    },
  ): Promise<User> {
    const user = await this.usersService.createUser(body.email, body.password);

    if (body.isAdmin !== undefined) {
      user.isAdmin = body.isAdmin;
      return this.usersRepo.save(user);
    }

    return user;
  }

  /**
   * Update an existing user.
   *
   * Body (all optional):
   *   {
   *     "email"?: string,
   *     "password"?: string,
   *     "isAdmin"?: boolean
   *   }
   *
   * - If password is provided, it is re-hashed.
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      email?: string;
      password?: string;
      isAdmin?: boolean;
    },
  ): Promise<User> {
    const user = await this.usersRepo.findOneOrFail({ where: { id } });

    if (body.email !== undefined) {
      user.email = body.email;
    }

    if (body.password && body.password.trim().length > 0) {
      // Delegate hashing to UsersService for consistency.
      user.password = await this.usersService.hashPassword(body.password);
    }

    if (body.isAdmin !== undefined) {
      user.isAdmin = body.isAdmin;
    }

    return this.usersRepo.save(user);
  }

  /**
   * Delete a user by id.
   *
   * NOTE: This is a hard delete. In a real system you might want soft-deletes
   * or checks to prevent deleting the last admin.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: true }> {
    await this.usersRepo.delete(id);
    return { success: true };
  }
}
