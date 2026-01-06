export interface WebhookPayload {
  eventType: string;
  rawPayload: Record<string, unknown>;
}

export interface WebhookHandler {
  handleWebhook(payload: WebhookPayload): void;
}
