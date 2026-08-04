import type {
  AgentRequest,
  AgentResponse,
  CompactContextPackage,
  ProviderAdapter,
  ProviderId,
  RoutingDecision,
  TaskType,
} from '@ai-company-os/agent-sdk';
import type { AuditLogger, AuditOutcome } from '@ai-company-os/audit-logger';
import type { InMemoryCostController } from '@ai-company-os/cost-controller';
import type { PolicyContext } from '@ai-company-os/policy-engine';
import { evaluateEscalation } from '@ai-company-os/policy-engine';
import { ROUTING_POLICIES } from './routing-policies';

export interface DeterministicResolution {
  structuredResult: unknown;
}

/**
 * The canonical job-queue payload shape for anything that will
 * eventually flow through `TaskRouter.routeTask()` - shared by
 * `apps/worker-service` (executes it) and `apps/agent-orchestrator`
 * (enqueues it) so the two apps never maintain their own divergent
 * copies of this shape. `agentId`/`businessId` travel with the job so
 * the eventual `routeTask()` call attributes cost/audit records to the
 * real originating agent and business, not a generic placeholder.
 */
export interface RoutedTaskJob {
  taskId: string;
  taskType: TaskType;
  context: CompactContextPackage;
  agentId: string;
  businessId: string;
}

export interface RouteTaskInput {
  taskId: string;
  taskType: TaskType;
  context: CompactContextPackage;
  policyContext: PolicyContext;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  businessId: string;
  agentId: string;
  /** Step 1 of the routing sequence: rules/templates/stored facts before any AI call. */
  tryDeterministicResolution?: () => DeterministicResolution | null;
}

export interface RouteTaskResult {
  decision: RoutingDecision;
  response: AgentResponse | null;
  deterministic: DeterministicResolution | null;
}

export interface TaskRouterDeps {
  adapters: Record<ProviderId, ProviderAdapter>;
  costController: InMemoryCostController;
  auditLogger: AuditLogger;
}

export function validateStructuredResult(response: AgentResponse): boolean {
  return (
    response.status === 'success' &&
    response.structuredResult !== undefined &&
    response.structuredResult !== null
  );
}

/**
 * Deterministic-first, single-primary-provider router. Implements the
 * AI Routing Sequence: rules first, one selected provider per task,
 * bounded escalation, at most one fallback attempt — never a chain that
 * calls every provider for the same task. See
 * docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md and DECISIONS.md ADR-0008.
 */
export class TaskRouter {
  constructor(private readonly deps: TaskRouterDeps) {}

  async routeTask(input: RouteTaskInput): Promise<RouteTaskResult> {
    const deterministic = input.tryDeterministicResolution?.() ?? null;
    if (deterministic) {
      const decision: RoutingDecision = {
        taskId: input.taskId,
        taskType: input.taskType,
        selectedProvider: ROUTING_POLICIES[input.taskType].primaryProvider,
        escalated: false,
        escalationReasons: [],
        usedDeterministicResolution: true,
      };
      this.deps.auditLogger.record({
        actor: { kind: 'system' },
        action: 'deterministic-resolution',
        taskId: input.taskId,
        taskType: input.taskType,
        outcome: 'success',
        metadata: {},
      });
      return { decision, response: null, deterministic };
    }

    const escalation = evaluateEscalation(input.policyContext);
    const policy = ROUTING_POLICIES[input.taskType];
    const selectedProvider: ProviderId = escalation.escalate ? 'anthropic' : policy.primaryProvider;

    const decision: RoutingDecision = {
      taskId: input.taskId,
      taskType: input.taskType,
      selectedProvider,
      escalated: escalation.escalate,
      escalationReasons: escalation.reasons,
      usedDeterministicResolution: false,
    };

    const request: AgentRequest = {
      taskId: input.taskId,
      taskType: input.taskType,
      provider: selectedProvider,
      model: input.model,
      context: input.context,
      maxInputTokens: input.maxInputTokens,
      maxOutputTokens: input.maxOutputTokens,
      requestedAtIso: new Date().toISOString(),
    };

    let response = await this.invokeWithBudgetCheck(
      selectedProvider,
      request,
      input.agentId,
      input.businessId,
    );

    // At most one bounded fallback attempt — never a full provider chain.
    if (response.status === 'rejected' || response.error?.classification === 'disabled-provider') {
      const fallbackProvider =
        this.deps.adapters[selectedProvider].descriptor.substitutionRules.canBeSubstitutedBy[0];
      if (fallbackProvider) {
        response = await this.invokeWithBudgetCheck(
          fallbackProvider,
          { ...request, provider: fallbackProvider },
          input.agentId,
          input.businessId,
        );
        decision.selectedProvider = fallbackProvider;
      }
    }

    this.deps.auditLogger.record({
      actor: { kind: 'provider', providerId: decision.selectedProvider },
      action: 'route-task',
      taskId: input.taskId,
      taskType: input.taskType,
      outcome: this.outcomeFor(response),
      metadata: {
        escalated: decision.escalated,
        escalationReasons: decision.escalationReasons,
        usage: response.usage,
        cost: response.cost,
      },
    });

    return { decision, response, deterministic: null };
  }

  private async invokeWithBudgetCheck(
    providerId: ProviderId,
    request: AgentRequest,
    agentId: string,
    businessId: string,
  ): Promise<AgentResponse> {
    const adapter = this.deps.adapters[providerId];
    const response = await adapter.invoke(request);
    if (response.cost.estimatedCostUsd > 0) {
      this.deps.costController.recordSpend(
        'provider',
        providerId,
        providerId,
        response.cost.estimatedCostUsd,
      );
      this.deps.costController.recordSpend(
        'agent',
        agentId,
        providerId,
        response.cost.estimatedCostUsd,
      );
      this.deps.costController.recordSpend(
        'business',
        businessId,
        providerId,
        response.cost.estimatedCostUsd,
      );
    }
    return response;
  }

  private outcomeFor(response: AgentResponse): AuditOutcome {
    if (response.status === 'escalated') return 'escalated';
    if (response.status === 'rejected') return 'rejected';
    if (response.status === 'error') return 'error';
    return 'success';
  }
}
