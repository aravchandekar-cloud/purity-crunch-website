/**
 * Purity Crunch — Lenis Smooth Scroll + ScrollTrigger proxy + Scroll Progress Bar
 * Requires: lenis.min.js, gsap.min.js, ScrollTrigger.min.js loaded before this
 */
(function () {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Lenis ──────────────────────────────────────────────────────────
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: !prefersReducedMotion,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    // ScrollTrigger proxy
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Expose globally
    window.lenisInstance = lenis;

    // ── Scroll Progress Bar ───────────────────────────────────────────
    const bar = document.getElementById('scroll-progress');
    if (bar) {
        gsap.to(bar, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.3,
            }
        });
    }
})();
