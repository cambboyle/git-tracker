import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy as LocalStrategyBase } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import type { User } from '../../users/user.entity';

interface LocalStrategyOptions {
  usernameField?: string;
  passwordField?: string;
  session?: boolean;
  passReqToCallback?: boolean;
}

@Injectable()
export class LocalStrategy extends PassportStrategy<LocalStrategyBase, User>(
  LocalStrategyBase,
) {
  constructor(private readonly authService: AuthService) {
    const options: LocalStrategyOptions = {
      usernameField: 'email',
    };

    super(options);
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }
    return user;
  }
}
