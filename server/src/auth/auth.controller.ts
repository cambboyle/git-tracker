import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { User } from '../users/user.entity';

class RegisterDto {
  email!: string;
  password!: string;
}

class RefreshDto {
  userId!: number;
  refreshToken!: string;
}

interface AuthenticatedRequest extends ExpressRequest {
  user?: User & { userId?: number };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    console.log('[AuthController.register] Body dto:', dto);

    if (
      !dto ||
      typeof dto.email !== 'string' ||
      typeof dto.password !== 'string'
    ) {
      throw new BadRequestException('email and password are required');
    }
    // In a real app, add validation (e.g. password length) with class-validator
    return this.authService.signup(dto.email, dto.password);
  }

  // Login uses local strategy (email+password)
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: AuthenticatedRequest) {
    const user = req.user as User;
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.userId, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    if (!user) {
      // Non-200 from guard would normally prevent this, but for type safety:
      throw new Error('User not found on request');
    }
    const userId = user.userId ?? user.id;
    await this.authService.logout(userId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
