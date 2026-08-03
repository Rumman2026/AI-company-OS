import { InMemoryCostController } from '@ai-company-os/cost-controller';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import type { AuditEvent } from '@ai-company-os/audit-logger';
import { zaiGlmDescriptor } from '../zai-glm-adapter';
import { classifyLeadInquiry } from './adapter';
import {
  configurePilotBudget,
  GLM_PILOT_BUDGET_DEFAULTS,
  type GlmPilotBudgetConfig,
} from './pilot-budget';
import type { LeadInquiryClassificationRequest, PilotClassificationOutcome } from './types';

/**
 * Local mocked pilot harness (docs/cloud/GLM_SANDBOX_PILOT.md Stage 5).
 * Wires a fresh InMemoryCostController + ConsoleAuditLogger + a private,
 * mutable copy of the zai-glm descriptor around classifyLeadInquiry, so
 * each scenario runs against isolated state and its audit trail can be
 * inspected afterward. Never touches the real provider registry — no
 * other provider adapter is imported or invoked by this module at all,
 * which is itself part of the "no unnecessary provider calls" proof.
 */
export class GlmPilotSandboxHarness {
  readonly costController: InMemoryCostController;
  readonly auditLogger: ConsoleAuditLogger;
  private readonly descriptor: typeof zaiGlmDescriptor;
  /** The config this harness was built with — classify() uses this by default so a cost-controller limit set at construction time and the adapter's own runtime checks (timeout/retry/cost-cap) never silently disagree. */
  private readonly budgetConfig: GlmPilotBudgetConfig;
  private callCount = 0;

  constructor(budgetConfig: GlmPilotBudgetConfig = GLM_PILOT_BUDGET_DEFAULTS) {
    this.costController = new InMemoryCostController();
    this.auditLogger = new ConsoleAuditLogger();
    this.budgetConfig = budgetConfig;
    configurePilotBudget(this.costController, budgetConfig);
    // Deep-enough clone so tests can flip killSwitchEnabled/healthStatus
    // on one harness instance without mutating the shared module-level
    // zaiGlmDescriptor used elsewhere in the test suite.
    this.descriptor = {
      ...zaiGlmDescriptor,
      retryPolicy: { ...zaiGlmDescriptor.retryPolicy },
      rateLimit: { ...zaiGlmDescriptor.rateLimit },
      substitutionRules: {
        canBeSubstitutedBy: [...zaiGlmDescriptor.substitutionRules.canBeSubstitutedBy],
        canSubstituteFor: [...zaiGlmDescriptor.substitutionRules.canSubstituteFor],
      },
    };
  }

  engageKillSwitch(): void {
    this.descriptor.killSwitchEnabled = true;
  }

  disableHealth(): void {
    this.descriptor.healthStatus = 'disabled';
  }

  getCallCount(): number {
    return this.callCount;
  }

  getAuditEvents(): AuditEvent[] {
    return this.auditLogger.query();
  }

  /** Every audit event's actor.providerId (when present) — proves only zai-glm was ever exercised. */
  getDistinctProviderActors(): string[] {
    const providerIds = this.getAuditEvents()
      .map((event) => (event.actor.kind === 'provider' ? event.actor.providerId : null))
      .filter((id): id is NonNullable<typeof id> => id !== null);
    return [...new Set(providerIds)];
  }

  async classify(
    request: LeadInquiryClassificationRequest,
    mockCallRawModel: (req: LeadInquiryClassificationRequest) => Promise<unknown>,
    /** Per-call override (e.g. a shorter timeout for a test) — defaults to the config this harness was constructed with, so the cost-controller's dollar limits and the adapter's own runtime checks stay consistent unless a test deliberately diverges them. */
    budgetConfigOverride?: GlmPilotBudgetConfig,
  ): Promise<PilotClassificationOutcome> {
    const budgetConfig = budgetConfigOverride ?? this.budgetConfig;
    return classifyLeadInquiry(
      {
        descriptor: this.descriptor,
        costController: this.costController,
        auditLogger: this.auditLogger,
        callRawModel: async (req) => {
          this.callCount += 1;
          return mockCallRawModel(req);
        },
        budgetConfig,
      },
      request,
    );
  }
}

/** Fixed-response mock — resolves immediately with the given fixture. */
export function fixedResponseMock(
  response: unknown,
): (req: LeadInquiryClassificationRequest) => Promise<unknown> {
  return async () => response;
}

/** Always-hangs mock — never resolves before the caller's timeout fires. */
export function hangingMock(): (req: LeadInquiryClassificationRequest) => Promise<unknown> {
  return () => new Promise(() => {});
}

/** Always-throws mock — simulates a persistent non-timeout provider error. */
export function throwingMock(
  message = 'simulated provider error',
): (req: LeadInquiryClassificationRequest) => Promise<unknown> {
  return async () => {
    throw new Error(message);
  };
}
