/**
 * Purity Crunch — Lenis Smooth Scroll + ScrollTrigger proxy + Scroll Progress Bar + in-page anchor router
 * Requires: lenis.min.js, gsap.min.js, ScrollTrigger.min.js (deferred in <head>, so they run before this file)
 *
 * Lenis 1.1.18 option names, checked against the 1.1.18 source: smoothWheel (default true) and
 * syncTouch (default false). The pre-1.0 `smooth` / `smoothTouch` options no longer exist and were ignored.
 * Under reduced motion Lenis is not instantiated: native scroll, and native anchor jumps that honour
 * the navbar offset through `html { scroll-padding-top }`.
 */
(function () {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasGsap = !!(window.gsap && window.ScrollTrigger);

    // ── Lenis ──────────────────────────────────────────────────────────
    if (!prefersReducedMotion && window.Lenis) {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            syncTouch: false,
        });

        if (hasGsap) {
            // ScrollTrigger proxy — one rAF loop (gsap.ticker) drives Lenis and the WebGL scene
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => { lenis.raf(time * 1000); });
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }

        // Expose globally
        window.lenisInstance = lenis;

        // ── In-page anchors (nav, CTAs, footer, modal CTA) → lenis.scrollTo with the navbar offset ──
        const navOffset = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        document.addEventListener('click', (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const hash = a.getAttribute('href');
            const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
            if (!target && !a.classList.contains('logo')) return;   // href="#" placeholders (legal links) stay as they are
            e.preventDefault();
            lenis.scrollTo(target || 0, { offset: target ? -navOffset() : 0 });
            if (target) {
                // a native fragment jump moves the keyboard focus start point to the target — keep that
                if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
        });
    }

    // ── Scroll Progress Bar ───────────────────────────────────────────
    const bar = document.getElementById('scroll-progress');
    if (bar && hasGsap) {
        gsap.to(bar, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: prefersReducedMotion ? true : 0.3,
            }
        });
    }
})();
