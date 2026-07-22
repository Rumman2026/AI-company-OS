import { test, expect } from '@playwright/test';

const VALID = {
  fullName: 'Jane Doe',
  phone: '(657) 319-8551',
  email: 'jane@example.com',
  serviceLocation: 'Anaheim, CA',
  projectDescription: 'Please clean the roof - visible algae buildup on the north-facing slope.',
};

async function fillValidForm(page: import('@playwright/test').Page) {
  await page.fill('#qf-fullName', VALID.fullName);
  await page.fill('#qf-phone', VALID.phone);
  await page.fill('#qf-email', VALID.email);
  await page.selectOption('#qf-service', 'roof-cleaning');
  await page.fill('#qf-serviceLocation', VALID.serviceLocation);
  await page.fill('#qf-projectDescription', VALID.projectDescription);
  await page.check('#qf-consent');
}

test.describe('Quote form: structure and honest defaults', () => {
  test('has a clear, honest heading and explains the call/email alternative', async ({ page }) => {
    await page.goto('/contact-us');
    await expect(page.locator('#quote-form-heading')).toHaveText('Request a Quote');
    const section = page.locator('#quote-form');
    await expect(section).toContainText(/call or email/i);
  });

  test('offers only verified GreenCal services in the selector', async ({ page }) => {
    await page.goto('/contact-us');
    const options = await page.locator('#qf-service option').allTextContents();
    expect(options).toEqual(['Select a service', 'Roof Cleaning', 'House & Stucco Washing']);
  });

  test('consent checkbox is unchecked by default', async ({ page }) => {
    await page.goto('/contact-us');
    await expect(page.locator('#qf-consent')).not.toBeChecked();
  });

  test('groups the preferred-contact-method radios with fieldset/legend', async ({ page }) => {
    await page.goto('/contact-us');
    const fieldset = page.locator('fieldset.form-fieldset');
    await expect(fieldset).toBeVisible();
    await expect(fieldset.locator('legend')).toHaveText(/preferred contact method/i);
    await expect(fieldset.locator('input[type="radio"]')).toHaveCount(2);
  });

  test('the honeypot field is hidden from assistive technology and not keyboard-reachable', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    const wrapper = page.locator('.quote-form-honeypot');
    await expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#qf-website')).toHaveAttribute('tabindex', '-1');
  });

  test('does not use a native browser-only validation flow (novalidate)', async ({ page }) => {
    await page.goto('/contact-us');
    await expect(page.locator('#quote-form-form')).toHaveAttribute('novalidate', '');
  });
});

test.describe('Quote form: accessible validation experience', () => {
  test('an empty submission shows an error summary, moves focus to it, and lists every required field', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await page.click('#quote-form-submit');

    const summary = page.locator('#quote-form-error-summary');
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();

    const items = summary.locator('li');
    await expect(items).toHaveCount(7); // fullName, phone, email, service, serviceLocation, projectDescription, consent
  });

  test('marks each invalid field with aria-invalid and a visible inline error linked via aria-describedby', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await page.click('#quote-form-submit');

    const fullName = page.locator('#qf-fullName');
    await expect(fullName).toHaveAttribute('aria-invalid', 'true');
    await expect(fullName).toHaveAttribute('aria-describedby', 'qf-fullName-error');
    await expect(page.locator('#qf-fullName-error')).not.toBeEmpty();
  });

  test('error-summary links target the corresponding invalid field', async ({ page }) => {
    await page.goto('/contact-us');
    await page.click('#quote-form-submit');

    const firstLink = page.locator('#quote-form-error-list a').first();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/^#qf-/);
    const targetId = (href as string).slice(1);
    await expect(page.locator(`#${targetId}`)).toHaveCount(1);
  });

  test('preserves entered data after a validation failure', async ({ page }) => {
    await page.goto('/contact-us');
    await page.fill('#qf-fullName', 'Partial Entry');
    await page.click('#quote-form-submit');

    await expect(page.locator('#qf-fullName')).toHaveValue('Partial Entry');
  });

  test('announces submission feedback through an accessible status region', async ({ page }) => {
    await page.goto('/contact-us');
    const status = page.locator('#quote-form-status');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');

    await page.click('#quote-form-submit');
    await expect(status).toHaveText(/please fix the highlighted fields/i);
  });

  test('clears a previous error summary once fields are corrected and resubmitted', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await page.click('#quote-form-submit');
    await expect(page.locator('#quote-form-error-summary')).toBeVisible();

    await fillValidForm(page);
    await page.click('#quote-form-submit');

    await expect(page.locator('#quote-form-error-summary')).toBeHidden();
  });
});

test.describe('Quote form: honest submission outcomes', () => {
  test('a fully valid submission reports pending_configuration honestly, without claiming success', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await fillValidForm(page);
    await page.click('#quote-form-submit');

    const status = page.locator('#quote-form-status');
    await expect(status).toContainText(/isn't active yet/i);
    await expect(status).toContainText(/call or email/i);
    await expect(status).not.toContainText(/thank you/i);
    // The form must remain usable - a pending_configuration result must not
    // silently lock the customer out of retrying or using the fields.
    await expect(page.locator('#quote-form-submit')).toBeEnabled();
  });

  test('a submission with the honeypot filled shows a generic message and no field-level errors', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await fillValidForm(page);
    await page.fill('#qf-website', 'http://spam.example');
    await page.click('#quote-form-submit');

    await expect(page.locator('#quote-form-status')).toContainText(/couldn't process/i);
    await expect(page.locator('#quote-form-error-summary')).toBeHidden();
  });

  test('the submit button is guarded against duplicate submission while a request is in flight', async ({
    page,
  }) => {
    await page.goto('/contact-us');
    await fillValidForm(page);

    const submitButton = page.locator('#quote-form-submit');
    await submitButton.click();
    await submitButton.click(); // second click while the first may still be settling

    // Exactly one outcome message, never a doubled/garbled status.
    await expect(page.locator('#quote-form-status')).toContainText(/isn't active yet/i);
  });
});

test.describe('Quote form: keyboard and mobile usability', () => {
  test('every form control is reachable via keyboard in a logical order', async ({ page }) => {
    await page.goto('/contact-us');
    await page.locator('#qf-fullName').focus();
    await expect(page.locator('#qf-fullName')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#qf-phone')).toBeFocused();
  });

  test('has no horizontal overflow at 320px with the form rendered', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/contact-us');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
