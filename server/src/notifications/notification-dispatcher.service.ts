import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../database/entities/event.entity';
import { DestinationEntity } from '../database/entities/destination.entity';
import {
  DeliveryEntity,
  DeliveryStatus,
} from '../database/entities/delivery.entity';
import { RoutingRuleEntity } from 'src/database/entities/routing-rule.entity';

type GitHubPushPayload = {
  ref?: string;
  compare?: string;
  pusher?: { name?: string };
  head_commit?: { message?: string };
  commits?: Array<{
    id?: string;
    message?: string;
  }>;
};

type GitHubPullRequestPayload = {
  action?: string;
  number?: number;
  pull_request?: {
    title?: string;
    state?: string;
    merged?: boolean;
    html_url?: string;
    user?: { login?: string };
    base?: { ref?: string };
    head?: { ref?: string };
    additions?: number;
    deletions?: number;
    changed_files?: number;
    body?: string | null;
  };
  repository?: {
    full_name?: string;
  };
  sender?: { login?: string };
};

type GitHubIssuesPayload = {
  action?: string;
  issue?: {
    number?: number;
    title?: string;
    state?: string;
    html_url?: string;
    user?: { login?: string };
    body?: string | null;
    labels?: Array<{ name?: string }>;
  };
  repository?: {
    full_name?: string;
  };
  sender?: { login?: string };
};

type GitHubIssueCommentPayload = {
  action?: string;
  issue?: {
    number?: number;
    title?: string;
    html_url?: string;
  };
  comment?: {
    body?: string | null;
    html_url?: string;
    user?: { login?: string };
  };
  repository?: {
    full_name?: string;
  };
  sender?: { login?: string };
};

type GitHubReleasePayload = {
  action?: string;
  release?: {
    tag_name?: string;
    name?: string | null;
    html_url?: string;
    body?: string | null;
    draft?: boolean;
    prerelease?: boolean;
  };
  repository?: {
    full_name?: string;
  };
  sender?: { login?: string };
};

type SlackPayload = {
  text: string;
  mrkdwn?: boolean;
};

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    @InjectRepository(DestinationEntity)
    private readonly destinationsRepo: Repository<DestinationEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveriesRepo: Repository<DeliveryEntity>,
    @InjectRepository(RoutingRuleEntity)
    private readonly routingRulesRepo: Repository<RoutingRuleEntity>,
  ) {}

  async dispatchEvent(event: EventEntity): Promise<void> {
    const rules = await this.routingRulesRepo.find({
      where: { enabled: true },
    });

    const matchingRules = rules.filter((rule) => {
      if (rule.repository && rule.repository !== event.repository) {
        return false;
      }
      if (rule.ref && rule.ref !== event.ref) {
        return false;
      }
      if (rule.eventType && rule.eventType !== event.eventType) {
        return false;
      }
      return true;
    });

    if (!matchingRules.length) {
      this.logger.warn(
        `No routing rules matched for event id=${event.id} (repo=${event.repository}, ref=${event.ref}, type=${event.eventType}); skipping dispatch`,
      );
      return;
    }

    const destinationsMap = new Map<number, DestinationEntity>();
    for (const rule of matchingRules) {
      const dest = rule.destination;
      if (dest.enabled) {
        destinationsMap.set(dest.id, dest);
      }
    }
    const destinations = Array.from(destinationsMap.values());

    if (!destinations.length) {
      this.logger.warn(
        `Matched rules but no enabled destinations for event id=${event.id}; skipping dispatch`,
      );
      return;
    }

    this.logger.log(
      `Dispatching event id=${event.id} to ${destinations.length} destination(s) based on ${matchingRules.length} routing rule(s)`,
    );

    for (const destination of destinations) {
      await this.dispatchToDestination(event, destination);
    }
  }

  private async dispatchToDestination(
    event: EventEntity,
    destination: DestinationEntity,
  ): Promise<void> {
    let delivery = this.deliveriesRepo.create({
      event,
      destination,
      status: 'PENDING' as DeliveryStatus,
    });
    delivery = await this.deliveriesRepo.save(delivery);

    try {
      const discordPayload = this.buildDiscordPayload(event);

      if (destination.type === 'DISCORD_WEBHOOK') {
        const config = destination.configJson as {
          webhookUrl?: string;
          [key: string]: unknown;
        };

        const webhookUrl = config.webhookUrl;
        if (!webhookUrl) {
          throw new Error(
            `Destination ${destination.id} missing webhookUrl in configJson`,
          );
        }

        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordPayload),
        });

        const text = await res.text();

        delivery.status = res.ok ? 'SUCCESS' : 'FAILED';
        delivery.responseCode = res.status;
        delivery.requestedPayloadJson = discordPayload;
        delivery.responseBody = text.slice(0, 2000); // avoid huge rows
        delivery.errorMessage = res.ok ? null : `HTTP ${res.status}`;
        await this.deliveriesRepo.save(delivery);

        this.logger.log(
          `Sent event id=${event.id} to Discord destination id=${destination.id} with status ${res.status}`,
        );
      } else if (destination.type === 'SLACK_WEBHOOK') {
        const config = destination.configJson as {
          webhookUrl?: string;
          [key: string]: unknown;
        };

        const webhookUrl = config.webhookUrl;
        if (!webhookUrl) {
          throw new Error(
            `Destination ${destination.id} missing webhookUrl in configJson`,
          );
        }

        const slackPayload = this.buildSlackPayload(event);

        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });

        const text = await res.text();

        delivery.status = res.ok ? 'SUCCESS' : 'FAILED';
        delivery.responseCode = res.status;
        delivery.requestedPayloadJson = slackPayload;
        delivery.responseBody = text.slice(0, 2000);
        delivery.errorMessage = res.ok ? null : `HTTP ${res.status}`;
        await this.deliveriesRepo.save(delivery);

        this.logger.log(
          `Sent event id=${event.id} to Slack destination id=${destination.id} with status ${res.status}`,
        );
      } else {
        this.logger.log(
          `No adapter implemented for destination type=${destination.type}, simulating success.`,
        );
        delivery.status = 'SUCCESS';
        delivery.responseCode = 200;
        delivery.requestedPayloadJson = discordPayload;
        delivery.responseBody = 'Simulated OK (no adapter)';
        await this.deliveriesRepo.save(delivery);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Unknown error';
      this.logger.error(
        `Failed to send event id=${event.id} to destination id=${destination.id}: ${message}`,
      );
      delivery.status = 'FAILED';
      delivery.errorMessage = message;
      await this.deliveriesRepo.save(delivery);
    }
  }

  private buildDiscordPayload(event: EventEntity): Record<string, any> {
    const type = event.eventType;

    if (type === 'push') {
      return this.buildPushPayload(event);
    }

    if (type === 'pull_request') {
      return this.buildPullRequestPayload(event);
    }

    if (type === 'issues') {
      return this.buildIssuesPayload(event);
    }

    if (type === 'issue_comment') {
      return this.buildIssueCommentPayload(event);
    }

    if (type === 'release') {
      return this.buildReleasePayload(event);
    }

    const fallbackTitle = `[${event.repository}] ${event.eventType}`;
    const fallbackDescriptionLines = [
      event.ref ? `Ref: ${event.ref}` : null,
      event.actor ? `Actor: ${event.actor}` : null,
    ].filter(Boolean) as string[];

    return {
      content: '',
      embeds: [
        {
          title: fallbackTitle,
          description:
            fallbackDescriptionLines.join('\n') || 'New GitHub event',
          timestamp: event.createdAt.toISOString(),
          color: 0x00ff99,
        },
      ],
    };
  }

  private buildSlackPayload(event: EventEntity): SlackPayload {
    const type = event.eventType;
    const repo = event.repository;
    const ref = event.ref;
    const actor = event.actor;

    const base = `*${repo}* — \`${type}\``;

    if (type === 'push') {
      const payload = event.payloadJson as GitHubPushPayload;
      const branchRef = ref ?? payload.ref ?? 'unknown ref';
      const branch = branchRef.startsWith('refs/heads/')
        ? branchRef.replace('refs/heads/', '')
        : branchRef;
      const commits = Array.isArray(payload.commits) ? payload.commits : [];
      const commitCount = commits.length;
      const latestCommit =
        commitCount > 0 ? commits[commitCount - 1] : undefined;
      const latestMessage =
        latestCommit?.message ?? payload.head_commit?.message;

      const parts: string[] = [];
      parts.push(`${base} on \`${branch}\``);
      if (actor) {
        parts.push(`by *${actor}*`);
      }
      parts.push(`(${commitCount} commit${commitCount === 1 ? '' : 's'})`);

      if (latestMessage) {
        parts.push(`\n> ${latestMessage.substring(0, 300)}`);
      }

      return {
        text: parts.join(' '),
        mrkdwn: true,
      };
    }

    if (type === 'pull_request') {
      const payload = event.payloadJson as GitHubPullRequestPayload;
      const action = payload.action ?? 'updated';
      const pr = payload.pull_request ?? {};
      const number = payload.number ?? null;
      const title = pr.title ?? 'Untitled PR';
      const prAuthor =
        pr.user?.login ?? payload.sender?.login ?? actor ?? 'unknown';
      const baseBranch = pr.base?.ref ?? 'unknown';
      const headBranch = pr.head?.ref ?? 'unknown';

      const parts: string[] = [];
      parts.push(`${base} — PR #${number ?? '?'} *${title}*`);
      parts.push(`\n*Action:* ${action}`);
      parts.push(`\n*Author:* ${prAuthor}`);
      parts.push(`\n*Base → Head:* \`${baseBranch}\` ← \`${headBranch}\``);

      if (pr.html_url) {
        parts.push(`\n<${pr.html_url}|View PR>`);
      }

      return {
        text: parts.join(''),
        mrkdwn: true,
      };
    }

    if (type === 'issues') {
      const payload = event.payloadJson as GitHubIssuesPayload;
      const action = payload.action ?? 'updated';
      const issue = payload.issue ?? {};
      const number = issue.number ?? null;
      const title = issue.title ?? 'Untitled issue';
      const issueAuthor =
        issue.user?.login ?? payload.sender?.login ?? actor ?? 'unknown';

      const parts: string[] = [];
      parts.push(`${base} — Issue #${number ?? '?'} *${title}*`);
      parts.push(`\n*Action:* ${action}`);
      parts.push(`\n*Author:* ${issueAuthor}`);

      if (issue.html_url) {
        parts.push(`\n<${issue.html_url}|View issue>`);
      }

      return {
        text: parts.join(''),
        mrkdwn: true,
      };
    }

    if (type === 'issue_comment') {
      const payload = event.payloadJson as GitHubIssueCommentPayload;
      const action = payload.action ?? 'created';
      const issue = payload.issue ?? {};
      const comment = payload.comment ?? {};
      const issueNumber = issue.number ?? null;
      const issueTitle = issue.title ?? 'Untitled issue';
      const commenter =
        comment.user?.login ?? payload.sender?.login ?? actor ?? 'unknown';

      const body = (comment.body ?? '') || '';
      const bodySnippet =
        body.length > 200 ? `${body.substring(0, 197)}...` : body;

      const parts: string[] = [];
      parts.push(
        `${base} — Comment on issue #${issueNumber ?? '?'} *${issueTitle}*`,
      );
      parts.push(`\n*Action:* ${action}`);
      parts.push(`\n*Commenter:* ${commenter}`);
      if (bodySnippet) {
        parts.push(`\n> ${bodySnippet.replace(/\r?\n/g, ' ')}`);
      }
      if (comment.html_url ?? issue.html_url) {
        parts.push(`\n<${comment.html_url ?? issue.html_url}|View comment>`);
      }

      return {
        text: parts.join(''),
        mrkdwn: true,
      };
    }

    if (type === 'release') {
      const payload = event.payloadJson as GitHubReleasePayload;
      const action = payload.action ?? 'published';
      const release = payload.release ?? {};
      const tag = release.tag_name ?? 'untagged';
      const name = (release.name ?? '') || tag;

      const parts: string[] = [];
      parts.push(`${base} — Release *${name}* (\`${tag}\`)`);
      parts.push(`\n*Action:* ${action}`);
      if (release.html_url) {
        parts.push(`\n<${release.html_url}|View release>`);
      }

      return {
        text: parts.join(''),
        mrkdwn: true,
      };
    }

    // Generic fallback
    const parts: string[] = [];
    parts.push(base);
    if (actor) {
      parts.push(` by *${actor}*`);
    }
    if (ref) {
      parts.push(` on \`${ref}\``);
    }

    return {
      text: parts.join(''),
      mrkdwn: true,
    };
  }

  private buildPushPayload(event: EventEntity): Record<string, any> {
    const payload = event.payloadJson as GitHubPushPayload;

    if (!payload || typeof payload !== 'object') {
      return this.buildDiscordPayload(event);
    }

    const repo = event.repository;
    const ref = event.ref ?? payload.ref ?? 'unknown ref';
    const branch = ref.startsWith('refs/heads/')
      ? ref.replace('refs/heads/', '')
      : ref;
    const actor = event.actor ?? payload.pusher?.name ?? 'unknown';

    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const commitCount = commits.length;
    const compareUrl = payload.compare;

    const latestCommit = commitCount > 0 ? commits[commitCount - 1] : null;
    const latestMessage =
      latestCommit?.message ?? payload.head_commit?.message ?? 'no message';

    const title = `Push to ${repo} (${branch})`;
    const descriptionLines: string[] = [];

    descriptionLines.push(`**Branch:** \`${branch}\``);
    descriptionLines.push(`**Pusher:** ${actor}`);
    descriptionLines.push(`**Commits:** ${commitCount}`);

    if (latestMessage) {
      descriptionLines.push('');
      descriptionLines.push(
        `**Latest commit:**\n${latestMessage.substring(0, 300)}`,
      );
    }

    const description = descriptionLines.join('\n');

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (commitCount > 0 && commits[commitCount - 1]?.id) {
      const shortSha = String(commits[commitCount - 1].id).slice(0, 7);
      fields.push({
        name: 'Head SHA',
        value: `\`${shortSha}\``,
        inline: true,
      });
    }

    if (compareUrl) {
      fields.push({
        name: 'Compare',
        value: `[View diff](${compareUrl})`,
        inline: true,
      });
    }

    return {
      content: '',
      embeds: [
        {
          title,
          description,
          fields,
          timestamp: event.createdAt.toISOString(),
          color: 0x00ff99,
        },
      ],
    };
  }

  private buildPullRequestPayload(event: EventEntity): Record<string, any> {
    const payload = event.payloadJson as GitHubPullRequestPayload;
    const repo = payload.repository?.full_name ?? event.repository;
    const action = payload.action ?? 'updated';
    const pr = payload.pull_request ?? {};
    const number = payload.number ?? null;

    const titleText = pr.title ?? 'Untitled PR';
    const state = pr.merged ? 'merged' : (pr.state ?? 'open');
    const baseBranch = pr.base?.ref ?? 'unknown';
    const headBranch = pr.head?.ref ?? 'unknown';
    const author =
      pr.user?.login ?? payload.sender?.login ?? event.actor ?? 'unknown';
    const url = pr.html_url;
    const additions = pr.additions ?? 0;
    const deletions = pr.deletions ?? 0;
    const changedFiles = pr.changed_files ?? 0;

    const body = (pr.body ?? '') || '';
    const bodySnippet =
      body.length > 300 ? `${body.substring(0, 297)}...` : body;

    const title = `PR #${number ?? '?'}: ${titleText} (${action})`;

    const descriptionLines: string[] = [];
    descriptionLines.push(`**Repository:** \`${repo}\``);
    descriptionLines.push(`**Author:** ${author}`);
    descriptionLines.push(
      `**Base → Head:** \`${baseBranch}\` ← \`${headBranch}\``,
    );
    descriptionLines.push(`**State:** ${state}`);

    if (bodySnippet) {
      descriptionLines.push('');
      descriptionLines.push(`**Description:**\n${bodySnippet}`);
    }

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    fields.push({
      name: 'Changes',
      value: `+${additions} / -${deletions} (${changedFiles} files)`,
      inline: true,
    });

    if (url) {
      fields.push({
        name: 'GitHub',
        value: `[View PR](${url})`,
        inline: true,
      });
    }

    return {
      content: '',
      embeds: [
        {
          title,
          description: descriptionLines.join('\n'),
          fields,
          timestamp: event.createdAt.toISOString(),
          color: pr.merged
            ? 0x6f42c1
            : state === 'closed'
              ? 0xcb2431
              : 0x0366d6,
        },
      ],
    };
  }

  private buildIssuesPayload(event: EventEntity): Record<string, any> {
    const payload = event.payloadJson as GitHubIssuesPayload;
    const repo = payload.repository?.full_name ?? event.repository;
    const action = payload.action ?? 'updated';
    const issue = payload.issue ?? {};

    const number = issue.number ?? null;
    const titleText = issue.title ?? 'Untitled issue';
    const state = issue.state ?? 'open';
    const author =
      issue.user?.login ?? payload.sender?.login ?? event.actor ?? 'unknown';
    const url = issue.html_url;

    const body = (issue.body ?? '') || '';
    const bodySnippet =
      body.length > 300 ? `${body.substring(0, 297)}...` : body;

    const labels = Array.isArray(issue.labels) ? issue.labels : [];
    const labelNames = labels
      .map((l) => l?.name)
      .filter(Boolean)
      .slice(0, 5) as string[];

    const title = `Issue #${number ?? '?'}: ${titleText} (${action})`;

    const descriptionLines: string[] = [];
    descriptionLines.push(`**Repository:** \`${repo}\``);
    descriptionLines.push(`**Author:** ${author}`);
    descriptionLines.push(`**State:** ${state}`);

    if (labelNames.length) {
      descriptionLines.push(
        `**Labels:** ${labelNames.map((l) => `\`${l}\``).join(', ')}`,
      );
    }

    if (bodySnippet) {
      descriptionLines.push('');
      descriptionLines.push(`**Description:**\n${bodySnippet}`);
    }

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (url) {
      fields.push({
        name: 'GitHub',
        value: `[View issue](${url})`,
        inline: true,
      });
    }

    return {
      content: '',
      embeds: [
        {
          title,
          description: descriptionLines.join('\n'),
          fields,
          timestamp: event.createdAt.toISOString(),
          color: state === 'closed' ? 0xcb2431 : 0x0366d6,
        },
      ],
    };
  }

  private buildIssueCommentPayload(event: EventEntity): Record<string, any> {
    const payload = event.payloadJson as GitHubIssueCommentPayload;
    const repo = payload.repository?.full_name ?? event.repository;
    const action = payload.action ?? 'created';

    const issue = payload.issue ?? {};
    const comment = payload.comment ?? {};

    const issueNumber = issue.number ?? null;
    const issueTitle = issue.title ?? 'Untitled issue';
    const issueUrl = issue.html_url;

    const commenter =
      comment.user?.login ?? payload.sender?.login ?? event.actor ?? 'unknown';
    const commentUrl = comment.html_url ?? issueUrl;

    const body = (comment.body ?? '') || '';
    const bodySnippet =
      body.length > 300 ? `${body.substring(0, 297)}...` : body;

    const title = `Comment on issue #${issueNumber ?? '?'}: ${issueTitle} (${action})`;

    const descriptionLines: string[] = [];
    descriptionLines.push(`**Repository:** \`${repo}\``);
    descriptionLines.push(`**Commenter:** ${commenter}`);

    if (bodySnippet) {
      descriptionLines.push('');
      descriptionLines.push(`**Comment:**\n${bodySnippet}`);
    }

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (commentUrl) {
      fields.push({
        name: 'GitHub',
        value: `[View comment](${commentUrl})`,
        inline: true,
      });
    }

    return {
      content: '',
      embeds: [
        {
          title,
          description: descriptionLines.join('\n'),
          fields,
          timestamp: event.createdAt.toISOString(),
          color: 0x6f42c1,
        },
      ],
    };
  }

  private buildReleasePayload(event: EventEntity): Record<string, any> {
    const payload = event.payloadJson as GitHubReleasePayload;
    const repo = payload.repository?.full_name ?? event.repository;
    const action = payload.action ?? 'published';

    const release = payload.release ?? {};
    const tag = release.tag_name ?? 'untagged';
    const name = (release.name ?? '') || tag;
    const url = release.html_url;

    const body = (release.body ?? '') || '';
    const bodySnippet =
      body.length > 600 ? `${body.substring(0, 597)}...` : body;

    const flags: string[] = [];
    if (release.draft) {
      flags.push('draft');
    }
    if (release.prerelease) {
      flags.push('prerelease');
    }

    const title =
      `Release ${name} (${tag}) ${flags.length ? `[${flags.join(', ')}]` : ''}`.trim();

    const descriptionLines: string[] = [];
    descriptionLines.push(`**Repository:** \`${repo}\``);
    descriptionLines.push(`**Action:** ${action}`);

    if (bodySnippet) {
      descriptionLines.push('');
      descriptionLines.push(`**Notes:**\n${bodySnippet}`);
    }

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

    if (url) {
      fields.push({
        name: 'GitHub',
        value: `[View release](${url})`,
        inline: true,
      });
    }

    return {
      content: '',
      embeds: [
        {
          title,
          description: descriptionLines.join('\n'),
          fields,
          timestamp: event.createdAt.toISOString(),
          color: 0x28a745,
        },
      ],
    };
  }
}
