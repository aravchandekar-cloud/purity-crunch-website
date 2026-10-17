/**
 * Purity Crunch — page-start choreography
 *
 * 1. Shared signals (always — also when the intro is skipped):
 *      window.__antonReady  Promise  the display face has loaded (1.5 s cap); adds html.fonts-ready
 *      window.__sceneReady  Promise  the 3D scene reported ready / failed / skipped (three-scene.js calls __sceneDone)
 *      window.__heroStart   Promise  t0 — the wipe starts (intro) or, without the intro, the page is ready
 * 2. Brand intro (#intro) — only when <html class="intro"> (set in <head>): counter 0→100, then a wipe.
 *
 * Deliberately GSAP-free so the intro still finishes when a CDN is blocked.
 * Loaded after smooth-scroll.js (window.lenisInstance) and before gsap-animations.js / three-scene.js.
 */
(function () {
    const root = document.documentElement;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    // ── signals ──────────────────────────────────────────────────────────
    let sceneResolve, heroResolve;
    window.__sceneReady = new Promise((r) => { sceneResolve = r; });
    window.__sceneDone = () => sceneResolve();
    window.__heroStart = new Promise((r) => { heroResolve = r; });
    const startHero = () => { window.__heroT0 = window.__heroT0 || performance.now(); heroResolve(); };

    // the wordmark / intro labels must never paint in the fallback face
    const anton = (document.fonts && document.fonts.load)
        ? Promise.race([document.fonts.load('400 1em Anton'), wait(1500)]).catch(() => {})
        : Promise.resolve();
    window.__antonReady = anton.then(() => { root.classList.add('fonts-ready'); });

    const intro = document.getElementById('intro');
    if (!root.classList.contains('intro') || !intro) {
        window.__antonReady.then(startHero);   // no intro: t0 = page ready (Anton loaded)
        setTimeout(startHero, 4500);           // safety net — never leave the hero hidden
        return;
    }

    // ── brand intro ──────────────────────────────────────────────────────
    const MIN = 1100;      // counter duration, ms
    const CAP = 2500;      // hard cap before the wipe starts, ms
    const num = intro.querySelector('.intro-num');
    const labels = intro.querySelectorAll('.intro-name, .intro-count');
    const lenis = window.lenisInstance;
    let phase = 'count';   // count → wipe → done
    let skipNow;
    const skipped = new Promise((r) => { skipNow = r; });

    if (lenis) lenis.stop();
    window.scrollTo(0, 0);

    const t = performance.now();
    const counted = new Promise((resolve) => {
        const step = (now) => {
            const p = Math.min(1, Math.max(0, (now - t) / MIN));   // the first rAF timestamp can predate `t`
            num.textContent = Math.round(100 * (1 - (1 - p) * (1 - p)));   // power2.out
            if (p < 1 && phase === 'count') requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
    });

    function wipe() {
        if (phase !== 'count') return;
        phase = 'wipe';
        num.textContent = '100';
        labels.forEach((l) => l.animate({ opacity: [1, 0] }, { duration: 250, easing: 'ease-out', fill: 'forwards' }));
        setTimeout(() => {
            startHero();   // t0 = wipe start
            intro.animate(
                { transform: ['translateY(0)', 'translateY(-100%)'] },
                { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
            ).onfinish = finish;
        }, 250);
    }

    function finish() {
        phase = 'done';
        if (lenis) lenis.start();
        root.classList.remove('intro');   // #intro falls back to display:none, the scroll lock is released
        try { sessionStorage.setItem('pc-intro', '1'); } catch (e) { /* private mode */ }
        if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    // wipe when: counter at 100 AND Anton loaded AND scene ready/failed/skipped — or at the cap, or on skip
    Promise.race([Promise.all([counted, window.__antonReady, window.__sceneReady]), wait(CAP), skipped]).then(wipe);

    intro.addEventListener('click', skipNow);
    document.addEventListener('keydown', (e) => {
        if (phase !== 'count') return;
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); skipNow(); }
    });
})();
