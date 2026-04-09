# Enterprise Plan Audit Report

**Plan:** `.paul/phases/03-contact-form-polish/03-01-PLAN.md`
**Audited:** 2026-04-03
**Verdict:** conditionally acceptable

---

## 1. Executive Verdict

The plan is well-structured and addresses the right UX improvements for the form. However, it had several gaps that would have shipped a partially broken feature (phone data silently lost at the webhook), accessibility shortcuts in trust signals, a US-centric phone placeholder on an Indian company's site, and a non-standard autocomplete attribute. After applying 5 must-have and 4 strongly-recommended fixes, the plan is enterprise-ready **conditional on** the site owner updating the Google Apps Script to handle the new `phone` field before launch.

---

## 2. What Is Solid

- **Boundaries are excellent.** The js/main.js no-touch rule is clearly stated and well-justified. Existing field names are protected.
- **Acceptance criteria are testable.** Gherkin format with specific counts and verifiable outputs.
- **Scope is tightly controlled.** No scope creep into animations, new pages, or palette changes.
- **Responsive verification** covers four breakpoints (375, 768, 1024, 1440px).
- **CSS-only approach** uses custom properties throughout, no hardcoded colors.
- **Form data collection is safe.** The existing JS uses `new FormData(form).entries()` which automatically picks up any new named input — no JS changes needed to send the phone field.
- **Country list expansion** is well-curated for B2B import markets.
- **Skill loading gates** are properly marked as blocking.

---

## 3. Enterprise Gaps Identified

### Critical: Webhook Data Loss (Must-Have)

The plan adds a `phone` field but does not acknowledge that the Google Apps Script on the receiving end must be updated to write it to a spreadsheet column. The JS will send `phone` in the JSON payload (confirmed: `Object.fromEntries(new FormData(form).entries())` captures all named fields), but a typical Apps Script `doPost` maps specific keys to columns. Without updating the script, **phone data is silently lost** — the user fills in their phone number, submits successfully, and the business never receives it.

**Resolution:** Added HTML comment documenting the requirement and added a verification checkpoint item. The actual Apps Script update is out of scope (no JS changes allowed), but the plan now explicitly surfaces this dependency.

### Accessibility: Trust Signals Markup (Must-Have)

The original plan used a generic `<div>` for trust signals. These are semantically a list of value propositions and should use `<ul>/<li>` for screen reader navigation. Icons also lacked `aria-hidden="true"` specification.

### UX: US-Centric Phone Placeholder (Strongly Recommended)

The placeholder `+1 (555) 000-0000` implies a US company. Purity Crunch is an Indian banana chip exporter. The placeholder should use an India-based format to match the company's origin and signal to international buyers that they're dealing with an Indian supplier.

### Validation: Phone Field Has No Format Guidance (Strongly Recommended)

`<input type="tel">` provides no built-in validation (unlike `type="email"`). The form uses `novalidate`, and the JS only checks `[required]` fields for non-empty values. Since phone is optional, it gets zero validation. Adding a `pattern` attribute provides visual feedback via CSS `:invalid` without blocking submission.

### Standards: Non-Standard Autocomplete Value (Strongly Recommended)

The existing `autocomplete="country"` on the country `<select>` is not a valid WHATWG autocomplete token. The correct value is `"country-name"`. This affects autofill accuracy across browsers.

### CSS: New Field Focus State Consistency (Strongly Recommended)

The plan didn't explicitly ensure the new phone input inherits focus styles from existing form fields. While CSS inheritance may handle it, the plan should explicitly verify this.

---

## 4. Upgrades Applied to Plan

### Must-Have (Applied: 3)

| # | Finding | What Was Added | Location in Plan |
|---|---------|---------------|-----------------|
| 1 | Webhook data loss risk | HTML comment documenting Apps Script update requirement + verification checkpoint item | Task 1 item 5, human-verify step 12 |
| 2 | Trust signals not semantic | Changed from `<div>` to `<ul>/<li>` with list-style reset in CSS | Task 1 item 3, Task 2 item 1 |
| 3 | Trust signal icons missing aria-hidden | Added `aria-hidden="true"` to all icon elements | Task 1 item 3 |

### Strongly Recommended (Applied: 5)

| # | Finding | What Was Added | Location in Plan |
|---|---------|---------------|-----------------|
| 1 | US-centric phone placeholder | Changed to India-based format `+91 98765 43210` | Task 1 item 1 |
| 2 | Phone field has no validation | Added `pattern` attribute + `title` for format guidance | Task 1 item 1 |
| 3 | Non-standard autocomplete="country" | Added step to fix to `autocomplete="country-name"` | Task 1 item 4 |
| 4 | Phone focus styles not guaranteed | Added explicit verification of focus-visible consistency | Task 2 item 3 |
| 5 | Invalid phone visual feedback | Added CSS `:not(:placeholder-shown):invalid` border rule | Task 2 item 3 |

### Deferred (1)

| # | Finding | Reason to Defer | Risk |
|---|---------|----------------|------|
| 1 | Email field has no format validation beyond browser default | The form has `novalidate` and JS only checks non-empty. However, `type="email"` still shows mobile keyboard correctly. Real validation should happen server-side (Apps Script). Adding client-side email regex is low-value and could block valid emails with unusual TLDs. | Low — the form works; invalid emails will bounce when the business replies |

---

## 5. Audit & Compliance Readiness

| Area | Status | Notes |
|------|--------|-------|
| WCAG 2.1 AA | Pass (after audit fixes) | Semantic list, aria-hidden on icons, autocomplete tokens corrected |
| Cross-browser | Pass | Standard HTML attributes, CSS custom properties, flexbox (baseline support) |
| Data integrity | Conditional | Phone field data will be lost unless Apps Script is updated — documented |
| Mobile UX | Pass | Responsive breakpoints covered, form rows collapse |
| Performance | Pass | No new assets, no JS changes, CSS additions are minimal |
| Security | Pass | No new attack surface; existing CORS/CSP unchanged |

---

## 6. Final Release Bar

- **Plan quality:** Enterprise-ready after audit fixes
- **Blocking dependency:** Google Apps Script must be updated to handle `phone` field before the form goes live with the phone field visible to users. This is documented in the plan as a post-deploy action item.
- **Recommendation:** Approve plan for APPLY. The site owner should update the Apps Script in parallel with or immediately after the HTML/CSS deploy.

---

**Summary:** Applied 3 must-have + 5 strongly-recommended. Deferred 1.
**Plan status:** Updated and ready for APPLY
