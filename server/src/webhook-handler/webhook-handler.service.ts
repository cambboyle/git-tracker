import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookHandler, WebhookPayload } from './webhook-handler.interface';
import { EventEntity } from '../database/entities/event.entity';

type PushPayload = {
  ref?: string;
  repository?: {
    full_name?: string;
  };
  commits?: Array<{
    message?: string;
  }>;
  [key: string]: unknown;
};

@Injectable()
export class WebhookHandlerService implements WebhookHandler {
  private readonly logger = new Logger(WebhookHandlerService.name);

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventsRepo: Repository<EventEntity>,
  ) {}

  handleWebhook(payload: WebhookPayload): void {
    const eventType = payload.eventType;
    const rawPayload = payload.rawPayload;
    console.log('Received GitHub event:', eventType);

    switch (eventType) {
      case 'ping':
        console.log('Received ping event. Hook is alive.');
        break;

      case 'push':
        this.handlePushEvent(rawPayload as PushPayload);
        break;

      default:
        console.log(`Unhandled GitHub event type: ${eventType}`);
    }
  }

  /**
   * Persist a generic GitHub event to the database.
   * Call this from the controller after parsing headers/body.
   */
  async storeGitHubEvent(params: {
    eventType: string;
    githubDeliveryId: string | null;
    repository: string;
    ref: string | null;
    actor: string | null;
    payload: Record<string, unknown>;
  }): Promise<EventEntity> {
    const { eventType, githubDeliveryId, repository, ref, actor, payload } =
      params;

    const event = this.eventsRepo.create({
      source: 'github',
      githubDeliveryId,
      eventType,
      repository,
      ref,
      actor,
      payloadJson: payload as Record<string, any>,
    });

    const saved = await this.eventsRepo.save(event);

    this.logger.log(
      `Stored GitHub event id=${saved.id} type=${eventType} repo=${repository} ref=${ref}`,
    );

    return saved;
  }

  private handlePushEvent(rawPayload: PushPayload): void {
    if (
      typeof rawPayload !== 'object' ||
      rawPayload === null ||
      (!('ref' in rawPayload) && !('repository' in rawPayload))
    ) {
      console.warn(
        '[WebhookHandlerService] Received push event with unexpected payload shape:',
        rawPayload,
      );
      return;
    }

    const ref = rawPayload.ref ?? 'refs/heads/unknown';
    const repo = rawPayload.repository?.full_name ?? 'unknown/repo';
    const commits = Array.isArray(rawPayload.commits) ? rawPayload.commits : [];

    console.log('[WebhookHandlerService][push] ref:', rawPayload.ref);
    console.log(
      '[WebhookHandlerService][push] repo:',
      rawPayload.repository?.full_name,
    );
    console.log(
      '[WebhookHandlerService][push] commits length:',
      rawPayload.commits && Array.isArray(rawPayload.commits)
        ? rawPayload.commits.length
        : 0,
    );

    const latestMessage =
      commits.length > 0 && commits[commits.length - 1]?.message
        ? commits[commits.length - 1].message
        : 'no message';

    console.log(
      `Push to ${repo} on ${ref} with ${commits.length} commit(s). Latest message:`,
      latestMessage,
    );
  }
}
