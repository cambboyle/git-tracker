import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Simple role-based guard that restricts access to admin users.
 *
 * Usage:
 *
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 *   @Controller('api/admin/...')
 *   export class SomeAdminController { ... }
 *
 * Assumes the JwtStrategy attaches a user object to `req.user` with:
 *   { userId: number; email: string; isAdmin: boolean }
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req?.user as
      | {
          userId?: number;
          id?: number;
          email?: string;
          isAdmin?: boolean;
        }
      | undefined;

    // If there's no user or isAdmin is not true, forbid.
    if (!user || user.isAdmin !== true) {
      throw new ForbiddenException('Admin privileges required');
    }

    return true;
  }
}
