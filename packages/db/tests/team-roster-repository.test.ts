import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseTeamRosterRepository } from '../src/team-roster-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(
  membershipSeed: Array<Record<string, unknown>> = [],
  roleSeed: Array<Record<string, unknown>> = [],
) {
  const memberships: FakeTable = { rows: [...membershipSeed], nextId: 1 };
  const membership_roles: FakeTable = { rows: [...roleSeed], nextId: 1 };
  const client = createFakeSupabaseClient({ memberships, membership_roles });
  const repo = createSupabaseTeamRosterRepository(client);
  return { repo, memberships, membership_roles };
}

test("listTeamRoster returns every membership in the business with its resolved roles, excluding other businesses'", async () => {
  const { repo } = setup(
    [
      {
        id: 'membership-1',
        business_id: BUSINESS_A,
        user_id: 'user-1',
        user_email: 'owner@greencal.com',
        role: 'owner-admin',
      },
      {
        id: 'membership-2',
        business_id: BUSINESS_A,
        user_id: 'user-2',
        user_email: 'tech@greencal.com',
        role: 'technician',
      },
      {
        id: 'membership-3',
        business_id: BUSINESS_B,
        user_id: 'user-3',
        user_email: 'other@other.com',
        role: 'owner-admin',
      },
    ],
    [
      { membership_id: 'membership-1', role: 'owner-admin' },
      { membership_id: 'membership-1', role: 'office-manager' },
    ],
  );

  const result = await repo.listTeamRoster(BUSINESS_A);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.members.length, 2);
    const owner = result.members.find((m) => m.membershipId === 'membership-1');
    assert.deepEqual(owner?.roles.sort(), ['office-manager', 'owner-admin']);
    const tech = result.members.find((m) => m.membershipId === 'membership-2');
    assert.deepEqual(tech?.roles, ['technician'], 'falls back to the legacy single role column');
    assert.equal(owner?.email, 'owner@greencal.com');
  }
});

test('grantRole rejects a non-owner-admin actor', async () => {
  const { repo } = setup([
    {
      id: 'membership-1',
      business_id: BUSINESS_A,
      user_id: 'user-1',
      user_email: null,
      role: 'office-manager',
    },
  ]);

  const result = await repo.grantRole(BUSINESS_A, 'membership-1', 'dispatcher', ['office-manager']);
  assert.equal(result.ok, false);
});

test('grantRole succeeds for an owner-admin actor and inserts the role', async () => {
  const { repo, membership_roles } = setup([
    {
      id: 'membership-1',
      business_id: BUSINESS_A,
      user_id: 'user-1',
      user_email: null,
      role: 'office-manager',
    },
  ]);

  const result = await repo.grantRole(BUSINESS_A, 'membership-1', 'dispatcher', ['owner-admin']);
  assert.equal(result.ok, true);
  assert.equal(membership_roles.rows.length, 1);
  assert.equal(membership_roles.rows[0].role, 'dispatcher');
});

test('grantRole rejects a cross-tenant membership id', async () => {
  const { repo } = setup([
    {
      id: 'membership-1',
      business_id: BUSINESS_B,
      user_id: 'user-1',
      user_email: null,
      role: 'office-manager',
    },
  ]);

  const result = await repo.grantRole(BUSINESS_A, 'membership-1', 'dispatcher', ['owner-admin']);
  assert.equal(result.ok, false);
});

test('revokeRole rejects a non-owner-admin actor', async () => {
  const { repo } = setup(
    [
      {
        id: 'membership-1',
        business_id: BUSINESS_A,
        user_id: 'user-1',
        user_email: null,
        role: 'office-manager',
      },
    ],
    [{ membership_id: 'membership-1', role: 'dispatcher' }],
  );

  const result = await repo.revokeRole(BUSINESS_A, 'membership-1', 'dispatcher', [
    'office-manager',
  ]);
  assert.equal(result.ok, false);
});

test('revokeRole removes a non-owner-admin role for an owner-admin actor', async () => {
  const { repo, membership_roles } = setup(
    [
      {
        id: 'membership-1',
        business_id: BUSINESS_A,
        user_id: 'user-1',
        user_email: null,
        role: 'office-manager',
      },
    ],
    [{ membership_id: 'membership-1', role: 'dispatcher' }],
  );

  const result = await repo.revokeRole(BUSINESS_A, 'membership-1', 'dispatcher', ['owner-admin']);
  assert.equal(result.ok, true);
  assert.equal(membership_roles.rows.length, 0);
});

test("revokeRole refuses to remove the business's last remaining owner-admin", async () => {
  const { repo, membership_roles } = setup(
    [
      {
        id: 'membership-1',
        business_id: BUSINESS_A,
        user_id: 'user-1',
        user_email: null,
        role: 'owner-admin',
      },
      {
        id: 'membership-2',
        business_id: BUSINESS_A,
        user_id: 'user-2',
        user_email: null,
        role: 'technician',
      },
    ],
    [{ membership_id: 'membership-1', role: 'owner-admin' }],
  );

  const result = await repo.revokeRole(BUSINESS_A, 'membership-1', 'owner-admin', ['owner-admin']);
  assert.equal(result.ok, false);
  assert.equal(membership_roles.rows.length, 1, 'the last owner-admin role must remain untouched');
});

test('revokeRole allows removing owner-admin from one membership when another owner-admin remains', async () => {
  const { repo } = setup(
    [
      {
        id: 'membership-1',
        business_id: BUSINESS_A,
        user_id: 'user-1',
        user_email: null,
        role: 'owner-admin',
      },
      {
        id: 'membership-2',
        business_id: BUSINESS_A,
        user_id: 'user-2',
        user_email: null,
        role: 'owner-admin',
      },
    ],
    [
      { membership_id: 'membership-1', role: 'owner-admin' },
      { membership_id: 'membership-2', role: 'owner-admin' },
    ],
  );

  const result = await repo.revokeRole(BUSINESS_A, 'membership-1', 'owner-admin', ['owner-admin']);
  assert.equal(result.ok, true);
});
