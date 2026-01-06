import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (Buffer.isBuffer(req.body)) {
      req['rawBody'] = req.body;
    } else {
      req['rawBody'] = Buffer.from('');
    }
    next();
  }
}
