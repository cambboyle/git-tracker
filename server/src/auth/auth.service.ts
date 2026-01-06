import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import type { User } from '../users/user.entity';

interface JwtPayload {
  sub: number;
  email: string;
  isAdmin: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // 1) Validate credentials for login
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isValid = await this.usersService.validatePassword(
      password,
      user.password,
    );
    if (!isValid) return null;

    return user;
  }

  // 2) Build the JWT payload
  private buildJwtPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    };
  }

  // 3) Create access token (short lived)
  async generateAccessToken(user: User): Promise<string> {
    const payload = this.buildJwtPayload(user);
    return this.jwtService.signAsync(payload, { expiresIn: '15m' });
  }

  // 4) Create a new random refresh token (string)
  private generateRawRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  // 5) Store refresh token hash for a user (delegates hashing to UsersService)
  private async setCurrentRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    await this.usersService.updateRefreshTokenHash(userId, refreshToken);
  }

  // 6) Login: return tokens and user DTO
  async login(user: User) {
    const accessToken = await this.generateAccessToken(user);

    const refreshToken = this.generateRawRefreshToken();
    console.log(
      '[AuthService.login] issuing refreshToken:',
      refreshToken,
      'for user',
      user.id,
    );

    await this.setCurrentRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    };
  }

  // 7) Signup: create new user then reuse login flow
  async signup(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ForbiddenException('Email already registered');
    }
    const user = await this.usersService.createUser(email, password);
    return this.login(user);
  }

  // 8) Refresh: verify refresh token, rotate, return new tokens
  async refreshTokens(userId: number, refreshToken: string) {
    console.log('[AuthService.refreshTokens] userId:', userId);
    console.log(
      '[AuthService.refreshTokens] incoming refreshToken:',
      refreshToken,
    );

    const user = await this.usersService.findById(userId);
    console.log(
      '[AuthService.refreshTokens] user exists:',
      !!user,
      'hasHash:',
      !!user?.refreshTokenHash,
    );

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Verify using bcrypt because refreshTokenHash is a bcrypt hash
    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    console.log('[AuthService.refreshTokens] isValid:', isValid);

    if (!isValid) {
      await this.setCurrentRefreshToken(userId, null);
      throw new ForbiddenException('Refresh token invalid');
    }

    const newAccessToken = await this.generateAccessToken(user);
    const newRefreshToken = this.generateRawRefreshToken();
    await this.setCurrentRefreshToken(user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    };
  }

  // 9) Logout: clear stored refresh token hash
  async logout(userId: number): Promise<void> {
    await this.setCurrentRefreshToken(userId, null);
  }
}
