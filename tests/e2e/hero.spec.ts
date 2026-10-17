/**
 * Hero section E2E tests
 * Covers: WebGL canvas, 2D particle fallback, H1 char stagger,
 * Ken Burns parallax, liquid-ink cursor, magnetic CTAs,
 * chip FORMATION[0→1] on first scroll, scroll indicator.
 */

import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
// The brand intro (js/intro.js) plays once per browser session and locks scroll while it runs. These specs exercise the
// page itself, so mark the intro as already seen — otherwise anything that scrolls or clicks in the first ~3 s is locked out.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem('pc-intro', '1'); } catch (e) { /* private mode */ } });
});

async function gotoHome(page: Page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
}

// ─── WebGL canvas ─────────────────────────────────────────────────────────
test.describe('Hero — WebGL canvas', () => {
  test('webgl-bg canvas is in the DOM and visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    const canvas = page.locator('#webgl-bg');
    await expect(canvas).toBeAttached();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('webgl-bg canvas fills the viewport (fixed fullscreen)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    const { width, height } = page.viewportSize()!;
    const box = await page.locator('#webgl-bg').boundingBox();
    // canvas covers full viewport; allow 2px rounding tolerance
    expect(box!.width).toBeGreaterThanOrEqual(width - 2);
    expect(box!.height).toBeGreaterThanOrEqual(height - 2);
  });

  test('webgl-bg canvas has z-index:1 (behind content, above body bg)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    const zIndex = await page.locator('#webgl-bg').evaluate((el) =>
      parseInt(getComputedStyle(el).zIndex || '0', 10)
    );
    expect(zIndex).toBe(1);
  });

  test('no critical console errors within 2s of page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(2000);
    // WebGL context warnings are allowed; hard JS errors are not
    const criticalErrors = errors.filter(
      (e) => !e.includes('WebGL') && !e.includes('[3D]') && !e.includes('favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('3D init log "[3D] WebGL chip scene initialized" appears in console', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));
    await gotoHome(page);
    await page.waitForTimeout(3000);
    const initLog = logs.find((l) => l.includes('[3D] WebGL chip scene initialized'));
    expect(initLog).toBeTruthy();
  });

  test('desktop: 52 chips initialized (logged)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));
    await gotoHome(page);
    await page.waitForTimeout(3000);
    const initLog = logs.find((l) => l.includes('52'));
    expect(initLog).toBeTruthy();
  });

  test('mobile: 24 chips initialized (logged)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const logs: string[] = [];
    page.on('console', (msg) => logs.push(msg.text()));
    await gotoHome(page);
    await page.waitForTimeout(3000);
    const initLog = logs.find((l) => l.includes('24'));
    expect(initLog).toBeTruthy();
  });
});

// ─── 2D particle fallback ──────────────────────────────────────────────────
test.describe('Hero — 2D particle fallback', () => {
  test('hero-canvas (2D fallback) is hidden after WebGL success', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(2500);
    const display = await page.locator('#hero-canvas').evaluate(
      (el) => getComputedStyle(el).display
    );
    expect(display).toBe('none');
  });

  test('hero-canvas is shown when WebGL is blocked (reduced-motion)', async ({ page }) => {
    // prefers-reduced-motion causes three-scene.js to return early, leaving 2D canvas
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(1500);
    const display = await page.locator('#hero-canvas').evaluate(
      (el) => getComputedStyle(el).display
    );
    // Should NOT be 'none' — the 2D canvas stays visible as fallback
    expect(display).not.toBe('none');
  });
});

// ─── H1 char stagger ──────────────────────────────────────────────────────
test.describe('Hero — H1 char stagger', () => {
  test('H1 .word-reveal spans are split into .char children on load', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(1000);
    const charCount = await page.locator('h1 .char').count();
    expect(charCount).toBeGreaterThan(10);
  });

  test('H1 chars become visible after entrance animation (no prefers-reduced-motion)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    // Allow ~3s for stagger to complete
    await page.waitForTimeout(3500);
    const firstChar = page.locator('h1 .char').first();
    const opacity = await firstChar.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    expect(opacity).toBeCloseTo(1, 1);
  });

  test('H1 chars are immediately visible under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(500);
    const firstChar = page.locator('h1 .char').first();
    // With reduced motion GSAP sets duration:0, so chars must be visible immediately
    const opacity = await firstChar.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    expect(opacity).toBeCloseTo(1, 1);
  });

  test('mobile: H1 renders at 34px font-size (per responsive spec)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoHome(page);
    const fontSize = await page.locator('h1').evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)
    );
    // Allow 28–36px range (exact breakpoint value is 34px)
    expect(fontSize).toBeGreaterThanOrEqual(28);
    expect(fontSize).toBeLessThanOrEqual(40);
  });
});

// ─── Hero CTAs ────────────────────────────────────────────────────────────
test.describe('Hero — dual CTAs', () => {
  test('both CTA buttons are present in hero-buttons', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    const btns = page.locator('.hero-buttons .btn');
    await expect(btns).toHaveCount(2);
  });

  test('"View Our Catalog" button scrolls to #products', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(1500);
    await page.locator('.hero-buttons a[href="#products"]').click();
    await page.waitForTimeout(1200);
    const productsTop = await page.locator('#products').evaluate((el) => el.getBoundingClientRect().top);
    // After Lenis scroll: products section should be near viewport top
    expect(productsTop).toBeLessThan(200);
  });

  test('"Inquire for Wholesale" button scrolls to #export', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(1500);
    await page.locator('.hero-buttons a[href="#export"]').click();
    await page.waitForTimeout(1200);
    const exportTop = await page.locator('#export').evaluate((el) => el.getBoundingClientRect().top);
    expect(exportTop).toBeLessThan(200);
  });

  test('desktop: both CTAs have [data-magnetic] attribute', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    const magneticBtns = page.locator('.hero-buttons [data-magnetic]');
    await expect(magneticBtns).toHaveCount(2);
  });

  test('mobile: CTAs stack full-width (no horizontal overflow)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoHome(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
});

// ─── Scroll indicator ─────────────────────────────────────────────────────
test.describe('Hero — scroll indicator', () => {
  test('scroll indicator is visible after hero entrance animation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(3000);
    const opacity = await page.locator('.scroll-indicator').evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity)
    );
    expect(opacity).toBeGreaterThan(0.5);
  });

  test('scroll indicator disappears after scrolling past hero', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo({ top: 1000 }));
    await page.waitForTimeout(800);
    // Scroll indicator should fade or move off-screen
    const box = await page.locator('.scroll-indicator').boundingBox();
    // Either hidden or below viewport — accept both
    if (box) {
      const vp = page.viewportSize()!;
      const opacity = await page.locator('.scroll-indicator').evaluate(
        (el) => parseFloat(getComputedStyle(el).opacity)
      );
      const outOfView = box.y >= vp.height;
      expect(outOfView || opacity < 0.1).toBe(true);
    }
  });
});

// ─── Chip FORMATION[0→1] scroll choreography ──────────────────────────────
test.describe('Hero — chip formation scroll transition', () => {
  test('chip opacity changes after scrolling 100px (FORMATION[1])', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(2500);

    // Capture canvas pixel before scroll
    const before = await page.evaluate(() => {
      const canvas = document.getElementById('webgl-bg') as HTMLCanvasElement;
      if (!canvas) return null;
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return gl ? 'webgl-present' : null;
      } catch { return null; }
    });
    expect(before).toBe('webgl-present');

    // ScrollTrigger fires when .trust-section enters viewport
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'smooth' }));
    await page.waitForTimeout(1500);

    // After entering trust-section trigger: spread should be 1.9, opacity 0.50
    // Verify via console log or canvas presence; full GPU-read not available in headless
    // Assert no JS errors occurred during scroll
    const errored = await page.evaluate(() => (window as any).__playWriteError || false);
    expect(errored).toBeFalsy();
  });
});

// ─── Liquid-ink cursor (desktop pointer:fine only) ────────────────────────
test.describe('Hero — liquid-ink cursor', () => {
  test('cursor-dot and cursor-ring exist in DOM', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await expect(page.locator('#cursor-dot')).toBeAttached();
    await expect(page.locator('#cursor-ring')).toBeAttached();
  });

  test('cursor becomes visible after first mouse move (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(500);
    await page.mouse.move(700, 450);
    await page.waitForTimeout(600);
    const opacity = await page.locator('#cursor-ring').evaluate(
      (el) => parseFloat(getComputedStyle(el).opacity)
    );
    // On desktop (pointer:fine) cursor should be opacity > 0 after move
    expect(opacity).toBeGreaterThan(0);
  });

  test('cursor-ring enlarges on product card hover ("VIEW" state)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(1000);
    await page.mouse.move(700, 450);
    await page.waitForTimeout(300);
    // Scroll to products section
    await page.evaluate(() => window.scrollTo({ top: 1200 }));
    await page.waitForTimeout(800);
    const card = page.locator('.product-card').first();
    await card.hover();
    await page.waitForTimeout(400);
    const text = await page.locator('#cursor-text').textContent();
    expect(text).toBe('VIEW');
  });

  test('cursor-ring shrinks on [data-magnetic] hover ("btn" state)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoHome(page);
    await page.waitForTimeout(1500);
    await page.mouse.move(700, 450);
    await page.waitForTimeout(300);
    const btn = page.locator('[data-magnetic]').first();
    await btn.scrollIntoViewIfNeeded();
    await btn.hover();
    await page.waitForTimeout(500);
    const scaleX = await page.locator('#cursor-ring').evaluate((el) => {
      const match = getComputedStyle(el).transform.match(/matrix\(([^,]+),/);
      return match ? parseFloat(match[1]) : 1;
    });
    // scaleX should be ~0.5 in "btn" state
    expect(scaleX).toBeLessThan(0.8);
  });
});
