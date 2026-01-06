import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@Injectable()
export class GithubWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RawBodyRequest>();
    const signatureHeader = req.headers['x-hub-signature-256'];
    const signature =
      typeof signatureHeader === 'string' ? signatureHeader : undefined;
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    const rawBody = req.rawBody;

    if (!signature || !secret || !rawBody || !Buffer.isBuffer(rawBody)) {
      throw new UnauthorizedException('Missing signature, secret or raw body');
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const digest = `sha256=${hmac.digest('hex')}`;

    const digestBuf = Buffer.from(digest);
    const sigBuf = Buffer.from(signature);

    if (
      digestBuf.length === sigBuf.length &&
      crypto.timingSafeEqual(digestBuf, sigBuf)
    ) {
      return true;
    }

    console.warn('[GithubWebhookGuard] Invalid signature for path:', req.path);
    throw new UnauthorizedException('Invalid Signature');
  }
}
