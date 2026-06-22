/**
 * Purity Crunch — Hero Particle System
 * Canvas particles reacting to mouse — no dependencies
 */
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const COLORS = [
        'rgba(212, 130, 42, 0.55)', 'rgba(212, 130, 42, 0.28)',
        'rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.10)',
        'rgba(27, 73, 101, 0.35)',
    ];
    const COUNT = 80;
    let W, H, particles = [], mx = -999, my = -999, active = true, rafId = null;
    const R = 90; // mouse repulsion radius

    const resize = () => {
        W = canvas.width  = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    };

    const mkp = () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 1 + Math.random() * 2.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38,
        ox: 0, oy: 0,
    });

    const tick = () => {
        if (!active) return;
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            const dx = p.x - mx, dy = p.y - my;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < R && d > 0) {
                const f = (R - d) / R;
                p.ox += (dx / d) * f * 1.5;
                p.oy += (dy / d) * f * 1.5;
            }
            p.ox *= 0.91; p.oy *= 0.91;
            p.x += p.vx + p.ox * 0.07;
            p.y += p.vy + p.oy * 0.07;
            if (p.x < -8) p.x = W + 8;
            if (p.x > W + 8) p.x = -8;
            if (p.y < -8) p.y = H + 8;
            if (p.y > H + 8) p.y = -8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        rafId = requestAnimationFrame(tick);
    };

    document.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
    });
    document.addEventListener('mouseleave', () => { mx = -999; my = -999; });
    window.addEventListener('resize', resize);
    window.__particleHeroStop = () => { active = false; cancelAnimationFrame(rafId); };

    resize();
    particles = Array.from({ length: COUNT }, mkp);
    tick();
})();
