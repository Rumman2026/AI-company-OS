import type { ProviderId } from '@ai-company-os/agent-sdk';

export type BudgetScope = 'global' | 'provider' | 'agent' | 'business';

export interface BudgetLimits {
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
}

export interface BudgetStatus {
  scope: BudgetScope;
  scopeId: string;
  spentTodayUsd: number;
  spentThisMonthUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  withinBudget: boolean;
  killSwitchEngaged: boolean;
}

export interface SpendRecord {
  scope: BudgetScope;
  scopeId: string;
  provider: ProviderId;
  amountUsd: number;
  recordedAtIso: string;
}
