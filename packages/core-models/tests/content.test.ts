import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transitionContent } from '../src/state-machines/content';
import type {
  ContentStatus,
  ContentEligibilityEvidence,
  ContentPublicationEvidence,
} from '../src/types/content';
import { makeFixtureContentDraft, makeContext } from '../src/fixtures';

const fullEligibility: ContentEligibilityEvidence = {
  jobCompleted: true,
  officeReviewCompleted: true,
  invoiceNotVoidedOrDisputed: true,
  beforePhotosPresent: true,
  afterPhotosPresent: true,
  technicianNotesComplete: true,
  marketingConsentApproved: true,
  serviceAndCityVerified: true,
  noUnresolvedComplaint: true,
  noRefundOrDispute: true,
};

const fullPublicationEvidence: ContentPublicationEvidence = {
  invoicePaid: true,
  privateInformationRemoved: true,
  contentQualityThresholdMet: true,
};

test('every approved Content transition succeeds with correct actor and evidence', () => {
  const notEligible = makeFixtureContentDraft({ status: 'not-eligible' });
  const toEligible = transitionContent(
    notEligible,
    'eligible-for-draft',
    makeContext({ actorCategory: 'automation' }),
    { eligibilityEvidence: fullEligibility },
  );
  assert.equal(toEligible.outcome, 'success');

  const eligible = makeFixtureContentDraft({ status: 'eligible-for-draft' });
  const toDrafted = transitionContent(
    eligible,
    'draft-generated',
    makeContext({ actorCategory: 'ai-drafting-service' }),
  );
  assert.equal(toDrafted.outcome, 'success');

  const drafted = makeFixtureContentDraft({ status: 'draft-generated' });
  assert.equal(
    transitionContent(drafted, 'under-review', makeContext({ actorCategory: 'automation' }))
      .outcome,
    'success',
  );

  const underReview = makeFixtureContentDraft({ status: 'under-review' });
  assert.equal(
    transitionContent(
      underReview,
      'changes-requested',
      makeContext({ actorCategory: 'content-reviewer', reason: 'Tighten the summary' }),
    ).outcome,
    'success',
  );
  assert.equal(
    transitionContent(
      underReview,
      'rejected',
      makeContext({ actorCategory: 'content-reviewer', reason: 'Unusable photos' }),
    ).outcome,
    'success',
  );

  const changesRequested = makeFixtureContentDraft({ status: 'changes-requested' });
  assert.equal(
    transitionContent(
      changesRequested,
      'under-review',
      makeContext({ actorCategory: 'marketing-editor' }),
    ).outcome,
    'success',
  );
  assert.equal(
    transitionContent(
      changesRequested,
      'rejected',
      makeContext({ actorCategory: 'content-reviewer', reason: 'Still unusable' }),
    ).outcome,
    'success',
  );

  const approvedDraft = makeFixtureContentDraft({ status: 'approved' });
  assert.equal(
    transitionContent(
      approvedDraft,
      'scheduled',
      makeContext({ actorCategory: 'marketing-editor' }),
    ).outcome,
    'success',
  );
  const publishFromApproved = transitionContent(
    approvedDraft,
    'published',
    makeContext({ actorCategory: 'scheduled-publishing-service' }),
    { publicationEvidence: fullPublicationEvidence },
  );
  assert.equal(publishFromApproved.outcome, 'success');

  const scheduled = makeFixtureContentDraft({ status: 'scheduled' });
  const publishFromScheduled = transitionContent(
    scheduled,
    'published',
    makeContext({ actorCategory: 'scheduled-publishing-service' }),
    { publicationEvidence: fullPublicationEvidence },
  );
  assert.equal(publishFromScheduled.outcome, 'success');

  const published = makeFixtureContentDraft({ status: 'published' });
  assert.equal(
    transitionContent(
      published,
      'unpublished',
      makeContext({ actorCategory: 'owner-admin', reason: 'Consent revoked' }),
    ).outcome,
    'success',
  );
  assert.equal(
    transitionContent(published, 'archived', makeContext({ actorCategory: 'owner-admin' })).outcome,
    'success',
  );

  const unpublished = makeFixtureContentDraft({ status: 'unpublished' });
  assert.equal(
    transitionContent(unpublished, 'archived', makeContext({ actorCategory: 'owner-admin' }))
      .outcome,
    'success',
  );
});

test('no pre-review state has an approved edge directly to Published', () => {
  const preReviewStates: ContentStatus[] = [
    'not-eligible',
    'eligible-for-draft',
    'draft-generated',
    'under-review',
    'changes-requested',
    'rejected',
  ];
  for (const from of preReviewStates) {
    const content = makeFixtureContentDraft({ status: from });
    const result = transitionContent(
      content,
      'published',
      makeContext({ actorCategory: 'scheduled-publishing-service' }),
      { publicationEvidence: fullPublicationEvidence },
    );
    assert.equal(result.outcome, 'rejected', `${from} -> published must be rejected`);
    if (result.outcome === 'rejected') {
      assert.equal(result.errorCode, 'illegal-transition');
    }
  }
});

test('AI can reach no further than Draft Generated: cannot approve, cannot schedule, cannot publish', () => {
  const underReview = makeFixtureContentDraft({ status: 'under-review' });
  const approveAttempt = transitionContent(
    underReview,
    'approved',
    makeContext({ actorCategory: 'ai-drafting-service' }),
  );
  assert.equal(approveAttempt.outcome, 'rejected');
  assert.equal((approveAttempt as { errorCode: string }).errorCode, 'unauthorized-actor');

  const approved = makeFixtureContentDraft({ status: 'approved' });
  const scheduleAttempt = transitionContent(
    approved,
    'scheduled',
    makeContext({ actorCategory: 'ai-drafting-service' }),
  );
  assert.equal(scheduleAttempt.outcome, 'rejected');

  const publishAttempt = transitionContent(
    approved,
    'published',
    makeContext({ actorCategory: 'ai-drafting-service' }),
    { publicationEvidence: fullPublicationEvidence },
  );
  assert.equal(publishAttempt.outcome, 'rejected');
  assert.equal((publishAttempt as { errorCode: string }).errorCode, 'unauthorized-actor');
});

test('general automation cannot approve content', () => {
  const underReview = makeFixtureContentDraft({ status: 'under-review' });
  const result = transitionContent(
    underReview,
    'approved',
    makeContext({ actorCategory: 'automation' }),
  );
  assert.equal(result.outcome, 'rejected');
  assert.equal((result as { errorCode: string }).errorCode, 'unauthorized-actor');
});

test('only the content-reviewer actor category may approve content - marketing-editor is not sufficient', () => {
  const underReview = makeFixtureContentDraft({ status: 'under-review' });
  const asEditor = transitionContent(
    underReview,
    'approved',
    makeContext({ actorCategory: 'marketing-editor' }),
  );
  assert.equal(asEditor.outcome, 'rejected');

  const asReviewer = transitionContent(
    underReview,
    'approved',
    makeContext({ actorCategory: 'content-reviewer' }),
    {
      approvalDecision: {
        reviewerId: 'reviewer-1',
        approvedAt: '2026-01-01T00:00:00.000Z',
        decision: 'approved',
      },
    },
  );
  assert.equal(asReviewer.outcome, 'success');
});

test('scheduled publication requires publication evidence to be present, representing recorded human approval preconditions', () => {
  const approved = makeFixtureContentDraft({ status: 'approved' });
  const withoutEvidence = transitionContent(
    approved,
    'published',
    makeContext({ actorCategory: 'scheduled-publishing-service' }),
  );
  assert.equal(withoutEvidence.outcome, 'rejected');
  if (withoutEvidence.outcome === 'rejected') {
    assert.equal(withoutEvidence.errorCode, 'missing-precondition');
  }
});

test('under-review -> approved requires an explicit approved ContentApprovalDecision', () => {
  const underReview = makeFixtureContentDraft({ status: 'under-review' });
  const withoutDecision = transitionContent(
    underReview,
    'approved',
    makeContext({ actorCategory: 'content-reviewer' }),
  );
  assert.equal(withoutDecision.outcome, 'rejected');

  const withRejectDecision = transitionContent(
    underReview,
    'approved',
    makeContext({ actorCategory: 'content-reviewer' }),
    {
      approvalDecision: {
        reviewerId: 'reviewer-1',
        approvedAt: '2026-01-01T00:00:00.000Z',
        decision: 'rejected',
      },
    },
  );
  assert.equal(withRejectDecision.outcome, 'rejected');

  const withApprovedDecision = transitionContent(
    underReview,
    'approved',
    makeContext({ actorCategory: 'content-reviewer' }),
    {
      approvalDecision: {
        reviewerId: 'reviewer-1',
        approvedAt: '2026-01-01T00:00:00.000Z',
        decision: 'approved',
      },
    },
  );
  assert.equal(withApprovedDecision.outcome, 'success');
});

test('rejected content cannot publish without returning through an approved review path', () => {
  const rejected = makeFixtureContentDraft({ status: 'rejected' });
  for (const target of ['scheduled', 'published', 'approved'] as const) {
    const result = transitionContent(
      rejected,
      target,
      makeContext({ actorCategory: 'scheduled-publishing-service' }),
      { publicationEvidence: fullPublicationEvidence },
    );
    assert.equal(result.outcome, 'rejected', `rejected -> ${target} must be rejected`);
  }
});

test('not-eligible -> eligible-for-draft is rejected when eligibility evidence is incomplete', () => {
  const notEligible = makeFixtureContentDraft({ status: 'not-eligible' });
  const incomplete: ContentEligibilityEvidence = {
    ...fullEligibility,
    marketingConsentApproved: false,
  };
  const result = transitionContent(
    notEligible,
    'eligible-for-draft',
    makeContext({ actorCategory: 'automation' }),
    { eligibilityEvidence: incomplete },
  );
  assert.equal(result.outcome, 'rejected');
  if (result.outcome === 'rejected') {
    assert.ok(result.missingPreconditions?.includes('marketingConsentApproved'));
  }
});
