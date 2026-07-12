import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully with the expected title', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle('GreenCal Pressure Washing');
  });

  test('has exactly one primary heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('GreenCal Pressure Washing');
  });

  test('has header, main, and footer landmarks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toHaveCount(1);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('footer')).toHaveCount(1);
  });

  test('skip link moves focus to main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('keyboard focus is visible on an interactive element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // brand link
    const brand = page.locator('.brand');
    await expect(brand).toBeFocused();
    const outlineStyle = await brand.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outlineStyle).not.toBe('none');
  });

  test('telephone link has the correct tel: destination', async ({ page }) => {
    await page.goto('/');
    const telLink = page.locator('a[href^="tel:"]');
    await expect(telLink).toHaveAttribute('href', 'tel:+16573198550');
  });

  test('email link has the correct mailto: destination', async ({ page }) => {
    await page.goto('/');
    const mailLink = page.locator('a[href^="mailto:"]');
    await expect(mailLink).toHaveAttribute('href', 'mailto:greencaliforniacorporarion@gmail.com');
  });

  test('no internal link points to a nonexistent route', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    const internalHrefs = hrefs.filter((href): href is string => !!href && href.startsWith('/'));
    for (const href of internalHrefs) {
      expect(href).toBe('/');
    }
  });

  test('mobile viewport has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });

  test('desktop viewport has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});

test.describe('404 page', () => {
  test('renders the custom 404 page for an unknown route', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page Not Found');
    // Scoped to #main-content: the header's brand link also has href="/".
    await expect(page.locator('#main-content a[href="/"]')).toBeVisible();
  });
});
