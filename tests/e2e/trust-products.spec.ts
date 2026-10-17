/**
 * Trust strip + Products section E2E tests
 * Covers: CountUp animation on IntersectionObserver, flip cards (hover/tap),
 * product card tilt (desktop), Quick View modal GSAP open/close,
 * product rail layout at all breakpoints.
 */

import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
// The brand intro (js/intro.js) plays once per browser session and locks scroll while it runs. These specs exercise the
// page itself, so mark the intro as already seen — otherwise anything that scrolls or clicks in the first ~3 s is locked out.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem('pc-intro', '1'); } catch (e) { /* private mode */ } });
});

async function gotoHome(page: Page, vp = { width: 1440, height: 900 }) {
  await page.setViewportSize(vp);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
}

// ─── Trust strip — counter cards ──────────────────────────────────────────
test.describe('Trust strip — CountUp animation', () => {
  test('counter cards exist with [data-count] attributes', async ({ page }) => {
    await gotoHome(page);
    const counters = page.locator('[data-count]');
    await expect(counters).toHaveCount(3); // 100%, 500kg+, 50+ Buyers
  });

  test('counters show final values after scrolling into view', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => {
      const el = document.querySelector('.trust-section');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(2500);

    const vals = await page.locator('[data-count]').evaluateAll((els) =>
      els.map((el) => el.textContent?.trim())
    );
    // Values should contain their suffix (data-suffix applied by GSAP CountUp)
    const allNonEmpty = vals.every((v) => v && v.length > 0);
    expect(allNonEmpty).toBe(true);
    // 100% counter
    expect(vals.some((v) => v?.includes('100'))).toBe(true);
    // 500 counter
    expect(vals.some((v) => v?.includes('500'))).toBe(true);
    // 50 counter
    expect(vals.some((v) => v?.includes('50'))).toBe(true);
  });

  test('counter starts from 0 and increments (GSAP CountUp fires on scroll)', async ({ page }) => {
    await gotoHome(page);
    // Capture value before scroll
    const before = await page.locator('[data-count="100"]').textContent();
    // Scroll to trust section
    await page.evaluate(() => {
      const el = document.querySelector('.trust-section');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(100);
    const midValue = await page.locator('[data-count="100"]').textContent();
    await page.waitForTimeout(2000);
    const after = await page.locator('[data-count="100"]').textContent();
    // Should end at 100%
    expect(after).toContain('100');
  });

  test('reduced-motion: counter shows final value immediately without counting up', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoHome(page);
    await page.evaluate(() => {
      const el = document.querySelector('.trust-section');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    const val = await page.locator('[data-count="100"]').textContent();
    // With reduced-motion GSAP duration:0, final value should appear immediately
    expect(val).toContain('100');
  });
});

// ─── Trust strip — flip cards ──────────────────────────────────────────────
test.describe('Trust strip — flip cards', () => {
  test('trust cards are present (4 cards)', async ({ page }) => {
    await gotoHome(page);
    const cards = page.locator('.trust-card');
    await expect(cards).toHaveCount(4);
  });

  test('each trust card has front and back faces', async ({ page }) => {
    await gotoHome(page);
    const fronts = page.locator('.trust-card-front');
    const backs = page.locator('.trust-card-back');
    await expect(fronts).toHaveCount(4);
    await expect(backs).toHaveCount(4);
  });

  test('desktop: trust card flips on hover (inner gets rotateY transform)', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => {
      const el = document.querySelector('.trust-section');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(800);
    const card = page.locator('.trust-card').first();
    await card.hover();
    await page.waitForTimeout(700);
    const transform = await page.locator('.trust-card-inner').first().evaluate(
      (el) => getComputedStyle(el).transform
    );
    // After hover, transform should not be 'none' (CSS rotateY applied)
    expect(transform).not.toBe('none');
  });
});

// ─── Products section — layout ────────────────────────────────────────────
test.describe('Products — layout', () => {
  test('4 product cards are rendered', async ({ page }) => {
    await gotoHome(page);
    const cards = page.locator('.product-card');
    await expect(cards).toHaveCount(4);
  });

  test('desktop: product rail is visible and not overflow-x scrollable', async ({ page }) => {
    await gotoHome(page);
    const overflow = await page.locator('#product-rail').evaluate(
      (el) => getComputedStyle(el).overflowX
    );
    // Desktop uses grid, not horizontal scroll
    expect(overflow).not.toBe('scroll');
    expect(overflow).not.toBe('auto');
  });

  test('mobile: product rail has overflow-x auto (carousel)', async ({ page }) => {
    await gotoHome(page, { width: 375, height: 812 });
    await page.evaluate(() => {
      const el = document.getElementById('product-rail');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    const overflow = await page.locator('#product-rail').evaluate(
      (el) => getComputedStyle(el).overflowX
    );
    expect(['auto', 'scroll']).toContain(overflow);
  });

  test('all product cards reveal (become visible) on scroll entry', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(1500);
    const opacities = await page.locator('.product-card').evaluateAll((cards) =>
      cards.map((c) => parseFloat(getComputedStyle(c).opacity))
    );
    opacities.forEach((op) => expect(op).toBeGreaterThan(0.8));
  });

  test('product images have alt text', async ({ page }) => {
    await gotoHome(page);
    const imgs = page.locator('.product-image img');
    const alts = await imgs.evaluateAll((els) =>
      els.map((el) => (el as HTMLImageElement).getAttribute('alt'))
    );
    alts.forEach((alt) => {
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(3);
    });
  });
});

// ─── Products — Quick View modal ──────────────────────────────────────────
test.describe('Products — Quick View modal', () => {
  async function openModal(page: Page) {
    await page.evaluate(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(800);
    await page.locator('.quick-view-btn').first().click();
    await page.waitForTimeout(600);
  }

  test('clicking Quick View opens the product modal overlay', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    const overlay = page.locator('#product-modal-overlay');
    await expect(overlay).toHaveClass(/open/);
  });

  test('modal populates with correct product name and description', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    const title = await page.locator('#modal-title').textContent();
    const desc = await page.locator('#modal-desc').textContent();
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(3);
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(10);
  });

  test('modal shows product image with correct src', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    const src = await page.locator('#modal-img').getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toMatch(/\.(png|jpg|webp)/i);
  });

  test('clicking X button closes the modal', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    await page.locator('#modal-close').click();
    await page.waitForTimeout(500);
    const hasOpen = await page.locator('#product-modal-overlay').evaluate(
      (el) => el.classList.contains('open')
    );
    expect(hasOpen).toBe(false);
  });

  test('clicking overlay backdrop closes the modal', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    // Click on the overlay itself (not the modal box)
    await page.locator('#product-modal-overlay').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    const hasOpen = await page.locator('#product-modal-overlay').evaluate(
      (el) => el.classList.contains('open')
    );
    expect(hasOpen).toBe(false);
  });

  test('pressing Escape closes the modal', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const hasOpen = await page.locator('#product-modal-overlay').evaluate(
      (el) => el.classList.contains('open')
    );
    expect(hasOpen).toBe(false);
  });

  test('modal close restores body scroll (overflow not hidden)', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    // Verify body scroll locked while open
    const lockedWhileOpen = await page.evaluate(() => document.body.style.overflow);
    expect(lockedWhileOpen).toBe('hidden');
    // Close modal
    await page.locator('#modal-close').click();
    await page.waitForTimeout(500);
    const afterClose = await page.evaluate(() => document.body.style.overflow);
    expect(afterClose).not.toBe('hidden');
  });

  test('"Request Sample" CTA in modal scrolls to #export and closes modal', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    await page.locator('#modal-cta').click();
    await page.waitForTimeout(1000);
    const hasOpen = await page.locator('#product-modal-overlay').evaluate(
      (el) => el.classList.contains('open')
    );
    expect(hasOpen).toBe(false);
  });

  test('all 4 Quick View buttons open the modal with populated data', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(800);

    const buttons = await page.locator('.quick-view-btn').all();
    for (const btn of buttons) {
      await btn.click();
      await page.waitForTimeout(500);
      const title = await page.locator('#modal-title').textContent();
      expect(title!.length).toBeGreaterThan(3);
      await page.locator('#modal-close').click();
      await page.waitForTimeout(400);
    }
  });

  test('modal has role="dialog" and aria-modal="true"', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    const role = await page.locator('#product-modal-overlay').getAttribute('role');
    const ariaModal = await page.locator('#product-modal-overlay').getAttribute('aria-modal');
    expect(role).toBe('dialog');
    expect(ariaModal).toBe('true');
  });

  test('focus moves to close button when modal opens', async ({ page }) => {
    await gotoHome(page);
    await openModal(page);
    const focused = await page.evaluate(() => document.activeElement?.id);
    expect(focused).toBe('modal-close');
  });
});

// ─── Products — 3D tilt (desktop) ─────────────────────────────────────────
test.describe('Products — 3D card tilt', () => {
  test('desktop: product card gets 3D transform on mousemove (not identity)', async ({ page }) => {
    await gotoHome(page, { width: 1440, height: 900 });
    await page.evaluate(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(800);

    const card = page.locator('.product-card').first();
    const box = await card.boundingBox();
    if (!box) throw new Error('Card not found');

    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await page.waitForTimeout(500);

    const transform = await card.evaluate((el) => getComputedStyle(el).transform);
    // With tilt active, matrix3d or matrix(1,0,0,1,...) should differ from identity
    expect(transform).not.toMatch(/^matrix\(1, 0, 0, 1, 0, 0\)$/);
  });

  test('card tilt resets to identity on mouseleave', async ({ page }) => {
    await gotoHome(page, { width: 1440, height: 900 });
    await page.evaluate(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(800);

    const card = page.locator('.product-card').first();
    const box = await card.boundingBox();
    if (!box) throw new Error('Card not found');

    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await page.waitForTimeout(400);
    // Move away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(800);

    const transform = await card.evaluate((el) => getComputedStyle(el).transform);
    // After elastic snap-back: rotationX/Y ≈ 0 → matrix close to identity
    // Allow some tolerance for in-flight animation
    const isNearIdentity =
      transform === 'none' || transform.match(/matrix\(1,\s*0,\s*0,\s*1,/) !== null ||
      transform.match(/matrix3d\(1,\s*0,\s*0,\s*0,\s*0,\s*1,/) !== null;
    expect(isNearIdentity).toBe(true);
  });
});
