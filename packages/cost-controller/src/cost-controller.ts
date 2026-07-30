import type { ProviderId } from '@ai-company-os/agent-sdk';
import type { BudgetLimits, BudgetScope, BudgetStatus, SpendRecord } from './types';

interface ScopedLedger {
  limits: BudgetLimits;
  records: SpendRecord[];
  killSwitchEngaged: boolean;
}

function scopeKey(scope: BudgetScope, scopeId: string): string {
  return `${scope}:${scopeId}`;
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function isSameUtcMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/**
 * In-memory per-provider/per-agent/per-business budget tracker with kill
 * switches. Real persistence (Redis/Postgres on the Hostinger VPS) is
 * future work — see docs/cloud/COST_CONTROL_POLICY.md.
 */
export class InMemoryCostController {
  private readonly ledgers = new Map<string, ScopedLedger>();

  setBudget(scope: BudgetScope, scopeId: string, limits: BudgetLimits): void {
    const key = scopeKey(scope, scopeId);
    const existing = this.ledgers.get(key);
    this.ledgers.set(key, {
      limits,
      records: existing?.records ?? [],
      killSwitchEngaged: existing?.killSwitchEngaged ?? false,
    });
  }

  recordSpend(scope: BudgetScope, scopeId: string, provider: ProviderId, amountUsd: number): void {
    const key = scopeKey(scope, scopeId);
    const ledger = this.ledgers.get(key);
    if (!ledger) {
      throw new Error(`No budget configured for ${key}; call setBudget() first`);
    }
    ledger.records.push({
      scope,
      scopeId,
      provider,
      amountUsd,
      recordedAtIso: new Date().toISOString(),
    });
  }

  engageKillSwitch(scope: BudgetScope, scopeId: string): void {
    const ledger = this.ledgers.get(scopeKey(scope, scopeId));
    if (ledger) {
      ledger.killSwitchEngaged = true;
    }
  }

  releaseKillSwitch(scope: BudgetScope, scopeId: string): void {
    const ledger = this.ledgers.get(scopeKey(scope, scopeId));
    if (ledger) {
      ledger.killSwitchEngaged = false;
    }
  }

  getStatus(scope: BudgetScope, scopeId: string): BudgetStatus {
    const ledger = this.ledgers.get(scopeKey(scope, scopeId));
    if (!ledger) {
      throw new Error(
        `No budget configured for ${scopeKey(scope, scopeId)}; call setBudget() first`,
      );
    }

    const now = new Date();
    const spentTodayUsd = ledger.records
      .filter((r) => isSameUtcDay(new Date(r.recordedAtIso), now))
      .reduce((sum, r) => sum + r.amountUsd, 0);
    const spentThisMonthUsd = ledger.records
      .filter((r) => isSameUtcMonth(new Date(r.recordedAtIso), now))
      .reduce((sum, r) => sum + r.amountUsd, 0);

    const withinBudget =
      !ledger.killSwitchEngaged &&
      spentTodayUsd <= ledger.limits.dailyLimitUsd &&
      spentThisMonthUsd <= ledger.limits.monthlyLimitUsd;

    return {
      scope,
      scopeId,
      spentTodayUsd,
      spentThisMonthUsd,
      dailyLimitUsd: ledger.limits.dailyLimitUsd,
      monthlyLimitUsd: ledger.limits.monthlyLimitUsd,
      withinBudget,
      killSwitchEngaged: ledger.killSwitchEngaged,
    };
  }
}
