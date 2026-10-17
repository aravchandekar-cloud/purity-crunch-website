/**
 * Playwright Visual Regression Tests
 * Baselines: desktop 1440×900, mobile 375×812
 * Color schemes: light + dark
 * Cross-browser: Chrome 120+, Firefox 121+, Safari 17+, Edge 120+
 *
 * Run:  npx playwright test tests/visual-regression.spec.ts --update-snapshots
 * CI:   npx playwright test tests/visual-regression.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// The brand intro (js/intro.js) plays once per browser session and locks scroll while it runs. These specs exercise the
// page itself, so mark the intro as already seen — otherwise anything that scrolls or clicks in the first ~3 s is locked out.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.setItem('pc-intro', '1'); } catch (e) { /* private mode */ } });
});

// ─── Viewport definitions ──────────────────────────────────────────────────
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'faq', path: '/faq.html' },
];

const COLOR_SCHEMES: Array<'light' | 'dark'> = ['light', 'dark'];

// ─── Helpers ───────────────────────────────────────────────────────────────
async function waitForAnimations(page: Page) {
  // Pause GSAP and CSS animations for deterministic snapshots
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0ms !important;
        transition-delay: 0ms !important;
      }
    `,
  });
  // Allow Three.js to render at least one frame
  await page.waitForTimeout(500);
  // Freeze WebGL canvas if possible
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      // Capture current frame into a static image overlaid on canvas
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const img = canvas.toDataURL('image/png');
          const overlay = document.createElement('img');
          overlay.src = img;
          overlay.style.cssText = `
            position: absolute;
            top: ${canvas.offsetTop}px;
            left: ${canvas.offsetLeft}px;
            width: ${canvas.offsetWidth}px;
            height: ${canvas.offsetHeight}px;
            z-index: 9999;
            pointer-events: none;
          `;
          document.body.appendChild(overlay);
        }
      } catch (_) {
        // Canvas tainted or no context; proceed without freeze
      }
    }
    // Stop GSAP ticker if present
    if ((window as any).gsap) {
      (window as any).gsap.ticker.sleep();
    }
  });
}

async function disableCustomCursor(page: Page) {
  await page.addStyleTag({
    content: `
      .cursor, .cursor-follower, [data-cursor], #custom-cursor {
        display: none !important;
      }
      * { cursor: auto !important; }
    `,
  });
}

// ─── Screenshot config ─────────────────────────────────────────────────────
const SCREENSHOT_OPTS = {
  maxDiffPixels: 200,      // tight tolerance for regressions
  threshold: 0.1,          // per-pixel colour delta (0–1)
  animations: 'disabled' as const,
};

// ─── Desktop visual baselines ──────────────────────────────────────────────
test.describe('Visual regression — desktop 1440px', () => {
  for (const scheme of COLOR_SCHEMES) {
    for (const pg of PAGES) {
      test(`${pg.name} [${scheme}]`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(DESKTOP);
        await page.goto(`http://localhost:3000${pg.path}`, { waitUntil: 'networkidle' });
        await disableCustomCursor(page);
        await waitForAnimations(page);

        await expect(page).toHaveScreenshot(
          `${pg.name}-desktop-${scheme}.png`,
          { ...SCREENSHOT_OPTS, fullPage: true }
        );
      });
    }
  }
});

// ─── Mobile visual baselines ───────────────────────────────────────────────
test.describe('Visual regression — mobile 375px', () => {
  for (const scheme of COLOR_SCHEMES) {
    for (const pg of PAGES) {
      test(`${pg.name} [${scheme}]`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize(MOBILE);
        await page.goto(`http://localhost:3000${pg.path}`, { waitUntil: 'networkidle' });
        await disableCustomCursor(page);
        await waitForAnimations(page);

        await expect(page).toHaveScreenshot(
          `${pg.name}-mobile-${scheme}.png`,
          { ...SCREENSHOT_OPTS, fullPage: true }
        );
      });
    }
  }
});

// ─── Hero section isolation ────────────────────────────────────────────────
test.describe('Visual regression — hero section clip', () => {
  test('hero WebGL canvas rendered [desktop dark]', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize(DESKTOP);
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await waitForAnimations(page);

    const hero = page.locator('#hero, .hero, [data-section="hero"]').first();
    const count = await hero.count();
    if (count > 0) {
      await expect(hero).toHaveScreenshot('hero-desktop-dark.png', {
        ...SCREENSHOT_OPTS,
      });
    } else {
      // Fallback: viewport screenshot
      await expect(page).toHaveScreenshot('hero-viewport-desktop-dark.png', SCREENSHOT_OPTS);
    }
  });
});

// ─── axe-core WCAG 2.1 AA accessibility ───────────────────────────────────
test.describe('Accessibility — WCAG 2.1 AA', () => {
  for (const pg of PAGES) {
    test(`axe scan: ${pg.name}`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto(`http://localhost:3000${pg.path}`, { waitUntil: 'networkidle' });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules([
          // Disable rules that fire for WebGL canvas content (no accessible alternative yet)
          'document-title', // handled separately
        ])
        .analyze();

      if (results.violations.length > 0) {
        console.error(
          'Accessibility violations:',
          JSON.stringify(
            results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.length,
              help: v.helpUrl,
            })),
            null,
            2
          )
        );
      }

      expect(results.violations).toHaveLength(0);
    });

    test(`axe scan: ${pg.name} [mobile]`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto(`http://localhost:3000${pg.path}`, { waitUntil: 'networkidle' });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toHaveLength(0);
    });
  }
});

// ─── Memory leak: heap before/after 60s scroll loop ───────────────────────
test.describe('Memory leak detection', () => {
  test('heap delta < 50 MB after 60s scroll loop', async ({ page }) => {
    test.setTimeout(90_000);

    await page.setViewportSize(DESKTOP);
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Capture baseline heap
    const client = await (page as any).context().newCDPSession(page);
    await client.send('HeapProfiler.enable');
    const before = await client.send('Runtime.getHeapUsage');
    const heapBefore = before.usedSize / (1024 * 1024); // bytes → MB

    // 60-second scroll loop
    const scrollDuration = 60_000;
    await page.evaluate((duration) => {
      return new Promise<void>((resolve) => {
        const start = Date.now();
        const maxScroll = document.documentElement.scrollHeight;
        let direction = 1;

        function scroll() {
          const elapsed = Date.now() - start;
          if (elapsed >= duration) {
            resolve();
            return;
          }
          window.scrollBy(0, direction * 8);
          const pos = window.scrollY;
          if (pos >= maxScroll - window.innerHeight) direction = -1;
          if (pos <= 0) direction = 1;
          requestAnimationFrame(scroll);
        }
        requestAnimationFrame(scroll);
      });
    }, scrollDuration);

    // Force GC if possible
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(1000);

    const after = await client.send('Runtime.getHeapUsage');
    const heapAfter = after.usedSize / (1024 * 1024);
    const delta = heapAfter - heapBefore;

    console.log(`Heap before: ${heapBefore.toFixed(1)} MB`);
    console.log(`Heap after:  ${heapAfter.toFixed(1)} MB`);
    console.log(`Delta:       ${delta.toFixed(1)} MB`);

    expect(delta).toBeLessThan(50); // assert < 50 MB growth
  });
});
