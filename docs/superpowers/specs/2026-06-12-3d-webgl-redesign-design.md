# Purity Crunch — 3D WebGL Redesign Design

**Date:** 2026-06-12
**Status:** Approved by user
**Decisions (user-confirmed):** Full 3D experience · Three.js via CDN · Procedural chip geometry

## Goal

Redesign the Purity Crunch site with real-time 3D animated graphics: a single persistent WebGL scene of floating banana chips, choreographed by scroll across all sections, layered behind existing content. Existing GSAP/Lenis/cursor systems stay untouched.

## Architecture

One fixed full-viewport `<canvas id="webgl-bg">` behind all content (`position: fixed; z-index: 0; pointer-events: none`). One Three.js renderer, one scene, one camera. ScrollTrigger drives a master choreography timeline. This was chosen over per-section canvases (multiple WebGL contexts, no continuity) and hero-only WebGL (undersells the "full 3D" decision).

## Components

### `js/three-scene.js` (new, ES module, ~350 lines)

| Unit | Purpose | Interface |
|------|---------|-----------|
| `initWebGL()` | Feature-detect WebGL, create renderer, return false on failure | Called once on DOMContentLoaded; failure → 2D fallback stays |
| `ChipFactory` | Procedural banana chip: CylinderGeometry (24 radial segments, thin), vertex noise on rim + surface for irregularity, MeshStandardMaterial | `makeChipGeometry()`, `makeMaterial(variant)` |
| Chip variants | classic golden, jaggery amber, masala red-brown, black-pepper speckle | 4 materials, InstancedMesh per variant |
| `ChipCloud` | ~50 instances desktop / ~25 below 769px, random scale/rotation, per-chip tumble in `tick()` | Group added to scene |
| Lighting | Warm ambient + directional key + rim; `scene.fog` for depth | static |
| Camera rig | Mouse-parallax drift (desktop only, lerped); base position driven by scroll | |
| Choreography | ScrollTrigger scrub timeline mapping document scroll → formation morphs (see below) | GSAP timeline animating group/instance targets |

### Scroll choreography

- **Hero:** dense cloud floating around headline depth
- **Trust:** chips scatter outward / recede
- **Products:** chips form loose orbit ring near screen edges (content center stays clear)
- **Heritage/Process:** sparse slow drift, low opacity
- **Testimonials/FAQ/Contact:** few ambient chips, minimal motion

### Integration changes

- `index.html`: importmap for Three.js (jsdelivr CDN), `<canvas id="webgl-bg">`, `<script type="module" src="js/three-scene.js">`
- `css/styles.css`: stacking-context layers (canvas z-0, content z-1+); translucent/gradient backgrounds on hero + select sections so depth reads through; FAQ/form sections keep solid backgrounds for readability
- 2D particle hero (`js/particle-hero.js`): kept as automatic fallback. On WebGL success the 2D `#hero-canvas` is hidden; on failure or reduced-motion nothing changes.

## Error handling

- `try/catch` around init; any throw → log, keep 2D hero
- `webglcontextlost` listener → dispose, reveal 2D hero
- `visibilitychange` → pause render loop
- `prefers-reduced-motion: reduce` → skip WebGL entirely (consistent with existing gsap.matchMedia pattern)

## Performance budget

- DPR clamped ≤ 2, antialias on, no shadow maps
- InstancedMesh (4 draw calls for all chips)
- Three.js module ~150KB gzipped from CDN
- Target 60fps desktop, 30fps+ mobile

## Testing

1. Serve via `python -m http.server 8787`
2. Console: zero errors, init log present
3. Screenshots: hero, products, process, contact scroll positions
4. Resize to mobile width → reduced chip count, no overflow
5. Reduced-motion emulation → no WebGL canvas, 2D hero intact
