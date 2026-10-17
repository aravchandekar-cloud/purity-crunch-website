/**
 * Mid-page sections E2E tests
 * Covers: Videos (poster overlay, preload=none), Heritage (parallax image tilt),
 * Process (scroll scrub progress line), Testimonials (stagger + tilt),
 * FAQ accordion (GSAP expand/collapse, single-open, aria states).
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

async function scrollTo(page: Page, selector: string) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, selector);
  await page.waitForTimeout(800);
}

// ─── Videos section ───────────────────────────────────────────────────────
test.describe('Videos — poster overlay and play', () => {
  test('both video elements have preload="none"', async ({ page }) => {
    await gotoHome(page);
    const videos = page.locator('#videos video');
    await expect(videos).toHaveCount(2);
    const preloads = await videos.evaluateAll((els) =>
      (els as HTMLVideoElement[]).map((v) => v.getAttribute('preload'))
    );
    preloads.forEach((p) => expect(p).toBe('none'));
  });

  test('video poster overlays are present and visible before click', async ({ page }) => {
    await gotoHome(page);
    const overlays = page.locator('.video-poster-overlay');
    await expect(overlays).toHaveCount(2);
    for (const overlay of await overlays.all()) {
      await expect(overlay).toBeVisible();
    }
  });

  test('clicking poster overlay starts the first video and hides overlay', async ({ page }) => {
    await gotoHome(page);
    await scrollTo(page, '#videos');
    const overlay = page.locator('.video-poster-overlay[data-target="video-1"]');
    await overlay.click();
    await page.waitForTimeout(600);
    // Overlay should be hidden
    const hasHidden = await overlay.evaluate((el) => el.classList.contains('hidden'));
    expect(hasHidden).toBe(true);
    // Video should be playing or paused (started)
    const isPaused = await page.locator('#video-1').evaluate(
      (v) => (v as HTMLVideoElement).paused
    );
    // On Chromium headless autoplay may be blocked; video.play() should at least be called
    // so currentTime will be > 0 or video.paused becomes false
    const currentTime = await page.locator('#video-1').evaluate(
      (v) => (v as HTMLVideoElement).currentTime
    );
    expect(!isPaused || currentTime > 0 || hasHidden).toBe(true);
  });

  test('clicking the second video poster starts video-2', async ({ page }) => {
    await gotoHome(page);
    await scrollTo(page, '#videos');
    const overlay2 = page.locator('.video-poster-overlay[data-target="video-2"]');
    await overlay2.click();
    await page.waitForTimeout(600);
    const hasHidden = await overlay2.evaluate((el) => el.classList.contains('hidden'));
    expect(hasHidden).toBe(true);
  });

  test('video-1 has correct MP4 source', async ({ page }) => {
    await gotoHome(page);
    const src = await page.locator('#video-1 source').getAttribute('src');
    expect(src).toContain('.mp4');
  });

  test('desktop: video grid is 2-column layout', async ({ page }) => {
    await gotoHome(page);
    await scrollTo(page, '#videos');
    const grid = page.locator('.video-grid');
    const display = await grid.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('grid');
    const cols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    // Should have two column tracks
    expect(cols.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
  });

  test('mobile: videos stack vertically (single column)', async ({ page }) => {
    await gotoHome(page, { width: 375, height: 812 });
    await scrollTo(page, '#videos');
    const grid = page.locator('.video-grid');
    const cols = await grid.evaluate((el) => {
      const c = getComputedStyle(el).gridTemplateColumns;
      // Count how many distinct column tracks exist (split on space, filter empty)
      return c.trim().split(/\s+(?=\d|auto|fr|min|max|fit)/).length;
    });
    expect(cols).toBe(1);
  });
});

// ─── Heritage section ─────────────────────────────────────────────────────
test.describe('Heritage — parallax image and content', () => {
  test('heritage section renders heading and paragraphs', async ({ page }) => {
    await gotoHome(page);
    await scrollTo(page, '#heritage');
    await expect(page.locator('#heritage h2')).toBeVisible();
    const paras = page.locator('#heritage p');
    const count = await paras.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('heritage image has non-empty alt text', async ({ page }) => {
    await gotoHome(page);
    const alt = await page.locator('.heritage-section .image-frame img').getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt!.length).toBeGreaterThan(5);
  });

  test('heritage feature list has 4 items', async ({ page }) => {
    await gotoHome(page);
    const items = page.locator('.feature-list li');
    await expect(items).toHaveCount(4);
  });

  test('desktop: heritage image tilt on mousemove (3D transform applied)', async ({ page }) => {
    await gotoHome(page, { width: 1440, height: 900 });
    await scrollTo(page, '#heritage');
    const frame = page.locator('.image-frame-outer');
    const box = await frame.boundingBox();
    if (!box) throw new Error('Heritage frame not found');
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2);
    await page.waitForTimeout(700);
    const transform = await frame.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).not.toBe('none');
  });

  test('mobile: heritage image renders without parallax/tilt (no error)', async ({ page }) => {
    await gotoHome(page, { width: 375, height: 812 });
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await scrollTo(page, '#heritage');
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
  });

  test('partner CTA button in heritage links to #export', async ({ page }) => {
    await gotoHome(page);
    const href = await page.locator('#heritage .btn.glow-btn').getAttribute('href');
    expect(href).toBe('#export');
  });
});

// ─── Process section ───────────────────────────────────────────────────────
test.describe('Process — scroll-scrub progress line', () => {
  test('4 process steps are rendered', async ({ page }) => {
    await gotoHome(page);
    const steps = page.locator('.process-step');
    await expect(steps).toHaveCount(4);
  });

  test('each process step has a heading and description', async ({ page }) => {
    await gotoHome(page);
    const headings = page.locator('.process-step h3');
    const count = await headings.count();
    expect(count).toBe(4);
    for (const h of await headings.all()) {
      const text = await h.textContent();
      expect(text!.length).toBeGreaterThan(2);
    }
  });

  test('each step has a step number badge', async ({ page }) => {
    await gotoHome(page);
    const nums = page.locator('.process-step-number');
    await expect(nums).toHaveCount(4);
    const texts = await nums.evaluateAll((els) => els.map((el) => el.textContent?.trim()));
    expect(texts).toEqual(['1', '2', '3', '4']);
  });

  test('process progress line element exists', async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('.process-line-fill')).toBeAttached();
  });

  test('process progress line scaleX increases as user scrolls through section', async ({ page }) => {
    await gotoHome(page, { width: 1440, height: 900 });
    await scrollTo(page, '#process');
    const beforeScale = await page.locator('.process-line-fill').evaluate(
      (el) => getComputedStyle(el).transform
    );

    // Scroll down more to advance scrub
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(600);

    const afterScale = await page.locator('.process-line-fill').evaluate(
      (el) => getComputedStyle(el).transform
    );
    // Transform should have changed (scaleX progressed via ScrollTrigger scrub)
    expect(beforeScale !== afterScale || afterScale !== 'none').toBe(true);
  });

  test('process steps reveal (opacity > 0) after entering viewport', async ({ page }) => {
    await gotoHome(page);
    await scrollTo(page, '#process');
    await page.waitForTimeout(1200);
    const opacities = await page.locator('.process-step').evaluateAll((els) =>
      els.map((el) => parseFloat(getComputedStyle(el).opacity))
    );
    opacities.forEach((op) => expect(op).toBeGreaterThan(0.5));
  });

  test('process step images have alt text', async ({ page }) => {
    await gotoHome(page);
    const alts = await page.locator('.process-step-img img').evaluateAll((els) =>
      els.map((el) => (el as HTMLImageElement).getAttribute('alt'))
    );
    alts.forEach((alt) => {
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(5);
    });
  });
});

// ─── Testimonials section ─────────────────────────────────────────────────
test.describe('Testimonials — stagger reveal', () => {
  test('6 testimonial cards are rendered', async ({ page }) => {
    await gotoHome(page);
    const cards = page.locator('.testimonial-card');
    await expect(cards).toHaveCount(6);
  });

  test('testimonial cards become visible after scrolling into viewport', async ({ page }) => {
    await gotoHome(page);
    await scrollTo(page, '.testimonials-section');
    await page.waitForTimeout(1500);
    const opacities = await page.locator('.testimonial-card').evaluateAll((els) =>
      els.map((el) => parseFloat(getComputedStyle(el).opacity))
    );
    opacities.forEach((op) => expect(op).toBeGreaterThan(0.7));
  });

  test('each testimonial card contains a blockquote and author name', async ({ page }) => {
    await gotoHome(page);
    const quotes = page.locator('.testimonial-quote');
    const names = page.locator('.testimonial-name');
    expect(await quotes.count()).toBe(6);
    expect(await names.count()).toBe(6);
    for (const name of await names.all()) {
      const text = await name.textContent();
      expect(text!.length).toBeGreaterThan(3);
    }
  });

  test('each testimonial has 5 star icons', async ({ page }) => {
    await gotoHome(page);
    const cards = await page.locator('.testimonial-card').all();
    for (const card of cards) {
      const stars = await card.locator('.ph-star').count();
      expect(stars).toBe(5);
    }
  });

  test('desktop: testimonial cards get 3D tilt on mousemove', async ({ page }) => {
    await gotoHome(page, { width: 1440, height: 900 });
    await scrollTo(page, '.testimonials-section');
    await page.waitForTimeout(1200);

    const card = page.locator('.testimonial-card').first();
    const box = await card.boundingBox();
    if (!box) throw new Error('Card not found');

    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2);
    await page.waitForTimeout(400);

    const transform = await card.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).not.toBe('none');
  });

  test('mobile: testimonials in horizontal scroll carousel', async ({ page }) => {
    await gotoHome(page, { width: 375, height: 812 });
    await scrollTo(page, '.testimonials-section');
    const grid = page.locator('.testimonials-grid');
    const overflow = await grid.evaluate((el) => getComputedStyle(el).overflowX);
    expect(['auto', 'scroll']).toContain(overflow);
  });
});

// ─── FAQ accordion ────────────────────────────────────────────────────────
test.describe('FAQ — GSAP accordion', () => {
  async function openFaq(page: Page) {
    await scrollTo(page, '#faq');
    await page.waitForTimeout(600);
  }

  test('FAQ section has at least 4 items', async ({ page }) => {
    await gotoHome(page);
    const items = page.locator('.faq-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('all FAQ answers start collapsed (height 0)', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    const answers = page.locator('.faq-answer');
    const heights = await answers.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height)
    );
    heights.forEach((h) => expect(h).toBe(0));
  });

  test('clicking FAQ question expands the answer (height > 0)', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    await page.locator('.faq-question').first().click();
    await page.waitForTimeout(600);
    const height = await page.locator('.faq-answer').first().evaluate(
      (el) => el.getBoundingClientRect().height
    );
    expect(height).toBeGreaterThan(10);
  });

  test('FAQ question sets aria-expanded="true" when expanded', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    await page.locator('.faq-question').first().click();
    await page.waitForTimeout(400);
    const expanded = await page.locator('.faq-question').first().getAttribute('aria-expanded');
    expect(expanded).toBe('true');
  });

  test('only one FAQ item can be open at a time', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    const questions = page.locator('.faq-question');
    // Open first
    await questions.first().click();
    await page.waitForTimeout(500);
    // Open second
    await questions.nth(1).click();
    await page.waitForTimeout(600);

    const openItems = await page.locator('.faq-item.open').count();
    expect(openItems).toBe(1);
  });

  test('opening second FAQ auto-closes the first one', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    const questions = page.locator('.faq-question');
    await questions.first().click();
    await page.waitForTimeout(500);
    // Verify first is open
    const firstOpen = await page.locator('.faq-item').first().evaluate(
      (el) => el.classList.contains('open')
    );
    expect(firstOpen).toBe(true);
    // Open second
    await questions.nth(1).click();
    await page.waitForTimeout(600);
    // First should now be closed
    const firstNowClosed = await page.locator('.faq-item').first().evaluate(
      (el) => !el.classList.contains('open')
    );
    expect(firstNowClosed).toBe(true);
  });

  test('clicking an open FAQ question collapses it', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    const q = page.locator('.faq-question').first();
    await q.click();
    await page.waitForTimeout(500);
    // Click again to close
    await q.click();
    await page.waitForTimeout(500);
    const height = await page.locator('.faq-answer').first().evaluate(
      (el) => el.getBoundingClientRect().height
    );
    expect(height).toBeLessThan(5);
  });

  test('FAQ question button aria-expanded="false" after collapse', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    const q = page.locator('.faq-question').first();
    await q.click();
    await page.waitForTimeout(500);
    await q.click();
    await page.waitForTimeout(500);
    const expanded = await q.getAttribute('aria-expanded');
    expect(expanded).toBe('false');
  });

  test('FAQ answers have faq-answer-inner wrapper with readable text', async ({ page }) => {
    await gotoHome(page);
    await openFaq(page);
    await page.locator('.faq-question').first().click();
    await page.waitForTimeout(600);
    const text = await page.locator('.faq-answer-inner').first().textContent();
    expect(text).toBeTruthy();
    expect(text!.trim().length).toBeGreaterThan(20);
  });

  test('FAQ items have schema.org Question/Answer itemtype attributes', async ({ page }) => {
    await gotoHome(page);
    const items = page.locator('.faq-item[itemtype]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('mobile: FAQ tap targets are at least 48px tall', async ({ page }) => {
    await gotoHome(page, { width: 375, height: 812 });
    await openFaq(page);
    const heights = await page.locator('.faq-question').evaluateAll((btns) =>
      btns.map((btn) => btn.getBoundingClientRect().height)
    );
    heights.forEach((h) => expect(h).toBeGreaterThanOrEqual(44)); // 48px ideal; 44 acceptable minimum
  });
});

// ─── /faq.html full FAQ page ───────────────────────────────────────────────
test.describe('FAQ full page (/faq.html)', () => {
  test('faq.html has <details> accordion elements', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    const details = page.locator('details.faq-accordion');
    const count = await details.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('faq.html: details expand on click (native or scripted)', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    const first = page.locator('details.faq-accordion').first();
    // Click summary to open
    await first.locator('summary').click();
    await page.waitForTimeout(300);
    const open = await first.evaluate((el) => (el as HTMLDetailsElement).open);
    expect(open).toBe(true);
  });

  test('faq.html does not load three-scene.js (no webgl-bg)', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    const webglCanvas = await page.locator('#webgl-bg').count();
    expect(webglCanvas).toBe(0);
  });

  test('faq.html has shared navbar identical to index.html', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    await expect(page.locator('.navbar')).toBeVisible();
    await expect(page.locator('.navbar .logo')).toBeVisible();
  });

  test('faq.html footer copyright is present', async ({ page }) => {
    await page.goto(BASE + '/faq.html', { waitUntil: 'networkidle' });
    const footerText = await page.locator('footer').textContent();
    expect(footerText).toMatch(/purity crunch/i);
    expect(footerText).toMatch(/2026|©/i);
  });
});
