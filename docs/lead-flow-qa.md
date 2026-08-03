# Lead Flow QA Checklist

Manual verification steps to run before every production deploy. Prevents regressions in the site's most business-critical path: **visitor → quote submission → lead notification**.

Owner: Ivan (solo). Cadence: run before merging any PR that touches `quote.html`, `lead-form.js`, `attribution.js`, forms on other pages, or any file under `services/`. Estimated time: **8–12 minutes**.

---

## 1. Preview Environment Setup

- [ ] PR has a Vercel preview URL. Open it. Do **not** run this checklist against production.
- [ ] Open DevTools → Network + Console. Keep them open the whole time.
- [ ] Clear localStorage in DevTools → Application → Storage. This resets the quote-cart picker.

---

## 2. Homepage & Navigation (60 seconds)

- [ ] Homepage loads with no red errors in console.
- [ ] Hero, "Vehicles Upfitted" counter animates from 0 to 5,000+ once scrolled into view.
- [ ] Trustindex reviews widget renders below the hero (not a loading spinner forever).
- [ ] Portal Login link in the nav goes to `https://upfit-portal-58190af9.base44.app/PortalChoice` (opens in a new tab).
- [ ] Footer "Terms" link goes to `/terms.html` and the page renders 17 sections.

---

## 3. Service Picker (Phase 2 — new)

Test on `/quote.html`:

- [ ] Page loads with the "Step 1 of 2 — What are you looking to add?" panel above the form.
- [ ] 16 service chips render in the grid.
- [ ] Click a chip — it turns orange, gets a checkmark, and the sticky cart bar slides up from the bottom showing `1 selected`.
- [ ] Click 4 more chips — cart bar shows the 4 labels comma-separated, then `+2 more` for the 6th.
- [ ] Click a selected chip again — it deselects, cart bar count decrements.
- [ ] Scroll down to the audience tabs. The service checkboxes matching your picks should be pre-checked on the Personal Vehicle tab. Switch to Fleet — same services checked. Switch to Dealer — same.
- [ ] Uncheck one service checkbox on the form. Scroll back up — the corresponding chip is deselected.
- [ ] Click "Clear" on the cart bar — everything unchecks. Cart bar hides.
- [ ] Refresh the page — selections persist (localStorage). Clear again after this test.

**URL param deep-link test:**

- [ ] Visit `/quote.html?service=Bedliner,Ceramic%20Coating`. Both chips are pre-selected and checkboxes pre-checked.
- [ ] Visit `/quote.html?audience=fleet`. The Fleet tab is active on page load.

---

## 4. Quote Form — Retail Panel (2 minutes)

- [ ] Fill first name, last name, email, phone, ZIP.
- [ ] VIN lookup button: enter any 17-char VIN, click Look Up — either fills fields or shows a graceful "not found" message (no unhandled promise rejection in console).
- [ ] Select year/make/model dropdowns cascade correctly (selecting a make filters the models).
- [ ] Upload a small test image via the photo upload. Preview thumbnail appears.
- [ ] Confirm at least one service is checked (from the picker sync).
- [ ] Submit the form. Success panel replaces the form (no page reload, no console error).
- [ ] Check the destination inbox (`CapitalUpfitters@gmail.com`) — the mailto opens the default mail client with pre-filled body containing all fields **including a `Services` line with all selected chips**.

---

## 5. Quote Form — Fleet & Dealer Panels (2 minutes)

- [ ] Click the Fleet tab. Fill the Fleet form's required fields. Submit. Success panel appears.
- [ ] Click the Dealer tab. Fill the Dealer form's required fields. Submit. Success panel appears.
- [ ] Selected services from the picker carry into both submissions.

---

## 6. Attribution Fields (30 seconds)

The site records `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, and landing page.

- [ ] Visit `/quote.html?utm_source=qa-test&utm_medium=checklist&utm_campaign=lead-flow` from a new tab.
- [ ] Submit the retail form.
- [ ] The mailto body contains the three UTM params in the attribution block. (Attribution is injected by `attribution.js`.)

---

## 7. Cross-Page Forms (60 seconds)

- [ ] Contact page (`/contact.html`) form submits without console errors.
- [ ] Start Here page (`/start-here.html`) CTA leads to `/quote.html`.
- [ ] Fleet page (`/fleet.html`) — "Get Fleet Quote" CTA lands on `/quote.html?audience=fleet` with Fleet tab active.
- [ ] Dealer / Government page (`/dealer-government.html`) — "Request Program Terms" CTA lands on `/quote.html?audience=dealer` with Dealer tab active.

---

## 8. Console & Network Regression Check

- [ ] **No red errors in the console** on any of the pages tested above.
- [ ] **No requests to the old dead API** `capital-upfitters-6iq57bc73-ivan-s-projects-fc67197c.vercel.app` (Phase 1 disabled these).
- [ ] **No CORS errors.**
- [ ] Trustindex loader (`cdn.trustindex.io/loader.js`) returns 200.

---

## 9. Mobile Spot-Check (90 seconds)

Test on a real phone or DevTools mobile emulation (iPhone SE + iPhone 14 Pro Max viewports):

- [ ] Hamburger nav opens and closes.
- [ ] Service picker grid drops to 2 columns on narrow viewports.
- [ ] Sticky cart bar stacks vertically and stays visible above the fold.
- [ ] Quote form fields are legible and tap targets are at least 44px tall.
- [ ] Photo upload works on mobile Safari (test on iOS if possible).

---

## 10. Post-Deploy Smoke (production only)

After merging and Vercel finishes deploying to `capitalupfitters.com`:

- [ ] Homepage loads on production.
- [ ] Submit **one real quote** using a monitored inbox as the reply-to (e.g. a personal email).
- [ ] Confirm the lead lands in `CapitalUpfitters@gmail.com`.
- [ ] Confirm Resend delivery logs show the send if any transactional email is sent.

---

## When Something Fails

1. Note the failure in the PR description with the step number and a screenshot.
2. If the failure is a ship-blocker (broken form, broken CTA, console error), **do not merge**.
3. If cosmetic-only (badge alignment off, minor spacing), open a follow-up issue and merge with a note.

Ship-blockers are anything that breaks the visitor → lead path. Cosmetic issues can be fast-follow.
