/**
 * Purity Crunch — GSAP animations
 * Requires: gsap.min.js + ScrollTrigger.min.js + smooth-scroll.js loaded before this
 *
 * One motion language: every entrance takes its duration, ease and stagger from MOTION below. No back / elastic / sine
 * on an entrance (elastic is reserved for hover snap-backs). Entrances play once (ScrollTrigger's default toggleActions).
 */
(function () {
// GSAP / ScrollTrigger CDN blocked → leave every section as authored (html.anim-failed forces any CSS-hidden state visible)
if (!window.gsap || !window.ScrollTrigger) {
    document.documentElement.classList.add('anim-failed');
    return;
}

gsap.registerPlugin(ScrollTrigger);

// Exact CSS cubic-bezier() as a GSAP ease function (core GSAP only ships named eases)
function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i++) {                      // Newton–Raphson
            const e = sx(t) - x;
            if (Math.abs(e) < 1e-6) return sy(t);
            const d = dx(t);
            if (Math.abs(d) < 1e-6) break;
            t -= e / d;
        }
        let lo = 0, hi = 1; t = x;                         // bisection fallback
        for (let i = 0; i < 30; i++) {
            const e = sx(t);
            if (Math.abs(e - x) < 1e-6) break;
            if (e < x) lo = t; else hi = t;
            t = (lo + hi) / 2;
        }
        return sy(t);
    };
}

// ── MOTION — the one place a duration, ease or stagger is chosen ────────────────────────────
// CSS twins (css/styles.css :root): --dur-1…4, --ease-expo, --ease-premium
const MOTION = {
    dur: { 1: 0.2, 2: 0.35, 3: 0.6, 4: 0.9 },
    heading: 0.85,                                          // section H2 mask reveal (translateY 110% → 0)
    ease: { expo: bezier(0.16, 1, 0.3, 1), premium: bezier(0.32, 0.72, 0, 1) },
    stagger: {
        card: 0.09, cell: 0.11, column: 0.12,               // cards & list items · trust/stat cells · product columns
        cta: 0.13, letter: 0.052, char: 0.022               // hero only: CTAs · wordmark letters · H1 characters
    },
    snap: 'elastic.out(1, 0.5)'                             // hover snap-backs only — never an entrance
};
const { dur: D, ease: E, stagger: S } = MOTION;
gsap.defaults({ ease: E.expo });

// H1 .word-reveal → .char split. Runs in every mode so the markup (and its a11y label) always exists;
// the hidden starting states below are only applied when motion is allowed.
function splitHeadline() {
    const h1 = document.querySelector('.hero h1');
    if (h1) h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
    document.querySelectorAll('.word-reveal').forEach(span => {
        span.innerHTML = [...span.textContent].map(c =>
            c === ' '
                ? '<span class="char char-space" aria-hidden="true" style="display:inline-block;white-space:pre"> </span>'
                : `<span class="char" aria-hidden="true" style="display:inline-block">${c}</span>`
        ).join('');
    });
}

const mm = gsap.matchMedia();

mm.add(
  {
    noMotion:  '(prefers-reduced-motion: reduce)',
    hasMotion: '(prefers-reduced-motion: no-preference)'
  },
  (ctx) => {
    const { hasMotion } = ctx.conditions;

    splitHeadline();
    // Reduced motion: no starting states, no tweens, no loops — the page is simply in its final state
    if (!hasMotion) return;

    const isDesktop = window.matchMedia('(min-width: 769px)').matches;
    const isScrolling = () => window.lenisInstance && window.lenisInstance.isScrolling;

    // ── Entrances ─────────────────────────────────────────────────────
    // Group entrance: items that scroll into view together enter together, staggered in DOM order (a grid row → left to
    // right, a list → top to bottom). Opacity only, never visibility: controls inside stay focusable, and focusing one
    // scrolls it into view, which plays its entrance.
    function enter(selector, { x = 0, y = 40, dur = D[3], stagger = S.card, start = 'top 88%' } = {}) {
        if (!document.querySelector(selector)) return;
        gsap.set(selector, { x, y, opacity: 0 });
        ScrollTrigger.batch(selector, {
            start,
            onEnter: (els) => gsap.to(els, { x: 0, y: 0, opacity: 1, duration: dur, ease: E.expo, stagger })
        });
    }

    // H2 mask reveal (3.1): the heading rises out of its overflow:hidden mask, then the underline (if any) draws.
    // Returns the timeline so the caller can add the rest of the header to it.
    function revealHeading(scope, trigger, start = 'top 85%') {
        const line = scope.querySelector('.h2-line');
        if (!line) return null;
        const tl = gsap.timeline({ scrollTrigger: { trigger, start } });
        tl.to(line, { yPercent: 0, duration: MOTION.heading, ease: E.expo });
        const underline = scope.querySelector('.heading-underline');
        if (underline) tl.to(underline, { scaleX: 1, duration: D[3], ease: E.expo }, '>-0.35');
        return tl;
    }
    // starting state of the masks: x/y pinned, or GSAP would read the CSS translateY(110%) as a px offset
    gsap.set('.h2-line', { x: 0, y: 0, yPercent: 110 });
    gsap.set('.heading-underline', { scaleX: 0 });

    // ── 1. HERO ───────────────────────────────────────────────────────

    // Set hero-content as 3D stage
    gsap.set('.hero-content', { transformStyle: 'preserve-3d', transformPerspective: 1200 });

    // Starting states — same as the CSS hidden states, so nothing jumps when GSAP takes over
    gsap.set('.hero .badge',        { y: 16, autoAlpha: 0 });
    gsap.set('.hero-side p',        { y: 16, autoAlpha: 0 });
    gsap.set('.hero-buttons .btn',  { y: 20, autoAlpha: 0 });
    gsap.set('.scroll-indicator',   { autoAlpha: 0 });
    gsap.set('.hero-wordmark .ch',  { x: 0, y: 0, yPercent: 100, opacity: 0 });   // x/y pinned: GSAP would otherwise read the CSS translateY(100%) as a px offset

    // Char starting states (the split itself already ran above)
    document.querySelectorAll('.word-reveal').forEach(span => {
        // Reset parent clip-path so it doesn't interfere
        gsap.set(span, { clipPath: 'none', autoAlpha: 1 });
        gsap.set(span.querySelectorAll('.char:not(.char-space)'), { clipPath: 'inset(0 105% 0 0)', autoAlpha: 0 });
    });

    // Ken Burns + hero parallax on scroll
    gsap.to('.hero-bg', { scale: 1.04, y: 16, duration: 28, ease: 'none' });
    gsap.to('.hero-bg', {
        y: () => window.innerHeight * 0.38,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
    });

    // Hero reveal timeline — t0 = the intro's wipe start (or page-ready when the intro is skipped), see js/intro.js.
    // Offsets (s): wordmark line 1 @0, line 2 @.24 · badge @.15 · H1 chars @.2 · paragraph @.4 · CTAs @.5 · cue @.9
    // (the 3D chips fade in at t0+.3 over 1.2 s — three-scene.js listens to the same signal)
    const wmLine = (n) => `.hero-wordmark .wm-line:nth-child(${n}) .ch`;
    const heroTl = gsap.timeline({ paused: true });
    heroTl
        .to(wmLine(1), { yPercent: 0, opacity: 1, duration: D[4], stagger: S.letter, ease: E.expo }, 0)
        .to(wmLine(2), { yPercent: 0, opacity: 1, duration: D[4], stagger: S.letter, ease: E.expo }, 0.24)
        .to('.hero .badge', { y: 0, autoAlpha: 1, duration: D[3], ease: E.expo }, 0.15)
        .to('.word-reveal .char:not(.char-space)', {
            clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, duration: D[3], stagger: S.char, ease: E.expo
        }, 0.2)
        .to('.hero-side p', { y: 0, autoAlpha: 1, duration: D[3], ease: E.expo }, 0.4)
        .to('.hero-buttons .btn', { y: 0, autoAlpha: 1, duration: D[3], stagger: S.cta, ease: E.expo }, 0.5)
        .to('.scroll-indicator', { autoAlpha: 1, duration: D[3], ease: E.expo }, 0.9)
        // cue loop (a loop, not an entrance) starts once the cue has arrived
        .add(() => gsap.to('.scroll-indicator', { y: 9, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }), 1.5);
    (window.__heroStart || Promise.resolve()).then(() => heroTl.play(0));

    // Hero 3D scene tilt on mousemove (paused during scroll)
    const heroEl      = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');
    if (heroEl && heroContent) {
        heroEl.addEventListener('mousemove', (e) => {
            if (isScrolling()) return;
            const rx = ((e.clientY / window.innerHeight) - 0.5) * -5;
            const ry = ((e.clientX / window.innerWidth)  - 0.5) *  7;
            gsap.to(heroContent, { rotationX: rx, rotationY: ry, duration: 0.9, ease: 'power2.out', overwrite: true });
        });
        heroEl.addEventListener('mouseleave', () => {
            gsap.to(heroContent, { rotationX: 0, rotationY: 0, duration: 1.4, ease: MOTION.snap, overwrite: true });
        });
    }

    // ── 2. FLOATING BADGE loop (a loop, not an entrance) ───────────────
    gsap.to('.experience-badge', { y: -9, rotation: 2.5, duration: 2.3, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    // ── 3. TRUST SECTION ─────────────────────────────────────────────
    enter('.trust-card', { y: 48, stagger: S.cell, start: 'top 82%' });

    // Counter animations (a count-up, not an entrance — unchanged)
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const obj = { val: 0 };
        gsap.to(obj, {
            val: target, duration: 1.6, ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; },
            scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
    });

    // ── SECTION HEADERS: eyebrow rises, H2 mask reveal + underline, description rises ──
    gsap.utils.toArray('.section-header').forEach(header => {
        const tl = revealHeading(header, header);
        if (!tl) return;
        const eyebrow = header.querySelector('.eyebrow-tag');
        const desc = header.querySelector('.section-desc');
        if (eyebrow) tl.from(eyebrow, { y: 14, opacity: 0, duration: D[3], ease: E.expo }, 0);
        if (desc) tl.from(desc, { y: 14, opacity: 0, duration: D[3], ease: E.expo }, 0.25);
    });

    // ── 5. PRODUCTS — 2×2 grid, one entrance per card (the CSS .reveal hook only toggles .is-visible now).
    // In two columns the 2nd and 4th card enter 120 ms after their neighbour.
    gsap.utils.toArray('.product-rail .dbl-shell').forEach((shell, i) => {
        gsap.from(shell, {
            y: 56, opacity: 0, duration: D[4], ease: E.expo,
            delay: isDesktop && i % 2 ? S.column : 0,
            scrollTrigger: { trigger: shell, start: 'top 88%' }
        });
    });
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            if (isScrolling()) return;
            const rect = card.getBoundingClientRect();
            const rx = ((e.clientY - rect.top  - rect.height/2) / rect.height) * -10;
            const ry = ((e.clientX - rect.left - rect.width /2) / rect.width)  *  10;
            gsap.to(card, { rotationX: rx, rotationY: ry, y: -3, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { rotationX: 0, rotationY: 0, y: 0, duration: D[4], ease: MOTION.snap, transformPerspective: 800 });
        });
    });

    // ── 5b. "Liquid" hover on the product images (3.10) ────────────────
    // An inline SVG filter (fractal noise + displacement) is applied to an image ONLY while it is hovered; on leave it settles
    // back with a springy ease and is then removed, so nothing idles on the GPU. One filter clone per image, so a quick move
    // from one card to the next never shares (or strands) state. Fine pointer, >768px, motion allowed (this whole context).
    // While a transition runs (~0.5 s each way) the chip scene behind the section pauses its render (window.__sceneHold, read by
    // three-scene.js): at <= .15 opacity nobody sees it, and on a weak integrated GPU the two together dropped the transition
    // to ~30 fps. The scene resumes the moment the transition ends.
    const liquidTpl = document.getElementById('liquid-filter');
    if (liquidTpl && isDesktop && window.matchMedia('(pointer: fine)').matches) {
        let holders = 0;
        document.querySelectorAll('.product-image').forEach((box, i) => {
            const img = box.querySelector('img');
            if (!img) return;
            const f = liquidTpl.cloneNode(true);
            f.id = `liquid-${i}`;
            liquidTpl.parentNode.appendChild(f);
            const noise = f.querySelector('feTurbulence'), map = f.querySelector('feDisplacementMap');
            const s = { scale: 1, freq: 0.009 };
            const apply = () => { map.setAttribute('scale', s.scale.toFixed(2)); noise.setAttribute('baseFrequency', s.freq.toFixed(5)); };
            let held = false;
            const hold = (on) => {   // per image, so an overwritten tween can never leave the scene paused
                if (on === held) return;
                held = on; holders += on ? 1 : -1;
                window.__sceneHold = holders > 0;
            };
            box.addEventListener('mouseenter', () => {
                img.style.filter = `url(#liquid-${i})`;
                hold(true);
                gsap.to(s, { scale: 28, freq: 0.022, duration: D[3], ease: E.expo, overwrite: true, onUpdate: apply, onComplete: () => hold(false) });
            });
            box.addEventListener('mouseleave', () => {
                hold(true);
                gsap.to(s, {
                    scale: 1, freq: 0.009, duration: 0.52, ease: 'elastic.out(1, 0.45)', overwrite: true, onUpdate: apply,
                    onComplete: () => { img.style.filter = ''; hold(false); }
                });
            });
        });
    }

    // ── 6. VIDEOS SECTION ────────────────────────────────────────────
    enter('.video-card', { y: 50 });

    // ── 7. HERITAGE SECTION ──────────────────────────────────────────
    // Deep parallax: image zooms out as section enters viewport
    gsap.fromTo('.image-frame img',
        { scale: 1.1 },
        { scale: 1, ease: 'none',
          scrollTrigger: { trigger: '.heritage-section', start: 'top bottom', end: 'bottom top', scrub: 1.5 }
        }
    );

    gsap.from('.image-frame-outer', {
        scale: 0.88, opacity: 0, rotationY: 8, duration: D[4], ease: E.expo,
        scrollTrigger: { trigger: '.heritage-section', start: 'top 68%' }
    });
    gsap.from('.location-bubble', {
        x: -30, opacity: 0, duration: D[3], delay: D[2], ease: E.expo,
        scrollTrigger: { trigger: '.heritage-section', start: 'top 68%' }
    });
    // each block of the copy enters as it scrolls in; the list's items enter on their own (never list + items)
    enter('.heritage-section .split-content > *:not(.feature-list)', { y: 30 });
    enter('.feature-list li', { x: -28, y: 0 });

    // Mouse-move 3D tilt on heritage image (desktop)
    if (isDesktop) {
        const heritageSection = document.querySelector('.heritage-section');
        const frameOuter      = document.querySelector('.image-frame-outer');
        const frameImg        = document.querySelector('.image-frame img');
        if (heritageSection && frameOuter) {
            heritageSection.addEventListener('mousemove', (e) => {
                if (isScrolling()) return;
                const rect = frameOuter.getBoundingClientRect();
                const rx = ((e.clientY - rect.top  - rect.height/2) / rect.height) * -8;
                const ry = ((e.clientX - rect.left - rect.width /2) / rect.width)  *  8;
                gsap.to(frameOuter, { rotationX: rx, rotationY: ry, transformPerspective: 900, duration: 0.6, ease: 'power2.out', overwrite: true });
                if (frameImg) {
                    gsap.to(frameImg, {
                        x: (e.clientX - rect.left - rect.width/2)  * 0.022,
                        y: (e.clientY - rect.top  - rect.height/2) * 0.022,
                        duration: 0.8, ease: 'power2.out', overwrite: true
                    });
                }
            });
            heritageSection.addEventListener('mouseleave', () => {
                gsap.to(frameOuter, { rotationX: 0, rotationY: 0, duration: 1.2, ease: MOTION.snap, overwrite: true });
                if (frameImg) gsap.to(frameImg, { x: 0, y: 0, duration: 0.8, ease: 'power2.out', overwrite: true });
            });
        }
    }

    // ── 8. PROCESS SECTION ───────────────────────────────────────────
    gsap.to('.process-line-fill', {
        scaleX: 1, duration: 1, ease: 'none',
        scrollTrigger: { trigger: '.process-steps', start: 'top 70%', end: 'top 40%', scrub: 1.2 }
    });
    // a step rises in, and its icon disc settles into place just after it
    gsap.set('.process-step', { y: 45, opacity: 0 });
    gsap.set('.process-step-icon', { scale: 0.6 });
    ScrollTrigger.batch('.process-step', {
        start: 'top 88%',
        onEnter: (steps) => {
            gsap.to(steps, { y: 0, opacity: 1, duration: D[3], ease: E.expo, stagger: S.card });
            gsap.to(steps.map(s => s.querySelector('.process-step-icon')), { scale: 1, duration: D[3], ease: E.expo, stagger: S.card, delay: D[1] });
        }
    });

    // ── 9. TESTIMONIALS ──────────────────────────────────────────────
    enter('.testimonial-card', { y: 48 });

    // 3D tilt on testimonial cards (desktop only)
    if (isDesktop) {
        gsap.set('.testimonial-card', { transformStyle: 'preserve-3d' });
        document.querySelectorAll('.testimonial-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                if (isScrolling()) return;
                const rect = card.getBoundingClientRect();
                const rx = ((e.clientY - rect.top  - rect.height/2) / rect.height) * -8;
                const ry = ((e.clientX - rect.left - rect.width /2) / rect.width)  *  8;
                gsap.to(card, { rotationX: rx, rotationY: ry, duration: 0.35, ease: 'power2.out', transformPerspective: 900 });
            });
            card.addEventListener('mouseleave', () => {
                gsap.to(card, { rotationX: 0, rotationY: 0, duration: D[4], ease: MOTION.snap, transformPerspective: 900 });
            });
        });
    }

    // ── 10. FAQ ───────────────────────────────────────────────────────
    enter('.faq-item', { y: 28 });

    // ── 11. EXPORT SECTION ────────────────────────────────────────────
    // heading + the copy and the form panel as ONE block each (the fields inside don't animate again)
    const exportContent = document.querySelector('.export-section .split-content');
    if (exportContent) revealHeading(exportContent, '.export-section', 'top 72%');
    enter('.export-section .split-content > *:not(h2)', { x: -30, y: 0, start: 'top 85%' });
    gsap.from('.export-image-wrap', {
        x: 40, opacity: 0, duration: D[4], ease: E.expo,
        scrollTrigger: { trigger: '.export-section', start: 'top 70%' }
    });
    gsap.from('.export-ready-badge', {
        scale: 0.6, opacity: 0, duration: D[3], delay: D[2], ease: E.expo,
        scrollTrigger: { trigger: '.export-section', start: 'top 70%' }
    });

    // ── 12. FOOTER ────────────────────────────────────────────────────
    enter('.footer-top > *', { y: 30, start: 'top 92%' });
    // the decorative wordmark's two lines rise out of its clipped box (the same mask motion as the headings)
    if (document.querySelector('.fw-line')) {
        gsap.set('.fw-line', { x: 0, y: 0, yPercent: 100 });   // x/y pinned: GSAP would read the CSS translateY(100%) as px
        gsap.to('.fw-line', {
            yPercent: 0, duration: D[4], ease: E.expo, stagger: S.card,
            scrollTrigger: { trigger: '.footer-wordmark', start: 'top 98%' }
        });
    }

    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }
);

// Bootstrap finished — cancels the 3 s watchdog in <head> (which would add html.anim-failed)
document.documentElement.classList.add('anim-ready');
})();
