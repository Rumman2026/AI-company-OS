import type { ProviderId, TaskType } from '@ai-company-os/agent-sdk';

export type AuditActor =
  | { kind: 'provider'; providerId: ProviderId }
  | { kind: 'agent'; agentId: string }
  | { kind: 'owner' }
  | { kind: 'system' };

export type AuditOutcome = 'success' | 'error' | 'escalated' | 'rejected' | 'policy-blocked';

export interface AuditEvent {
  id: string;
  timestampIso: string;
  actor: AuditActor;
  action: string;
  taskId: string | null;
  taskType: TaskType | null;
  outcome: AuditOutcome;
  metadata: Record<string, unknown>;
}

export type AuditEventInput = Omit<AuditEvent, 'id' | 'timestampIso'>;

export interface AuditLogger {
  record(event: AuditEventInput): AuditEvent;
  query(filter?: Partial<Pick<AuditEvent, 'taskId' | 'outcome'>>): AuditEvent[];
}
