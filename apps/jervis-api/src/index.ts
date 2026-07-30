import { InMemoryCostController } from '@ai-company-os/cost-controller';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import { ControlPlane } from './control-plane';

// Jervis control API — owner-facing control plane for provider health,
// budgets, kill switches, and audit queries. No prior Hermes/Jervis code
// existed in this repository before this stage (confirmed by audit) —
// see DECISIONS.md ADR-0008. Phase 1 / repository-preparation fidelity:
// no HTTP server, no production access, no credential read.

async function demonstrateControlPlane(): Promise<void> {
  const costController = new InMemoryCostController();
  costController.setBudget('business', 'greencal-pressure-washing', {
    dailyLimitUsd: 20,
    monthlyLimitUsd: 300,
  });
  const controlPlane = new ControlPlane(costController, new ConsoleAuditLogger());

  const health = await controlPlane.getProviderHealth();
  const budget = controlPlane.getBudgetStatus('business', 'greencal-pressure-washing');

  console.log(
    'Jervis API placeholder running:',
    JSON.stringify({ providerHealth: health, budget }),
  );
}

void demonstrateControlPlane();
