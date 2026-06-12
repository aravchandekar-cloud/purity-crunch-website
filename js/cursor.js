/**
 * Purity Crunch — Magnetic Cursor
 * Only activates on pointer:fine (desktop) devices
 */
(function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dot  = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    const cursorText = document.getElementById('cursor-text');
    if (!dot || !ring) return;

    gsap.set([dot, ring], { autoAlpha: 0 });
    let isVisible = false;

    document.addEventListener('mousemove', (e) => {
        const { clientX: x, clientY: y } = e;
        if (!isVisible) {
            isVisible = true;
            gsap.to([dot, ring], { autoAlpha: 1, duration: 0.4 });
        }
        gsap.set(dot, { x, y });
        gsap.set(ring, { x, y });
    });

    document.addEventListener('mouseleave', () => {
        gsap.to([dot, ring], { autoAlpha: 0, duration: 0.3 });
        isVisible = false;
    });

    // ── Magnetic buttons ──────────────────────────────────────────────
    document.querySelectorAll('[data-magnetic]').forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width / 2);
            const dy = e.clientY - (rect.top  + rect.height / 2);
            gsap.to(el,   { x: dx * 0.28, y: dy * 0.28, duration: 0.4, ease: 'power2.out', overwrite: true });
            gsap.to(ring, { x: rect.left + rect.width/2 + dx * 0.1, y: rect.top + rect.height/2 + dy * 0.1, duration: 0.2, ease: 'power2.out', overwrite: true });
            document.body.classList.add('cursor-hover-btn');
        });
        el.addEventListener('mouseleave', () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: true });
            document.body.classList.remove('cursor-hover-btn');
        });
    });

    // ── Product card VIEW text ────────────────────────────────────────
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            if (cursorText) cursorText.textContent = 'VIEW';
            document.body.classList.add('cursor-hover-card');
        });
        card.addEventListener('mouseleave', () => {
            document.body.classList.remove('cursor-hover-card');
        });
    });
})();
