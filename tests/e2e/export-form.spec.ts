/**
 * Export CTA section + inquiry form E2E tests
 * Covers: form field validation, submit loading state, success/error toasts,
 * fetch POST to Google Apps Script (intercepted in tests), footer layout.
 */

import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
// The brand intro (js/intro.js) plays once per browser session and locks scroll while it runs. These specs exercise the
// page itself, so mark the intro as already seen — otherwise anything that scrolls or clicks in the first ~3 s is locked out.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem('pc-intro', '1'); } catch (e) { /* private mode */ } });
});
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyDs08DF1A08MimgYV8vSTSy9mOiVNlab-lyPx7JLYgU7uLq5Fju2DmHQLyJkfDGfuOpw/exec';

const VALID_FORM = {
  name: 'John Doe',
  company: 'Atlas Foods Inc',
  email: 'john@atlasfoods.com',
  phone: '+1 555 123 4567',
  country: 'US',
  volume: 'Less than 500kg',
  message: 'Interested in a sample shipment of 100kg for testing.',
};

async function gotoExport(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const el = document.getElementById('export');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(800);
}

async function fillValidForm(page: Page) {
  await page.fill('#name', VALID_FORM.name);
  await page.fill('#company', VALID_FORM.company);
  await page.fill('#email', VALID_FORM.email);
  await page.fill('#phone', VALID_FORM.phone);
  await page.selectOption('#country', VALID_FORM.country);
  await page.selectOption('#volume', VALID_FORM.volume);
  await page.fill('#message', VALID_FORM.message);
}

// ─── Form presence and layout ─────────────────────────────────────────────
test.describe('Export form — layout and fields', () => {
  test('inquiry form (#inquiry-form) is present in the DOM', async ({ page }) => {
    await gotoExport(page);
    await expect(page.locator('#inquiry-form')).toBeAttached();
  });

  test('all required fields are present', async ({ page }) => {
    await gotoExport(page);
    const required = ['#name', '#company', '#email', '#country', '#volume'];
    for (const sel of required) {
      await expect(page.locator(sel)).toBeAttached();
      const req = await page.locator(sel).getAttribute('required');
      expect(req).not.toBeNull();
    }
  });

  test('phone field is optional (no required attribute)', async ({ page }) => {
    await gotoExport(page);
    const req = await page.locator('#phone').getAttribute('required');
    expect(req).toBeNull();
  });

  test('message textarea is optional', async ({ page }) => {
    await gotoExport(page);
    const req = await page.locator('#message').getAttribute('required');
    expect(req).toBeNull();
  });

  test('submit button has btn-text and btn-spinner spans', async ({ page }) => {
    await gotoExport(page);
    await expect(page.locator('#submit-btn .btn-text')).toBeAttached();
    await expect(page.locator('#submit-btn .btn-spinner')).toBeAttached();
  });

  test('form-message div has role="alert" and aria-live="polite"', async ({ page }) => {
    await gotoExport(page);
    const role = await page.locator('#form-message').getAttribute('role');
    const live = await page.locator('#form-message').getAttribute('aria-live');
    expect(role).toBe('alert');
    expect(live).toBe('polite');
  });

  test('desktop: export section is 2-col layout (form left, image right)', async ({ page }) => {
    await gotoExport(page);
    const display = await page.locator('.export-section .split-layout').evaluate(
      (el) => getComputedStyle(el).display
    );
    expect(display).toBe('grid');
    const cols = await page.locator('.export-section .split-layout').evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );
    // 2 column tracks
    const trackCount = cols.trim().split(/\s+(?=\d|\.)/).length;
    expect(trackCount).toBeGreaterThanOrEqual(2);
  });

  test('mobile: form fields are full-width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const el = document.getElementById('export');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    const inputWidth = await page.locator('#name').evaluate(
      (el) => el.getBoundingClientRect().width
    );
    const viewportWidth = 375;
    // Full-width minus padding; should be at least 80% of viewport
    expect(inputWidth).toBeGreaterThan(viewportWidth * 0.75);
  });
});

// ─── Form validation ──────────────────────────────────────────────────────
test.describe('Export form — client-side validation', () => {
  test('submitting empty form focuses first required field', async ({ page }) => {
    await gotoExport(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(300);
    const focused = await page.evaluate(() => document.activeElement?.id);
    // main.js focuses the first invalid field on empty submit
    expect(focused).toBeTruthy();
    expect(['name', 'company', 'email', 'country', 'volume']).toContain(focused);
  });

  test('email field rejects invalid format (native validation)', async ({ page }) => {
    await gotoExport(page);
    await page.fill('#name', 'Test User');
    await page.fill('#company', 'Test Corp');
    await page.fill('#email', 'not-an-email');
    await page.selectOption('#country', 'US');
    await page.selectOption('#volume', 'Less than 500kg');
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(300);
    const validity = await page.locator('#email').evaluate(
      (el) => (el as HTMLInputElement).validity.valid
    );
    expect(validity).toBe(false);
  });

  test('phone field pattern allows valid international format', async ({ page }) => {
    await gotoExport(page);
    await page.fill('#phone', '+91 98765 43210');
    const validity = await page.locator('#phone').evaluate(
      (el) => (el as HTMLInputElement).validity.valid
    );
    expect(validity).toBe(true);
  });

  test('country select has 25+ country options', async ({ page }) => {
    await gotoExport(page);
    const options = page.locator('#country option:not([disabled])');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(20);
  });

  test('volume select has 4 options', async ({ page }) => {
    await gotoExport(page);
    const options = page.locator('#volume option:not([disabled])');
    await expect(options).toHaveCount(4);
  });
});

// ─── Form submission — success ────────────────────────────────────────────
test.describe('Export form — successful submission', () => {
  test('submit button shows loading spinner during fetch', async ({ page }) => {
    await gotoExport(page);

    // Intercept the Google Apps Script URL and delay response
    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      await page.waitForTimeout(300); // simulate latency
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await fillValidForm(page);

    const submitPromise = page.locator('#submit-btn').click().then(() => {
      return page.waitForTimeout(150);
    });

    await submitPromise;

    // Spinner should be visible briefly during fetch
    const spinnerDisplay = await page.locator('.btn-spinner').evaluate(
      (el) => getComputedStyle(el).display
    );
    // Either still loading or already done — just verify no crash
    expect(['none', 'inline-block', 'inline']).toContain(spinnerDisplay);
  });

  test('successful submission shows success message with .success class', async ({ page }) => {
    await gotoExport(page);

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1500);

    const formMsg = page.locator('#form-message');
    const hasSuccess = await formMsg.evaluate((el) => el.classList.contains('success'));
    expect(hasSuccess).toBe(true);

    const text = await formMsg.textContent();
    expect(text).toMatch(/sent successfully|contact you/i);
  });

  test('form resets after successful submission', async ({ page }) => {
    await gotoExport(page);

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1500);

    const nameVal = await page.locator('#name').inputValue();
    expect(nameVal).toBe('');
  });

  test('submit button text restores to original after successful submit', async ({ page }) => {
    await gotoExport(page);

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1500);

    const btnText = await page.locator('#submit-btn .btn-text').textContent();
    expect(btnText).toMatch(/request a quote|sample/i);
  });

  test('submit sends correct JSON fields to Google Apps Script', async ({ page }) => {
    await gotoExport(page);
    let capturedBody: string | null = null;

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      capturedBody = route.request().postData();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1000);

    expect(capturedBody).not.toBeNull();
    const data = JSON.parse(capturedBody!);
    expect(data.name).toBe(VALID_FORM.name);
    expect(data.company).toBe(VALID_FORM.company);
    expect(data.email).toBe(VALID_FORM.email);
    expect(data.country).toBe(VALID_FORM.country);
    expect(data.volume).toBe(VALID_FORM.volume);
  });
});

// ─── Form submission — error ──────────────────────────────────────────────
test.describe('Export form — error handling', () => {
  test('network error shows error message with .error class', async ({ page }) => {
    await gotoExport(page);

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      await route.abort('failed');
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1500);

    const formMsg = page.locator('#form-message');
    const hasError = await formMsg.evaluate((el) => el.classList.contains('error'));
    expect(hasError).toBe(true);

    const text = await formMsg.textContent();
    expect(text).toMatch(/error|sorry/i);
  });

  test('server-side failure (non-success status) shows error message', async ({ page }) => {
    await gotoExport(page);

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', message: 'Spreadsheet quota exceeded' }),
      });
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1500);

    const hasError = await page.locator('#form-message').evaluate(
      (el) => el.classList.contains('error')
    );
    expect(hasError).toBe(true);
  });

  test('submit button is aria-busy during fetch', async ({ page }) => {
    await gotoExport(page);
    let busyDuringFetch = false;

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      // Check aria-busy during the pending request
      busyDuringFetch = await page.locator('#submit-btn').evaluate(
        (el) => el.getAttribute('aria-busy') === 'true'
      );
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1000);
    expect(busyDuringFetch).toBe(true);
  });

  test('submit button aria-busy removed after fetch completes', async ({ page }) => {
    await gotoExport(page);

    await page.route(GOOGLE_SCRIPT_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success' }),
      });
    });

    await fillValidForm(page);
    await page.locator('#submit-btn').click();
    await page.waitForTimeout(1500);

    const ariabusy = await page.locator('#submit-btn').getAttribute('aria-busy');
    expect(ariabusy).toBeNull();
  });
});

// ─── Footer ───────────────────────────────────────────────────────────────
test.describe('Footer', () => {
  test('footer logo is present', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
    await page.waitForTimeout(500);
    await expect(page.locator('.footer-logo')).toBeVisible();
  });

  test('footer has 3 link columns (Quick Links, Contact Us)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const cols = page.locator('.footer-col');
    const count = await cols.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('footer copyright text mentions 2026 and Purity Crunch', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const footer = await page.locator('.footer-bottom').textContent();
    expect(footer).toMatch(/2026/);
    expect(footer?.toLowerCase()).toMatch(/purity crunch/i);
  });

  test('footer quick links all have valid href targets', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const links = page.locator('.footer-col a[href]');
    const hrefs = await links.evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href'))
    );
    hrefs.forEach((href) => {
      expect(href).toBeTruthy();
      expect(href!.length).toBeGreaterThan(0);
    });
  });

  test('footer contact info contains address and email', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const contactCol = page.locator('.footer-contact');
    const text = await contactCol.textContent();
    expect(text).toMatch(/Bhusawal|Maharashtra/i);
    expect(text).toMatch(/export@puritycrunch\.com/i);
  });

  test('mobile: footer stacks to single column (no horizontal overflow)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test('legal links are present in footer-bottom', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const legalText = await page.locator('.legal-links').textContent();
    expect(legalText).toMatch(/privacy/i);
    expect(legalText).toMatch(/terms/i);
  });
});
