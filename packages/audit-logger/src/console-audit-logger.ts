import { randomUUID } from 'node:crypto';
import type { AuditEvent, AuditEventInput, AuditLogger } from './types';
import { redactSecrets } from './redact';

/**
 * Console-backed, secret-redacted audit trail. Distinct from
 * packages/telemetry (general instrumentation): this package exists for
 * compliance-oriented, security-relevant events — provider calls, spend,
 * policy decisions, escalations — that need their own retention and
 * integrity guarantees (see DECISIONS.md ADR-0008). Real durable storage
 * (append-only table on the Hostinger VPS Postgres instance) is future
 * work.
 */
export class ConsoleAuditLogger implements AuditLogger {
  private readonly events: AuditEvent[] = [];

  record(input: AuditEventInput): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      timestampIso: new Date().toISOString(),
      ...input,
      metadata: redactSecrets(input.metadata),
    };
    this.events.push(event);
    // eslint-disable-next-line no-console -- intentional audit sink for this placeholder stage
    console.log(JSON.stringify({ audit: event }));
    return event;
  }

  query(filter: Partial<Pick<AuditEvent, 'taskId' | 'outcome'>> = {}): AuditEvent[] {
    return this.events.filter((event) => {
      if (filter.taskId !== undefined && event.taskId !== filter.taskId) {
        return false;
      }
      if (filter.outcome !== undefined && event.outcome !== filter.outcome) {
        return false;
      }
      return true;
    });
  }
}
