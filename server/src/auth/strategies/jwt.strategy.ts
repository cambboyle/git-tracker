import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as JwtStrategyBase, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: number;
  email: string;
  isAdmin: boolean;
}

interface JwtUser {
  userId: number;
  email: string;
  isAdmin: boolean;
}

type JwtExtractor = (req: unknown) => string | null;

// Minimal reimplementation of ExtractJwt.fromAuthHeaderAsBearerToken()
// to avoid calling untyped helpers from passport-jwt.
const bearerTokenExtractor: JwtExtractor = (req: unknown): string | null => {
  if (
    !req ||
    typeof req !== 'object' ||
    !('headers' in req) ||
    typeof (req as { headers: unknown }).headers !== 'object' ||
    (req as { headers: { authorization?: unknown } }).headers.authorization ==
      null
  ) {
    return null;
  }

  const { authorization } = (
    req as {
      headers: { authorization?: unknown };
    }
  ).headers;

  if (typeof authorization !== 'string') {
    return null;
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return null;
  }

  return token || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy<JwtStrategyBase, JwtUser>(
  JwtStrategyBase,
) {
  constructor(config: ConfigService) {
    const jwtOptions: StrategyOptions = {
      jwtFromRequest: bearerTokenExtractor,
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
    };

    super(jwtOptions);
  }

  validate(payload: JwtPayload): JwtUser {
    return {
      userId: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
    };
  }
}
