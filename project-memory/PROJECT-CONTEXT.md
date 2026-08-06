# Project Context

## Business (user-provided, 2026-08-06 — not yet independently verified)
Capital Auto Upfitters & Protective Coatings
12019 Nebel Street, Rockville, Maryland 20852
Phone: (301) 304-1419 · Email: capitalupfitters@gmail.com
Hours: Monday–Friday, 9:30 AM–4:30 PM
Primary market: Washington D.C., Maryland, Northern Virginia, regional fleet customers.
Related identities to present as one coherent operation: Capital Auto Upfitters & Protective Coatings, Patriot Liner Rockville, Capital Protective Coatings.

## Repository-verified (2026-08-06)
- Live production: capitalupfitters.com, Vercel project `capital-upfitters-website`.
- Site built originally with "Perplexity Computer" (per repo README), static HTML/CSS/JS.
- Existing design tokens (per README, may be superseded by merged Apple-palette redesign on `main` — needs re-verification during audit): nav/footer `#111827`, brand navy `#203055`, Barlow Condensed display / Inter body.
- Content already includes: services/ (16 services), locations/ (4 geo pages: Rockville, Bethesda, Silver Spring, Gaithersburg), blog/ (5 posts), gallery.html, quote.html, fleet.html, dealer-government.html, contact.html, a Tina CMS integration, and a lead API (`api/lead.js`).
- Dealer Portal referenced in README: `https://upfit-portal-58190af9.base44.app`.

## Primary audiences (user-provided)
Retail vehicle owners; luxury/performance vehicle owners; truck/SUV owners; contractors/trades; dealerships; commercial fleets; government agencies; law-enforcement/public-safety; industrial protective-coating customers.

## Core services (user-provided)
Trailer hitches/towing incl. Stealth Hitches, EcoHitch, Curt, Draw-Tite, B&W; truck accessories; spray-in bedliners (Patriot Liner); rust prevention/undercoating; Waxoyl; commercial van/truck upfitting; fleet upfitting; emergency/warning lighting; sirens/vehicle electronics; graphics installation; PPF; ceramic coatings; window tint; suspension; wheels/tires; industrial protective coatings.

## Brand direction (user-provided)
Premium, restrained, technically credible, luxurious without theatrics, appropriate for both luxury-vehicle owners and federal/commercial fleet managers, Apple-influenced hierarchy/spacing/simplicity, rich contrast without excessive brightness. Do not change homepage video without explicit approval.

## Known prior/parallel work (repo-verified, 2026-08-06)
- `main` already merged: Apple-inspired palette redesign (PR #10), AEO/GEO schema + homepage FAQ (PR #8), Tina CMS migration (PR #2).
- PR #11 (draft, open): luxury homepage + competitive-brief conversion system — not being built on (see DECISIONS.md).
- PR #3 (open): launch-readiness checklist — durable Postgres lead system, private media uploads, still has unchecked items.
- PR #4 (draft): quote-cart retrofit.
