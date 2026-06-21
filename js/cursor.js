/**
 * Purity Crunch — Liquid Ink Cursor
 * Velocity-stretch amber blob · spring snap-back · magnetic buttons · card VIEW
 */
(function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dot  = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    const cursorText = document.getElementById('cursor-text');
    if (!dot || !ring) return;

    let mouseX = 0, mouseY = 0;
    let prevX  = 0, prevY  = 0;
    let isVisible  = false;
    let hoverState = 'default'; // 'default' | 'btn' | 'card'
    let snapTimer;

    gsap.set([dot, ring], { autoAlpha: 0, xPercent: -50, yPercent: -50 });

    // Dot: pixel-perfect instant follow
    const setDotX = gsap.quickSetter(dot, 'x', 'px');
    const setDotY = gsap.quickSetter(dot, 'y', 'px');

    // Ring: spring-lag follow
    const ringToX = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3.out' });
    const ringToY = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3.out' });

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        setDotX(mouseX);
        setDotY(mouseY);
        ringToX(mouseX);
        ringToY(mouseY);

        if (!isVisible) {
            isVisible = true;
            gsap.to([dot, ring], { autoAlpha: 1, duration: 0.4 });
        }

        // Velocity stretch — only in default state
        if (hoverState === 'default') {
            const vx = mouseX - prevX;
            const vy = mouseY - prevY;
            const speed   = Math.sqrt(vx * vx + vy * vy);
            const stretch = Math.min(speed * 0.028, 0.65);
            const angle   = speed > 0.8 ? Math.atan2(vy, vx) * (180 / Math.PI) : 0;

            gsap.to(ring, {
                scaleX:    1 + stretch,
                scaleY:    Math.max(0.52, 1 - stretch * 0.5),
                rotation:  angle,
                duration:  0.1,
                ease:      'none',
                overwrite: 'auto'
            });

            clearTimeout(snapTimer);
            snapTimer = setTimeout(() => {
                if (hoverState === 'default') {
                    gsap.to(ring, {
                        scaleX: 1, scaleY: 1, rotation: 0,
                        duration: 0.75, ease: 'elastic.out(1, 0.42)', overwrite: 'auto'
                    });
                }
            }, 80);
        }

        prevX = mouseX;
        prevY = mouseY;
    });

    document.addEventListener('mouseleave', () => {
        gsap.to([dot, ring], { autoAlpha: 0, duration: 0.3 });
        isVisible = false;
    });

    // ── Magnetic buttons ──────────────────────────────────────────────
    document.querySelectorAll('[data-magnetic]').forEach(el => {
        el.addEventListener('mouseenter', () => {
            hoverState = 'btn';
            clearTimeout(snapTimer);
            gsap.to(ring, {
                scaleX: 0.5, scaleY: 0.5, rotation: 0,
                background:  'rgba(212,130,42,0.32)',
                borderColor: 'rgba(212,130,42,0.65)',
                duration: 0.28, ease: 'power2.out', overwrite: true
            });
        });
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width  / 2);
            const dy = e.clientY - (rect.top  + rect.height / 2);
            gsap.to(el, { x: dx * 0.28, y: dy * 0.28, duration: 0.4, ease: 'power2.out', overwrite: true });
        });
        el.addEventListener('mouseleave', () => {
            hoverState = 'default';
            gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: true });
            gsap.to(ring, {
                scaleX: 1, scaleY: 1,
                background:  'rgba(212,130,42,0.07)',
                borderColor: 'rgba(212,130,42,0.25)',
                duration: 0.35, ease: 'power2.out', overwrite: true
            });
        });
    });

    // ── Product card VIEW text ────────────────────────────────────────
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            hoverState = 'card';
            clearTimeout(snapTimer);
            if (cursorText) { cursorText.textContent = 'VIEW'; cursorText.style.opacity = '1'; }
            gsap.to(dot,  { autoAlpha: 0, duration: 0.18, overwrite: true });
            gsap.to(ring, {
                scaleX: 1.82, scaleY: 1.82, rotation: 0,
                background:  'rgba(27,73,101,0.9)',
                borderColor: 'transparent',
                duration: 0.4, ease: 'power2.out', overwrite: true
            });
        });
        card.addEventListener('mouseleave', () => {
            hoverState = 'default';
            if (cursorText) { cursorText.textContent = ''; cursorText.style.opacity = '0'; }
            gsap.to(dot,  { autoAlpha: 1, duration: 0.18, overwrite: true });
            gsap.to(ring, {
                scaleX: 1, scaleY: 1,
                background:  'rgba(212,130,42,0.07)',
                borderColor: 'rgba(212,130,42,0.25)',
                duration: 0.35, ease: 'power2.out', overwrite: true
            });
        });
    });
})();
