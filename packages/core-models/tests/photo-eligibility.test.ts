import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePhotoPublicationEligibility } from '../src/photo-eligibility';
import { makeFixturePhotoAsset } from '../src/fixtures';

const fullyEligibleOverrides = {
  publicDerivativeRef: 'public/fixture-derivative.webp',
  metadataStripped: true,
  gpsDataRemoved: true,
  privacyReviewPassed: true,
  humanPublicationApproved: true,
  publicationConsentGranted: true,
} as const;

test('a photo satisfying every requirement is publishable', () => {
  const photo = makeFixturePhotoAsset(fullyEligibleOverrides);
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, true);
  assert.deepEqual(eligibility.missingRequirements, []);
});

test('incomplete metadata stripping blocks publication', () => {
  const photo = makeFixturePhotoAsset({ ...fullyEligibleOverrides, metadataStripped: false });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('metadataStripped'));
});

test('incomplete GPS removal blocks publication', () => {
  const photo = makeFixturePhotoAsset({ ...fullyEligibleOverrides, gpsDataRemoved: false });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('gpsDataRemoved'));
});

test('incomplete privacy review blocks publication', () => {
  const photo = makeFixturePhotoAsset({ ...fullyEligibleOverrides, privacyReviewPassed: false });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('privacyReviewPassed'));
});

test('a failed face review blocks publication when the check was performed', () => {
  const photo = makeFixturePhotoAsset({ ...fullyEligibleOverrides, faceReviewPassed: false });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('faceReviewPassed'));
});

test('a failed license-plate review blocks publication when the check was performed', () => {
  const photo = makeFixturePhotoAsset({
    ...fullyEligibleOverrides,
    licensePlateReviewPassed: false,
  });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('licensePlateReviewPassed'));
});

test('a missing public derivative blocks publication - the private original alone is never sufficient', () => {
  const photo = makeFixturePhotoAsset({
    ...fullyEligibleOverrides,
    publicDerivativeRef: undefined,
  });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('publicDerivativeRef'));
});

test('missing human approval blocks publication even when every automated check passed', () => {
  const photo = makeFixturePhotoAsset({
    ...fullyEligibleOverrides,
    humanPublicationApproved: false,
  });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('humanPublicationApproved'));
});

test('missing publication consent blocks publication even when every other check passed', () => {
  const photo = makeFixturePhotoAsset({
    ...fullyEligibleOverrides,
    publicationConsentGranted: false,
  });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.includes('publicationConsentGranted'));
});

test('consent alone, without the other requirements, does not make a photo publishable', () => {
  const photo = makeFixturePhotoAsset({ publicationConsentGranted: true });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.ok(eligibility.missingRequirements.length > 1);
});

test('the existence of a public derivative reference alone does not make a photo publishable', () => {
  const photo = makeFixturePhotoAsset({ publicDerivativeRef: 'public/only-this.webp' });
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
});

test('a fully unreviewed private original is never publishable', () => {
  const photo = makeFixturePhotoAsset();
  const eligibility = evaluatePhotoPublicationEligibility(photo);
  assert.equal(eligibility.publishable, false);
  assert.equal(photo.publicDerivativeRef, undefined);
});
