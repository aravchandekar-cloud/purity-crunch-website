/**
 * Purity Crunch — 3D WebGL chip scene
 * Persistent background scene: procedural banana chips, scroll-choreographed.
 * Requires: gsap + ScrollTrigger globals (loaded in <head>), importmap for 'three'.
 * Fallback: on any failure the 2D #hero-canvas particle hero remains untouched.
 */
import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('webgl-bg');

init();

function init() {
    if (REDUCED || !canvas || !window.gsap || !window.ScrollTrigger) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
        });
    } catch (err) {
        console.warn('[3D] WebGL unavailable — keeping 2D hero.', err);
        return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    // Fog toward page background (--bg-color #F5F7FA) so distant chips melt into the page
    scene.fog = new THREE.Fog(0xf5f7fa, 16, 34);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 14);

    scene.add(new THREE.AmbientLight(0xfff2e0, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd4822a, 0.8);
    rim.position.set(-6, -3, -4);
    scene.add(rim);

    // ── Procedural chip geometry ───────────────────────────────────────
    function makeChipGeometry() {
        const geo = new THREE.CylinderGeometry(1, 1, 0.08, 24, 1);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
            const r = Math.sqrt(x * x + z * z);
            const ang = Math.atan2(z, x);
            // wavy irregular rim
            if (r > 0.5) {
                const rimWave = 1 + 0.06 * Math.sin(ang * 5) + 0.04 * Math.sin(ang * 9 + 1.7);
                pos.setX(i, x * rimWave);
                pos.setZ(i, z * rimWave);
            }
            // gentle potato-chip warp
            pos.setY(i, y + 0.09 * Math.sin(ang * 3 + r * 4) * r);
        }
        geo.computeVertexNormals();
        return geo;
    }

    const chipGeo = makeChipGeometry();

    // black-pepper variant: same shape + dark vertex-color flecks
    function makeSpeckledGeometry() {
        const geo = chipGeo.clone();
        const count = geo.attributes.position.count;
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const fleck = Math.random() < 0.12 ? 0.35 : 1.0;
            colors[i * 3] = fleck; colors[i * 3 + 1] = fleck; colors[i * 3 + 2] = fleck;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return geo;
    }

    const VARIANTS = [
        { color: 0xE8B44A, roughness: 0.55, geo: chipGeo, vertexColors: false }, // classic golden
        { color: 0x9C5A1E, roughness: 0.50, geo: chipGeo, vertexColors: false }, // jaggery amber
        { color: 0xB04A2A, roughness: 0.60, geo: chipGeo, vertexColors: false }, // masala red-brown
        { color: 0xD8B868, roughness: 0.65, geo: makeSpeckledGeometry(), vertexColors: true } // black pepper
    ];

    // ── Instanced chip cloud ───────────────────────────────────────────
    const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches;
    const TOTAL = IS_MOBILE ? 24 : 52;
    const PER = Math.ceil(TOTAL / VARIANTS.length);

    const dummy = new THREE.Object3D();
    const meshes = [];
    const chips = []; // per-instance data, flat across all meshes

    VARIANTS.forEach((v) => {
        // Lambert: cheap lit shader (no per-pixel PBR), big win for fullscreen overdraw
        const mat = new THREE.MeshLambertMaterial({
            color: v.color,
            transparent: true, opacity: 0.95, vertexColors: v.vertexColors
        });
        const mesh = new THREE.InstancedMesh(v.geo, mat, PER);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);
        meshes.push(mesh);

        for (let i = 0; i < PER; i++) {
            const ringAng = (chips.length / TOTAL) * Math.PI * 2;
            chips.push({
                mesh, index: i,
                base: new THREE.Vector3(
                    (Math.random() - 0.5) * 18,
                    (Math.random() - 0.5) * 10,
                    -8 + Math.random() * 9   // keep chips behind the content plane
                ),
                ring: new THREE.Vector3(
                    Math.cos(ringAng) * 8.5,
                    Math.sin(ringAng) * 5.5,
                    (Math.random() - 0.5) * 3
                ),
                rotAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
                rotSpeed: 0.15 + Math.random() * 0.35,
                scale: 0.3 + Math.random() * 0.45,
                phase: Math.random() * Math.PI * 2
            });
        }
    });

    // ── Scroll choreography ────────────────────────────────────────────
    const state = { spread: 1, ring: 0, opacity: 0.95, camY: 0 };

    const FORMATIONS = [
        { trigger: '.hero',                 spread: 1.0, ring: 0, opacity: 0.95 },
        { trigger: '.trust-section',        spread: 1.9, ring: 0, opacity: 0.50 },
        { trigger: '.products-section',     spread: 1.0, ring: 1, opacity: 0.90 },
        { trigger: '.videos-section',       spread: 2.0, ring: 0, opacity: 0.40 },
        { trigger: '.heritage-section',     spread: 2.3, ring: 0, opacity: 0.40 },
        { trigger: '.process-section',      spread: 2.0, ring: 0, opacity: 0.45 },
        { trigger: '.testimonials-section', spread: 2.6, ring: 0, opacity: 0.30 },
        { trigger: '.faq-section',          spread: 2.6, ring: 0, opacity: 0.25 },
        { trigger: '.export-section',       spread: 2.2, ring: 0, opacity: 0.35 }
    ];

    FORMATIONS.forEach((f) => {
        const apply = () => gsap.to(state, {
            spread: f.spread, ring: f.ring, opacity: f.opacity,
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
    let running = true;

    // Driven by gsap.ticker (same loop as Lenis raf) — one rAF, render runs in phase
    // with the scroll update instead of a competing second rAF loop.
    function tick() {
        if (!running) return;
        const t = clock.getElapsedTime();

        for (const c of chips) {
            pos.copy(c.base).multiplyScalar(state.spread).lerp(c.ring, state.ring);
            pos.y += Math.sin(t * 0.6 + c.phase) * 0.35; // idle bob
            quat.setFromAxisAngle(c.rotAxis, t * c.rotSpeed + c.phase);
            dummy.position.copy(pos);
            dummy.quaternion.copy(quat);
            dummy.scale.setScalar(c.scale);
            dummy.updateMatrix();
            c.mesh.setMatrixAt(c.index, dummy.matrix);
        }
        meshes.forEach((m) => {
            m.instanceMatrix.needsUpdate = true;
            m.material.opacity = state.opacity;
        });

        camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.04;
        camera.position.y += (state.camY - mouse.y * 0.8 - camera.position.y) * 0.04;
        camera.lookAt(0, state.camY * 0.5, 0);

        renderer.render(scene, camera);
    }

    // ── Lifecycle ──────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('visibilitychange', () => {
        running = !document.hidden;
    });

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        gsap.ticker.remove(tick);
        canvas.style.display = 'none';
        const hero2d = document.getElementById('hero-canvas');
        if (hero2d) hero2d.style.display = '';
        console.warn('[3D] WebGL context lost — reverted to 2D hero.');
    });

    // success: hide the 2D particle hero, start loop
    const hero2d = document.getElementById('hero-canvas');
    if (hero2d) hero2d.style.display = 'none';
    gsap.ticker.add(tick);
    console.log('[3D] WebGL chip scene initialized:', TOTAL, 'chips');
}
