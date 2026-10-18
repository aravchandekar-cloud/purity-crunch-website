/**
 * Purity Crunch — 3D WebGL chip scene
 * Persistent background scene: procedural golden banana chips on ink, scroll-choreographed.
 * Requires: gsap + ScrollTrigger globals (loaded in <head>), importmap for 'three'.
 * Fallback: on any failure the 2D #hero-canvas particle hero remains untouched.
 *
 * Hero formation: big chips (1.6–2.2× their resting size) clustered in the lower part of the viewport, in front of
 * the wordmark and never inside the top row's bounding box (read from the DOM). Below the hero the field is an
 * ambient layer at <= .15 opacity, biased to the outer thirds — it never competes with body text or form fields.
 * Budgets: 4 draw calls, ~35k triangles at 52 chips, DPR cap 1.5, 52 / 24 chips (desktop / <= 768px).
 */
import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('webgl-bg');
const sceneDone = () => { if (window.__sceneDone) window.__sceneDone(); };   // js/intro.js promise: ready / failed / skipped

init();

function init() {
    if (REDUCED || !canvas || !window.gsap || !window.ScrollTrigger) { sceneDone(); return; }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
        });
    } catch (err) {
        console.warn('[3D] WebGL unavailable — keeping 2D hero.', err);
        sceneDone();
        return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    // Constant fog = the page ink (--bg-color #07111B), so distant chips melt into the page. Never tweened per section.
    scene.fog = new THREE.Fog(0x07111B, 16, 34);

    const CAM_Z = 14;
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, CAM_Z);
    const TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    // Warm key + amber rim on ink
    scene.add(new THREE.AmbientLight(0xfff0dc, 0.55));
    const key = new THREE.DirectionalLight(0xffe2b8, 1.6);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4822a, 1.25);
    rim.position.set(-6, -3, -4);
    scene.add(rim);

    // Small seeded PRNG — the layout must be identical on every load and every resize
    const mulberry32 = (a) => () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    // ── Procedural chip geometry: polar grid, thin rim wall, potato-chip warp ─────────
    // (~670 triangles; vertices shared between caps and wall so the rim reads as a soft bevel)
    function makeChipGeometry() {
        const SEG = 28, RINGS = 6, HALF = 0.035;
        const P = [];
        const surface = (r, a, side) => {
            const wave = 1 + (0.06 * Math.sin(a * 5) + 0.04 * Math.sin(a * 9 + 1.7)) * smooth(0.4, 1, r);   // irregular rim
            const rr = r * wave;
            const warp = 0.09 * Math.sin(a * 3 + r * 4) * r;                                                  // gentle chip curl
            P.push(Math.cos(a) * rr, side * HALF + warp, Math.sin(a) * rr);
        };
        surface(0, 0, 1);                                              // top centre = 0
        for (let k = 1; k <= RINGS; k++) for (let j = 0; j < SEG; j++) surface(k / RINGS, (j / SEG) * Math.PI * 2, 1);
        const bot = P.length / 3;
        surface(0, 0, -1);                                             // bottom centre
        for (let k = 1; k <= RINGS; k++) for (let j = 0; j < SEG; j++) surface(k / RINGS, (j / SEG) * Math.PI * 2, -1);
        const top = (k, j) => (k === 0 ? 0 : 1 + (k - 1) * SEG + (j % SEG));
        const bo = (k, j) => (k === 0 ? bot : bot + 1 + (k - 1) * SEG + (j % SEG));
        const I = [];
        for (let j = 0; j < SEG; j++) {
            I.push(top(0, 0), top(1, j + 1), top(1, j));                // top centre fan (normals up)
            I.push(bo(0, 0), bo(1, j), bo(1, j + 1));                   // bottom centre fan (normals down)
            for (let k = 1; k < RINGS; k++) {
                I.push(top(k, j), top(k, j + 1), top(k + 1, j + 1), top(k, j), top(k + 1, j + 1), top(k + 1, j));
                I.push(bo(k, j), bo(k + 1, j + 1), bo(k, j + 1), bo(k, j), bo(k + 1, j), bo(k + 1, j + 1));
            }
            I.push(top(RINGS, j), top(RINGS, j + 1), bo(RINGS, j + 1), top(RINGS, j), bo(RINGS, j + 1), bo(RINGS, j));   // rim wall
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        geo.setIndex(I);
        geo.computeVertexNormals();
        return geo;
    }

    // Per-vertex tone: toasted rim + slight noise; the pepper variant adds dark flecks
    function toneGeometry(base, seed, flecks) {
        const geo = base.clone();
        const rnd = mulberry32(seed);
        const p = geo.attributes.position;
        const col = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) {
            const rim = smooth(0.55, 1.05, Math.hypot(p.getX(i), p.getZ(i)));
            let b = 1 - 0.2 * rim + (rnd() - 0.5) * 0.1;
            if (flecks && rnd() < 0.07) b *= 0.35;
            col[i * 3] = b; col[i * 3 + 1] = b * (1 - 0.08 * rim); col[i * 3 + 2] = b * (1 - 0.2 * rim);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return geo;
    }

    const baseGeo = makeChipGeometry();
    const VARIANTS = [
        { color: 0xF2C14E, geo: toneGeometry(baseGeo, 11, false) },   // classic golden
        { color: 0xC98A2B, geo: toneGeometry(baseGeo, 23, false) },   // jaggery
        { color: 0xD2603A, geo: toneGeometry(baseGeo, 37, false) },   // masala
        { color: 0xE5C77A, geo: toneGeometry(baseGeo, 51, true) }     // black pepper, dark flecks
    ];

    // ── Instanced chip cloud ───────────────────────────────────────────
    const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
    const TOTAL = IS_MOBILE ? 24 : 52;
    const PER = Math.ceil(TOTAL / VARIANTS.length);

    const dummy = new THREE.Object3D();
    const meshes = [];
    const chips = []; // per-instance data, flat across all meshes
    const seed = mulberry32(0xB4A4A);

    VARIANTS.forEach((v) => {
        // Lambert: cheap lit shader (no per-pixel PBR) — big win for the fullscreen overdraw
        const mat = new THREE.MeshLambertMaterial({ color: v.color, transparent: true, opacity: 0, vertexColors: true });
        const mesh = new THREE.InstancedMesh(v.geo, mat, PER);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.visible = false;   // nothing to draw until the hero reveal fades the field in
        scene.add(mesh);
        meshes.push(mesh);

        for (let i = 0; i < PER; i++) {
            const n = chips.length;
            chips.push({
                mesh, index: i,
                rest: new THREE.Vector3(), ring: new THREE.Vector3(), hero: new THREE.Vector3(),
                // layout seeds (screen-space, so the layout can be rebuilt for any aspect ratio)
                side: seed() < 0.5 ? -1 : 1, rx: seed(), ry: seed() * 2 - 1, rz: -8 + seed() * 9,
                ringA: (n / TOTAL) * Math.PI * 2, ringZ: (seed() - 0.5) * 3,
                heroMul: 1,
                rotAxis: new THREE.Vector3(seed() - 0.5, seed() - 0.5, seed() - 0.5).normalize(),
                rotSpeed: 0.15 + seed() * 0.35,
                scale: 0.3 + seed() * 0.45,
                squash: 0.88 + seed() * 0.24,
                phase: seed() * Math.PI * 2
            });
        }
    });

    // ── Layout: everything is placed in screen space (NDC), then lifted to world space ──
    const toWorld = (out, nx, ny, z) => {
        const d = CAM_Z - z;
        return out.set(nx * TAN * camera.aspect * d, ny * TAN * d, z);
    };

    function layoutRest() {
        for (const c of chips) {
            // outer thirds only: |x| in [.45, 1.1] of the half-width
            toWorld(c.rest, c.side * (0.45 + c.rx * 0.65), c.ry * 1.05, c.rz);
            // ring: chips settle on the viewport perimeter, never across the middle
            toWorld(c.ring, Math.cos(c.ringA) * 1.02, Math.sin(c.ringA) * 1.02, c.ringZ);
        }
    }

    function layoutHero() {
        const W = window.innerWidth, H = window.innerHeight, aspect = W / H;
        const topEl = document.querySelector('.hero-top');
        // hero starts at the top of the document, so document space == viewport space at scroll 0
        const cutPx = topEl ? topEl.getBoundingClientRect().bottom + window.scrollY : H * 0.42;
        // margin = breathing room + idle bob (+ mouse parallax, desktop only)
        const cut = 1 - (2 * Math.min(cutPx + (IS_MOBILE ? 0.03 : 0.07) * H + 12, H * 0.92)) / H;      // NDC y of the lowest "forbidden" edge
        const rnd = mulberry32(0xC0FFEE);
        const radius = (scale, z) => (scale * 1.15) / (TAN * (CAM_Z - z));          // chip radius in NDC-y units

        // the band chips may occupy: below the top row, and on tall screens no higher than just above the wordmark
        const wm = document.querySelector('.hero-wordmark');
        const wmTop = wm ? 1 - (2 * (wm.getBoundingClientRect().top + window.scrollY)) / H : cut;
        const hi = Math.min(cut, wmTop + 0.3);

        // size range of the foreground chips (desktop 1.6–2.2×; a little gentler on a 375px-wide viewport so the wordmark stays readable)
        const mulMin = IS_MOBILE ? 1.35 : 1.6, mulSpan = IS_MOBILE ? 0.4 : 0.6;
        // how many chips form the big foreground cluster: ~30% (mobile 20%) coverage of that band
        const meanR = radius(0.525 * (mulMin + mulSpan / 2), 0);
        const bandArea = 2 * aspect * (hi + 1);
        const K = Math.max(IS_MOBILE ? 4 : 8, Math.min(TOTAL, Math.round(((IS_MOBILE ? 0.2 : 0.3) * bandArea) / (Math.PI * meanR * meanR))));
        const order = chips.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }

        const placed = [];
        order.forEach((ci, rank) => {
            const c = chips[ci];
            const fg = rank < K;
            c.heroMul = fg ? mulMin + rnd() * mulSpan : 1 + rnd() * 0.3;               // 1.6–2.2× larger in the hero
            const z = fg ? -3 + rnd() * 6.5 : -9 + rnd() * 4;                         // foreground in front, the rest deep behind
            const r = radius(c.scale * c.heroMul, z);
            const rxNdc = r / aspect;
            const yMax = Math.max(-1 + r * 0.2, hi - r * 1.1);                        // top edge stays under the top row
            const yMin = -1 + r * 0.2;                                               // may bleed off the bottom edge
            const xr = Math.max(0.05, 0.97 - rxNdc * 0.35);
            let best = null, bestScore = -1;
            for (let t = 0; t < 28; t++) {
                const nx = (rnd() + rnd() - 1) * xr;                                  // centre-weighted
                const ny = yMin + rnd() * Math.max(0, yMax - yMin);
                let score = 99;
                for (const q of placed) {
                    const d = Math.hypot((nx - q.x) * aspect, ny - q.y) / (r + q.r);
                    if (d < score) score = d;
                }
                if (score > bestScore) { bestScore = score; best = { x: nx, y: ny }; }
            }
            placed.push({ x: best.x, y: best.y, r });
            toWorld(c.hero, best.x, best.y, z);
        });
    }

    const layoutAll = () => { layoutRest(); layoutHero(); };
    layoutAll();

    // ── Scroll choreography ────────────────────────────────────────────
    // hero: the big cluster · every other section: an ambient field at <= .15 opacity, outer thirds
    const state = { spread: 1, ring: 0, hero: 1, opacity: 0.95, fade: 0, camY: 0 };

    const FORMATIONS = [
        { trigger: '.hero',                 spread: 1.0, ring: 0, hero: 1, opacity: 0.95 },
        { trigger: '.trust-section',        spread: 1.2, ring: 0, hero: 0, opacity: 0.15 },
        { trigger: '.products-section',     spread: 1.0, ring: 1, hero: 0, opacity: 0.15 },
        { trigger: '.videos-section',       spread: 1.3, ring: 0, hero: 0, opacity: 0.12 },
        { trigger: '.heritage-section',     spread: 1.4, ring: 0, hero: 0, opacity: 0.12 },
        { trigger: '.process-section',      spread: 1.3, ring: 0, hero: 0, opacity: 0.12 },
        { trigger: '.testimonials-section', spread: 1.5, ring: 0, hero: 0, opacity: 0.10 },
        { trigger: '.faq-section',          spread: 1.5, ring: 0, hero: 0, opacity: 0.10 },
        { trigger: '.export-section',       spread: 1.3, ring: 0, hero: 0, opacity: 0.12 }
    ];

    FORMATIONS.forEach((f) => {
        const apply = () => gsap.to(state, {
            spread: f.spread, ring: f.ring, hero: f.hero, opacity: f.opacity,
            duration: 1.4, ease: 'power2.inOut', overwrite: 'auto'
        });
        ScrollTrigger.create({
            trigger: f.trigger, start: 'top 60%', end: 'bottom 60%',
            onEnter: apply, onEnterBack: apply
        });
    });

    // slow camera descent across the whole page for parallax continuity
    gsap.to(state, {
        camY: -2.5, ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 }
    });

    // Hero reveal (t0 = intro wipe start / page ready): chips fade in at t0+.3 over 1.2 s.
    // Re-measure first — fonts and the reveal may have changed the top row's height since init.
    (window.__heroStart || Promise.resolve()).then(() => {
        layoutAll();
        gsap.to(state, { fade: 1, duration: 1.2, delay: 0.3, ease: 'power2.out' });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHero);

    // ── Mouse parallax (desktop) ───────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    if (!IS_MOBILE) {
        window.addEventListener('mousemove', (e) => {
            mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
            mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
        }, { passive: true });
    }

    // ── Render loop ────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const quat = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    let running = true, prevOpacity = -1;

    // Driven by gsap.ticker (same loop as Lenis raf) — one rAF, render runs in phase
    // with the scroll update instead of a competing second rAF loop.
    function tick() {
        if (!running) return;
        const t = clock.getElapsedTime();
        const h = state.hero;

        for (const c of chips) {
            pos.copy(c.rest).multiplyScalar(state.spread);
            if (state.ring) pos.lerp(c.ring, state.ring);
            if (h) pos.lerp(c.hero, h);
            pos.y += Math.sin(t * 0.6 + c.phase) * 0.35; // idle bob
            quat.setFromAxisAngle(c.rotAxis, t * c.rotSpeed + c.phase); // slow tumble
            dummy.position.copy(pos);
            dummy.quaternion.copy(quat);
            const s = c.scale * (1 + (c.heroMul - 1) * h);
            dummy.scale.set(s * c.squash, s, s / c.squash);
            dummy.updateMatrix();
            c.mesh.setMatrixAt(c.index, dummy.matrix);
        }
        meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });

        const opacity = state.opacity * state.fade;
        if (opacity !== prevOpacity) {
            meshes.forEach((m) => { m.material.opacity = opacity; m.visible = opacity > 0.004; });
            prevOpacity = opacity;
        }

        camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.04;
        camera.position.y += (state.camY - mouse.y * 0.8 - camera.position.y) * 0.04;
        camera.lookAt(0, state.camY * 0.5, 0);

        if (window.__sceneHold) return;   // a heavier effect (the product images' liquid hover, js/gsap-animations.js) has the GPU for ~0.5 s
        renderer.render(scene, camera);
    }

    // ── Lifecycle ──────────────────────────────────────────────────────
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            layoutAll();
        }, 150);
    });

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
        if (document.hidden) gsap.ticker.sleep(); else gsap.ticker.wake();
    });

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        running = false;
        gsap.ticker.remove(tick);
        meshes.forEach((m) => { m.material.dispose(); m.geometry.dispose(); });
        baseGeo.dispose();
        renderer.dispose();
        canvas.style.display = 'none';
        const hero2d = document.getElementById('hero-canvas');
        if (hero2d) hero2d.style.display = '';
        console.warn('[3D] WebGL context lost — reverted to 2D hero.');
    });

    // success: stop 2D particle rAF loop, hide canvas, compile + draw one frame under the intro, start the 3D loop
    window.__particleHeroStop?.();
    const hero2d = document.getElementById('hero-canvas');
    if (hero2d) hero2d.style.display = 'none';
    renderer.compile(scene, camera);
    meshes.forEach((m) => { m.visible = true; });   // one warm-up draw so no shader/upload hitch lands on the reveal
    tick();
    meshes.forEach((m) => { m.visible = false; });
    prevOpacity = -1;
    gsap.ticker.add(tick);
    console.log('[3D] WebGL chip scene initialized:', TOTAL, 'chips');
    sceneDone();
}
