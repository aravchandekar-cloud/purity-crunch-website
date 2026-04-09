# Purity Crunch UI Upgrade

## What This Is

Upgrading the existing Purity Crunch B2B banana chip export website UI to look more professional and credible for international B2B buyers. Full visual refresh — new fonts, color palette, logo — while staying on the same HTML/CSS/JS stack with no framework changes.

## Core Value

B2B buyers trust the site enough to initiate a partnership inquiry within one visit.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Campaign |
| Version | 0.0.0 |
| Status | v0.1 Shipped |
| Last Updated | 2026-04-03 |

## Requirements

### Core Deliverables

- New visual identity (fonts, color palette, logo design & placement)
- Improved contact/inquiry form (better UX, more professional)
- Enhanced testimonials section (more testimonials, better layout)

### Validated (Shipped)
- [x] Visual identity refresh (fonts, colors, logo) — v0.1 Phase 1
- [x] Testimonials section (6 B2B quotes, grid layout) — v0.1 Phase 2

### Active (In Progress)
None.

### Planned (Next)
None — v0.1 milestone complete.

### Out of Scope
- Framework migration (staying pure HTML/CSS/JS)
- Backend changes (Google Sheets webhook stays)
- New page additions (faq.html structure unchanged)

## Target Users

**Primary:** International B2B buyers
- Distributors, supermarket chains, wholesale buyers
- Evaluating Purity Crunch as a potential supplier
- Need to trust the brand quickly from website impression alone

## Constraints

### Technical Constraints
- Pure HTML5 + CSS3 + Vanilla JS only — no frameworks or build tools
- Form submits to Google Sheets via Google Apps Script webhook
- Must remain performant without a build pipeline

### Business Constraints
- No hard deadline
- No budget constraints stated

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Full visual refresh (fonts, colors, logo) | Current design needs professional upgrade for B2B credibility | 2026-04-03 | Active |
| Keep HTML/CSS/JS stack | No need for framework complexity on a marketing site | 2026-04-03 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Inquiry form submissions | Increase over current | - | Not started |
| Professional appearance | B2B-credible visual identity | - | Not started |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Markup | HTML5 | Single-page + FAQ page |
| Styling | CSS3 | Custom design system |
| Interactivity | Vanilla JS | Navbar, animations, form handling |
| Form Backend | Google Apps Script | Webhook to Google Sheets |
| Hosting | Static files | No build tools |

---
*Created: 2026-04-03*
