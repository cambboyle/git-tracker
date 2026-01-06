import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { WebhookHandlerService } from './webhook-handler.service';
import { GithubWebhookGuard } from '../common/guards/github-webhook.guard';
import type { WebhookPayload } from './webhook-handler.interface';
import type { Request } from 'express';
import { NotificationDispatcherService } from 'src/notifications/notification-dispatcher.service';

@Controller('webhook-handler')
export class WebhookHandlerController {
  constructor(
    private readonly webhookHandler: WebhookHandlerService,
    private readonly notificationDispatcher: NotificationDispatcherService,
  ) {}

  @Post()
  @UseGuards(GithubWebhookGuard)
  async handleWebhook(
    @Body() _ignoredBody: unknown,
    @Headers('x-github-event') event: string,
    @Headers('x-github-delivery') githubDeliveryId: string,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<string> {
    const start = new Date();
    console.log(`[${start.toISOString()}] Webhook handling started (${event})`);

    try {
      const rawBody = req.rawBody;
      if (!rawBody || !Buffer.isBuffer(rawBody)) {
        throw new Error('Missing or invalid rawBody on request');
      }

      const parsed = JSON.parse(rawBody.toString('utf8')) as Record<
        string,
        unknown
      >;
      type MinimalGitHubPayload = {
        ref?: string;
        repository?: {
          full_name?: string;
          owner?: { login?: string };
          name?: string;
        };
        pusher?: { name?: string };
        sender?: { login?: string };
      };

      const payload = parsed as MinimalGitHubPayload;

      const repoFullName =
        payload.repository?.full_name ??
        `${payload.repository?.owner?.login ?? 'unknown'}/${
          payload.repository?.name ?? 'unknown'
        }`;

      const ref = payload.ref ?? null;

      const actor = payload.pusher?.name ?? payload.sender?.login ?? null;

      const savedEvent = await this.webhookHandler.storeGitHubEvent({
        eventType: event,
        githubDeliveryId: githubDeliveryId ?? null,
        repository: repoFullName,
        ref,
        actor,
        payload: parsed,
      });

      try {
        await this.notificationDispatcher.dispatchEvent(savedEvent);
      } catch (dispatchErr) {
        console.error(
          '[WebhookHandlerController] Error dispatching notifications:',
          dispatchErr,
        );
      }

      const typedPayload: WebhookPayload = {
        eventType: event,
        rawPayload: parsed,
      };

      this.webhookHandler.handleWebhook(typedPayload);

      const end = new Date();
      console.log(
        `[${end.toISOString()}] Webhook handling finished (${event}) (eventId=${savedEvent.id})`,
      );
      return 'Webhook handled successfully';
    } catch (err) {
      const errorTime = new Date();
      console.error(
        `[${errorTime.toISOString()}] Error handling webhook (${event}):`,
        err,
      );
      return 'Error handling webhook';
    }
  }
}
