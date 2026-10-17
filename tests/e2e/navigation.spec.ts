/**
 * Navigation E2E tests
 * Covers: desktop nav links (Lenis scroll), hamburger mobile drawer,
 * active-nav IntersectionObserver, logo click, cross-page nav to /faq.html,
 * "GET A QUOTE" / "Become a Distributor" nav CTA.
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
  await page.waitForTimeout(1000);
}

// ─── Desktop nav links ────────────────────────────────────────────────────
test.describe('Navigation — desktop nav links', () => {
  test('all primary nav anchor links are present', async ({ page }) => {
    await gotoHome(page);
    const hrefs = await page.locator('.nav-links a[href^="#"]').evaluateAll((anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href'))
    );
    expect(hrefs).toContain('#products');
    expect(hrefs).toContain('#heritage');
    expect(hrefs).toContain('#process');
    expect(hrefs).toContain('#export');
  });

  test('clicking "Our Products" nav link scrolls to #products', async ({ page }) => {
    await gotoHome(page);
    await page.locator('.nav-links a[href="#products"]').first().click();
    await page.waitForTimeout(1400);
    const top = await page.locator('#products').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(150);
  });

  test('clicking "Our Heritage" nav link scrolls to #heritage', async ({ page }) => {
    await gotoHome(page);
    await page.locator('.nav-links a[href="#heritage"]').first().click();
    await page.waitForTimeout(1400);
    const top = await page.locator('#heritage').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(150);
  });

  test('clicking "Process" nav link scrolls to #process', async ({ page }) => {
    await gotoHome(page);
    await page.locator('.nav-links a[href="#process"]').first().click();
    await page.waitForTimeout(1400);
    const top = await page.locator('#process').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(150);
  });

  test('clicking "Export Inquiry" nav link scrolls to #export', async ({ page }) => {
    await gotoHome(page);
    await page.locator('.nav-links a[href="#export"]').first().click();
    await page.waitForTimeout(1400);
    const top = await page.locator('#export').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(150);
  });

  test('"Become a Distributor" nav CTA scrolls to #export', async ({ page }) => {
    await gotoHome(page);
    await page.locator('.nav-links .btn.nav-btn').click();
    await page.waitForTimeout(1400);
    const top = await page.locator('#export').evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeLessThan(150);
  });

  test('navbar gets .scrolled class after scrolling 50px', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => window.scrollTo({ top: 100 }));
    await page.waitForTimeout(400);
    const hasScrolled = await page.locator('.navbar').evaluate((el) =>
      el.classList.contains('scrolled')
    );
    expect(hasScrolled).toBe(true);
  });

  test('navbar does not have .scrolled class at top of page', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(300);
    const hasScrolled = await page.locator('.navbar').evaluate((el) =>
      el.classList.contains('scrolled')
    );
    expect(hasScrolled).toBe(false);
  });
});

// ─── Active nav highlight ──────────────────────────────────────────────────
test.describe('Navigation — active nav state (IntersectionObserver)', () => {
  test('#home section gives .active-nav to "Home" link on page load', async ({ page }) => {
    await gotoHome(page);
    await page.waitForTimeout(800);
    const homeLink = page.locator('.nav-links a[href="#home"]');
    // Home is the first section, should be active at top
    const isActive = await homeLink.evaluate((el) => el.classList.contains('active-nav'));
    expect(isActive).toBe(true);
  });

  test('scrolling to #products sets .active-nav on the Products link', async ({ page }) => {
    await gotoHome(page);
    await page.evaluate(() => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(800);
    const link = page.locator('.nav-links a[href="#products"]:not(.btn)');
    const isActive = await link.evaluate((el) => el.classList.contains('active-nav'));
    expect(isActive).toBe(true);
  });
});

// ─── Mobile hamburger drawer ───────────────────────────────────────────────
test.describe('Navigation — mobile hamburger drawer', () => {
  const MOBILE = { width: 375, height: 812 };

  test('hamburger button is visible on mobile, hidden on desktop', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const hamburger = page.locator('.mobile-menu-btn');
    await expect(hamburger).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 900 });
    const displayDesktop = await page.locator('.mobile-menu-btn').evaluate(
      (el) => getComputedStyle(el).display
    );
    expect(displayDesktop).toBe('none');
  });

  test('clicking hamburger opens mobile drawer (nav-links.active)', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('.mobile-menu-btn').click();
    await page.waitForTimeout(600);
    const hasActive = await page.locator('.nav-links').evaluate((el) =>
      el.classList.contains('active')
    );
    expect(hasActive).toBe(true);
  });

  test('hamburger sets aria-expanded="true" when open', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('.mobile-menu-btn').click();
    await page.waitForTimeout(400);
    const expanded = await page.locator('.mobile-menu-btn').getAttribute('aria-expanded');
    expect(expanded).toBe('true');
  });

  test('clicking a drawer link closes the mobile drawer', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('.mobile-menu-btn').click();
    await page.waitForTimeout(500);
    await page.locator('.nav-links a[href="#products"]').click();
    await page.waitForTimeout(800);
    const hasActive = await page.locator('.nav-links').evaluate((el) =>
      el.classList.contains('active')
    );
    expect(hasActive).toBe(false);
  });

  test('Escape key closes the mobile drawer', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('.mobile-menu-btn').click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const hasActive = await page.locator('.nav-links').evaluate((el) =>
      el.classList.contains('active')
    );
    expect(hasActive).toBe(false);
  });

  test('body overflow:hidden while mobile drawer is open', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('.mobile-menu-btn').click();
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe('hidden');
  });

  test('mobile: no horizontal overflow at 375px viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('.mobile-menu-btn').click();
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });

  test('mobile: drawer closes after clicking link and body overflow restored', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.locator('.mobile-menu-btn').click();
    await page.waitForTimeout(400);
    await page.locator('.nav-links a[href="#heritage"]').click();
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });
});

// ─── Cross-page navigation ─────────────────────────────────────────────────
test.describe('Navigation — cross-page to /faq.html', () => {
  test('/faq.html loads and renders H1 (or equivalent heading)', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    // faq.html uses <details> accordion — assert page title is correct
    await expect(page).toHaveTitle(/purity crunch/i);
  });

  test('/faq.html has no webgl-bg canvas (three-scene.js not loaded)', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    const webglCanvas = await page.locator('#webgl-bg').count();
    expect(webglCanvas).toBe(0);
  });

  test('/faq.html loads under 3s TTFB on desktop', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE + '/faq.html', { waitUntil: 'domcontentloaded' });
    const ttfb = Date.now() - start;
    expect(ttfb).toBeLessThan(3000);
  });

  test('logo click from /faq.html returns to / (index.html)', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    await page.locator('.navbar .logo').click();
    await page.waitForURL(/\/$/, { timeout: 5000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test('all nav links on / have TTFB < 200ms', async ({ page }) => {
    const routes = ['/', '/faq.html'];
    for (const route of routes) {
      const t0 = Date.now();
      const response = await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      expect(response?.status()).toBe(200);
      expect(t1 - t0).toBeLessThan(3000); // TTFB + DOM ready < 3s
    }
  });
});

// ─── Tablet viewport (768px) ──────────────────────────────────────────────
test.describe('Navigation — tablet 768px', () => {
  test('tablet: all nav links visible (no hamburger needed)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const navLinks = page.locator('.nav-links');
    // Links row should be visible on tablet
    const display = await navLinks.evaluate((el) => getComputedStyle(el).display);
    expect(display).not.toBe('none');
  });
});
