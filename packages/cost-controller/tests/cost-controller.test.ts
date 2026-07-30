import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryCostController } from '../src/cost-controller';

test('recordSpend accumulates and getStatus reports within-budget', () => {
  const controller = new InMemoryCostController();
  controller.setBudget('provider', 'zai-glm', { dailyLimitUsd: 5, monthlyLimitUsd: 50 });
  controller.recordSpend('provider', 'zai-glm', 'zai-glm', 1);
  controller.recordSpend('provider', 'zai-glm', 'zai-glm', 2);

  const status = controller.getStatus('provider', 'zai-glm');
  assert.equal(status.spentTodayUsd, 3);
  assert.equal(status.withinBudget, true);
});

test('exceeding the daily limit flips withinBudget to false', () => {
  const controller = new InMemoryCostController();
  controller.setBudget('agent', 'greencal-website-health-agent', {
    dailyLimitUsd: 1,
    monthlyLimitUsd: 10,
  });
  controller.recordSpend('agent', 'greencal-website-health-agent', 'anthropic', 2);

  const status = controller.getStatus('agent', 'greencal-website-health-agent');
  assert.equal(status.withinBudget, false);
});

test('kill switch forces withinBudget to false regardless of spend', () => {
  const controller = new InMemoryCostController();
  controller.setBudget('business', 'greencal-pressure-washing', {
    dailyLimitUsd: 100,
    monthlyLimitUsd: 1000,
  });
  controller.engageKillSwitch('business', 'greencal-pressure-washing');

  assert.equal(controller.getStatus('business', 'greencal-pressure-washing').withinBudget, false);

  controller.releaseKillSwitch('business', 'greencal-pressure-washing');
  assert.equal(controller.getStatus('business', 'greencal-pressure-washing').withinBudget, true);
});

test('getStatus throws for an unconfigured scope', () => {
  const controller = new InMemoryCostController();
  assert.throws(() => controller.getStatus('global', 'default'));
});
