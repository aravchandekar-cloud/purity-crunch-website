/**
 * Purity Crunch — GSAP Ultra Animations v2
 * Requires: gsap.min.js + ScrollTrigger.min.js + smooth-scroll.js loaded before this
 */
gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'power3.out' });

const mm = gsap.matchMedia();

mm.add(
  {
    noMotion:  '(prefers-reduced-motion: reduce)',
    hasMotion: '(prefers-reduced-motion: no-preference)'
  },
  (ctx) => {
    const { hasMotion } = ctx.conditions;

    // ── 1. HERO ───────────────────────────────────────────────────────

    // Set hero-content as 3D stage
    gsap.set('.hero-content', { transformStyle: 'preserve-3d', transformPerspective: 1200 });

    // Initial states
    gsap.set('.hero .badge',        { x: -36, autoAlpha: 0 });
    gsap.set('.hero p',             { y: 22,  autoAlpha: 0 });
    gsap.set('.hero-buttons .btn',  { y: 20,  autoAlpha: 0 });
    gsap.set('.scroll-indicator',   { autoAlpha: 0 });

    // Char-by-char split on .word-reveal spans
    document.querySelectorAll('.word-reveal').forEach(span => {
        const text = span.textContent;
        span.innerHTML = text.split('').map(c =>
            c === ' '
                ? '<span class="char char-space" style="display:inline-block;white-space:pre"> </span>'
                : `<span class="char" style="display:inline-block">${c}</span>`
        ).join('');
        // Reset parent clip-path so it doesn't interfere
        gsap.set(span, { clipPath: 'none', autoAlpha: 1 });
        gsap.set(span.querySelectorAll('.char:not(.char-space)'), { clipPath: 'inset(0 105% 0 0)', autoAlpha: 0 });
    });

    // Ken Burns + hero parallax on scroll
    if (hasMotion) {
        gsap.to('.hero-bg', { scale: 1.04, y: 16, duration: 28, ease: 'none' });
        gsap.to('.hero-bg', {
            y: () => window.innerHeight * 0.38,
            ease: 'none',
            scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
        });
    }

    // Hero entrance timeline
    const heroTl = gsap.timeline({ delay: hasMotion ? 0.1 : 0 });
    heroTl
        .to('.hero .badge', { x: 0, autoAlpha: 1, duration: hasMotion ? 0.72 : 0, ease: 'back.out(1.7)', immediateRender: false })
        .to('.word-reveal .char:not(.char-space)', {
            clipPath: 'inset(0 0% 0 0)', autoAlpha: 1,
            duration: hasMotion ? 0.55 : 0,
            stagger: hasMotion ? 0.022 : 0,
            ease: 'power3.out', immediateRender: false
        }, '-=0.35')
        .to('.hero p',             { y: 0, autoAlpha: 1, duration: hasMotion ? 0.62 : 0, ease: 'power3.out', immediateRender: false }, '-=0.42')
        .to('.hero-buttons .btn',  { y: 0, autoAlpha: 1, duration: hasMotion ? 0.5 : 0, stagger: hasMotion ? 0.13 : 0, ease: 'power3.out', immediateRender: false }, '-=0.32')
        .to('.scroll-indicator',   { autoAlpha: 1, duration: hasMotion ? 0.5 : 0 }, '-=0.2');

    // Scroll indicator bounce loop
    if (hasMotion) {
        gsap.to('.scroll-indicator', { y: 9, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.5 });
    }

    // Hero 3D scene tilt on mousemove (paused during scroll)
    const isScrolling = () => window.lenisInstance && window.lenisInstance.isScrolling;
    if (hasMotion) {
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
                gsap.to(heroContent, { rotationX: 0, rotationY: 0, duration: 1.4, ease: 'elastic.out(1, 0.5)', overwrite: true });
            });
        }
    }

    // ── 2. FLOATING BADGE loop ────────────────────────────────────────
    if (hasMotion) {
        gsap.to('.experience-badge', { y: -9, rotation: 2.5, duration: 2.3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }

    // ── 3. TRUST SECTION ─────────────────────────────────────────────
    gsap.from('.trust-card', {
        y: 48, autoAlpha: 0, duration: hasMotion ? 0.72 : 0,
        stagger: { amount: 0.38, from: 'start' }, ease: 'power3.out',
        scrollTrigger: { trigger: '.trust-section', start: 'top 80%' }
    });

    // Counter animations
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const obj = { val: 0 };
        gsap.to(obj, {
            val: target, duration: hasMotion ? 1.6 : 0, ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; },
            scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
    });

    // ── GENERIC FADE-UPS (section headers + elements not covered by specific animations) ──
    gsap.utils.toArray('.section-header.fade-up').forEach(header => {
        gsap.from(header, {
            y: 30, autoAlpha: 0, duration: hasMotion ? 0.7 : 0, ease: 'power3.out',
            scrollTrigger: { trigger: header, start: 'top 85%' }
        });
    });
    gsap.utils.toArray('.faq-list.fade-up').forEach(el => {
        gsap.from(el, {
            y: 20, autoAlpha: 0, duration: hasMotion ? 0.5 : 0, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' }
        });
    });

    // ── 4. SECTION HEADING UNDERLINES ────────────────────────────────
    gsap.utils.toArray('.heading-underline').forEach(line => {
        gsap.from(line, {
            width: 0, duration: hasMotion ? 0.85 : 0, ease: 'power3.out',
            scrollTrigger: { trigger: line.closest('.section-header, .split-content'), start: 'top 85%' }
        });
    });

    // ── 5. PRODUCTS — 2×2 grid with stagger entrance ───────────────
    const isDesktop = window.matchMedia('(min-width: 769px)').matches;
    gsap.from('.product-card', {
        y: 55, autoAlpha: 0, duration: hasMotion ? 0.8 : 0,
        stagger: { each: 0.14 }, ease: 'power3.out',
        scrollTrigger: { trigger: '.product-rail', start: 'top 80%' }
    });
    if (hasMotion) {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                if (isScrolling()) return;
                const rect = card.getBoundingClientRect();
                const rx = ((e.clientY - rect.top  - rect.height/2) / rect.height) * -10;
                const ry = ((e.clientX - rect.left - rect.width /2) / rect.width)  *  10;
                gsap.to(card, { rotationX: rx, rotationY: ry, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
            });
            card.addEventListener('mouseleave', () => {
                gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'back.out(1.4)', transformPerspective: 800 });
            });
        });
    }

    // ── 6. VIDEOS SECTION ────────────────────────────────────────────
    gsap.from('.video-card', {
        y: 50, autoAlpha: 0, duration: hasMotion ? 0.75 : 0,
        stagger: 0.18, ease: 'power3.out',
        scrollTrigger: { trigger: '.videos-section', start: 'top 78%' }
    });

    // ── 7. HERITAGE SECTION ──────────────────────────────────────────
    // Deep parallax: image zooms out as section enters viewport
    if (hasMotion) {
        gsap.fromTo('.image-frame img',
            { scale: 1.1 },
            { scale: 1, ease: 'none',
              scrollTrigger: { trigger: '.heritage-section', start: 'top bottom', end: 'bottom top', scrub: 1.5 }
            }
        );
    }

    gsap.from('.image-frame-outer', {
        scale: 0.88, autoAlpha: 0, rotationY: 8, duration: hasMotion ? 1.2 : 0,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.heritage-section', start: 'top 68%' }
    });
    gsap.from('.location-bubble', {
        x: -30, autoAlpha: 0, duration: hasMotion ? 0.6 : 0, delay: 0.4,
        ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.heritage-section', start: 'top 68%' }
    });
    gsap.from('.heritage-section .split-content > *', {
        y: 30, autoAlpha: 0, duration: hasMotion ? 0.65 : 0,
        stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.split-content', start: 'top 75%' }
    });
    gsap.from('.feature-list li', {
        x: -28, autoAlpha: 0, duration: hasMotion ? 0.5 : 0,
        stagger: 0.09, ease: 'power2.out',
        scrollTrigger: { trigger: '.feature-list', start: 'top 80%' }
    });

    // Mouse-move 3D tilt on heritage image (desktop)
    if (hasMotion && isDesktop) {
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
                gsap.to(frameOuter, { rotationX: 0, rotationY: 0, duration: 1.2, ease: 'elastic.out(1, 0.5)', overwrite: true });
                if (frameImg) gsap.to(frameImg, { x: 0, y: 0, duration: 0.8, ease: 'power2.out', overwrite: true });
            });
        }
    }

    // ── 8. PROCESS SECTION ───────────────────────────────────────────
    gsap.to('.process-line-fill', {
        scaleX: 1, duration: 1, ease: 'none',
        scrollTrigger: { trigger: '.process-steps', start: 'top 70%', end: 'top 40%', scrub: hasMotion ? 1.2 : false }
    });
    gsap.from('.process-step', {
        y: 45, autoAlpha: 0, duration: hasMotion ? 0.7 : 0,
        stagger: { amount: 0.45, from: 'start' }, ease: 'power3.out',
        scrollTrigger: { trigger: '.process-steps', start: 'top 78%' }
    });
    gsap.from('.process-step-icon', {
        scale: 0.5, autoAlpha: 0, duration: hasMotion ? 0.5 : 0,
        stagger: { amount: 0.5 }, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.process-steps', start: 'top 72%' }
    });

    // ── 9. TESTIMONIALS ──────────────────────────────────────────────
    gsap.from('.testimonial-card', {
        y: 55, autoAlpha: 0, duration: hasMotion ? 0.75 : 0,
        stagger: { amount: 0.55, from: 'start' }, ease: 'power3.out',
        scrollTrigger: { trigger: '.testimonials-section', start: 'top 78%' }
    });

    // 3D tilt on testimonial cards (desktop only)
    if (hasMotion && isDesktop) {
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
                gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.7, ease: 'back.out(1.4)', transformPerspective: 900 });
            });
        });
    }

    // ── 10. FAQ ───────────────────────────────────────────────────────
    gsap.from('.faq-item', {
        y: 30, autoAlpha: 0, duration: hasMotion ? 0.6 : 0,
        stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.faq-list', start: 'top 80%' }
    });

    // ── 11. EXPORT SECTION ────────────────────────────────────────────
    gsap.from('.export-section .split-content > *', {
        x: -30, autoAlpha: 0, duration: hasMotion ? 0.65 : 0,
        stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.export-section', start: 'top 72%' }
    });
    gsap.from('.form-group', {
        x: -18, autoAlpha: 0, duration: hasMotion ? 0.5 : 0,
        stagger: 0.07, ease: 'power2.out',
        scrollTrigger: { trigger: '.form-container', start: 'top 78%' }
    });
    gsap.from('.export-image-wrap', {
        x: 40, autoAlpha: 0, duration: hasMotion ? 0.9 : 0,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.export-section', start: 'top 70%' }
    });
    gsap.from('.export-ready-badge', {
        scale: 0.6, autoAlpha: 0, duration: hasMotion ? 0.6 : 0, delay: 0.35,
        ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.export-section', start: 'top 70%' }
    });

    // ── 12. FOOTER ────────────────────────────────────────────────────
    gsap.from('.footer-top > *', {
        y: 30, autoAlpha: 0, duration: hasMotion ? 0.65 : 0,
        stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: '.footer', start: 'top 88%' }
    });

    return () => { ScrollTrigger.getAll().forEach(t => t.kill()); };
  }
);
