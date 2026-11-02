# Capital Upfitters UI system

Authoritative presentation rules for the November 2026 UI overhaul. The owner's current brief supersedes the previous three-door navigation. This is a visual and interaction layer over the existing static pages and lead controllers.

## Foundation

- White `#ffffff`, mist `#f5f5f7`, ink `#1d1d1f`, body `#424245`, muted `#646469`.
- Blue and yellow belong to the existing logo mark only. Do not invent a new logo.
- One font: Geist, with system sans-serif fallbacks. Body and inputs start at 16px, line-height 1.6.
- Display: responsive 48–80px on home; service H1 40–64px; H2 30–44px; H3 20–24px. Phone headings reduce deliberately.
- Sentence case, negative heading tracking, balanced headings, readable paragraphs around 60 characters per line.
- Use `ui-system.css` tokens: 4/8/12/16/24/32/40/48/64/96px spacing. Section padding scales from 56 to 96px. Container max 1200px.
- Photo slots use 4:3 for heroes and 3:2 for service cards. Related content uses the same crop within a set.

## Assets and source order

1. `base.css`: reset and legacy tokens.
2. `style.css`: existing global components.
3. `brand-tokens.css`: established brand and legacy aliases.
4. `ux-10k.css`: retained page compatibility styles.
5. Page-specific CSS, where applicable.
6. `ui-system.css`: the new shared UI and scoped page treatments.

The quote page's existing builder CSS is still loaded in its original position. New quote rules are scoped under `.quote-page` so they win intentionally without changing the builder's state or validation logic. Do not add broad `!important` rules that make hidden wizard steps visible.

`partials/header.html` is the sole source for desktop and mobile navigation. `npm run sync-chrome` stamps shared chrome and the stylesheet/controller includes into marked pages. Do not edit stamped header/footer markup by hand. `npm run check-chrome` detects drift. The focused One Hour Hitch form retains its sub-brand header and gets the same action styling.

## Navigation

| Group | Purpose | Existing destinations |
|---|---|---|
| Services | Consumer services and vehicle protection | Bedliners, tonneau covers, steps, towing, undercoating, ceramic/PPF, tint, detailing, all services |
| Work Vehicles | Vans, work trucks and fleets | Fleet pages, toolboxes, wraps, first responder work |
| Industrial | Equipment, facilities, field work | Industrial coatings and government projects |
| Programs | Business relationships and partner access | Dealers, fleet accounts, government, rebates, partner portal |

- Sticky white header. Call and Get a quote are visible at every breakpoint. On phones Call uses a labeled phone icon button.
- Desktop navigation uses disclosure buttons with `aria-expanded`, `aria-controls` and hidden panels. These are website links, not ARIA application menus.
- Open on pointer entry after 100ms; close after 180ms on exit. The panel has a pointer bridge across the visual gap.
- Enter/Space toggle; Down/Up enter and cycle links; Home/End move to the first/last link; Left/Right change groups; Escape closes and restores trigger focus. Tab retains native document order.
- Below 1100px use a native modal `dialog` and native `details` groups. Modal background inertness, explicit Tab/Shift+Tab wrapping, Escape and scroll restoration are handled without form dependencies.
- Old per-page hamburger handlers target retired IDs/classes, so they no longer attach to these controls. `site-nav.js` is the only active shared navigation controller.
- Every navigation destination must already exist. Gallery, contact and the partner portal remain accessible.

## Buttons and icons

- Primary: ink fill, white text. Secondary: transparent/white with ink border. Ghost: text/underline with a quiet hover surface.
- In ink bands, primary becomes white/ink and secondary white-outline.
- Sizes: small ≥44px, default 48px, large 52px. Text never becomes unreadably small to make a row fit.
- Hover changes color/surface; press uses a small 120ms scale; disabled controls retain a distinct visible state.
- Focus: 2px ink outline with 4px offset and a white separating ring. Reverse on dark bands. Never remove keyboard focus styling.
- Shared decorative icons use `assets/ui-icons.svg`, 24px viewBox, 1.75px stroke, round caps/joins and `currentColor`. Controls carry accessible text names; icons themselves are hidden from assistive technology.
- Use the existing technical option illustrations inside the quote builder. They explain real configuration choices.

## Page rhythm

- Home: stable split offer, vehicle finder, customer paths, services, industrial work, retained proof/FAQ/location content and final CTA. No rotating headline or competing floating quote button.
- Service pages: breadcrumb, concise heading, short summary and two actions beside a properly sized media slot. Keep each route's existing detail, quote links, FAQs, pricing behavior and gallery feed.
- Service cards: image above the title and description. Copy is readable without hovering. No text over dark artwork.
- Quote: concise intro, audience tabs, visible progress rail, existing vehicle/services/contact steps, and one bottom wizard action rail. Desktop help stays secondary; phones keep the form first.
- Do not hide states, required fields, validation messages, success/reference panels or conditional hitch acknowledgments with presentation rules.

## Photography

Unverified generated automotive artwork is not evidence of our work. Use explicit labeled placeholders until authentic photos are supplied. `docs/IMAGE-NEEDS.md` maps every new placeholder to its crop, subject and illustrative generation prompt. Preserve real gallery-feed photos and their provenance. Generated concepts may be used only as clearly labeled illustration, never as customers or completed shop work.

## Compatibility and checks

- Keep page paths, canonical links, form IDs/names, API handlers, attribution, security checks, idempotency, rate limiting and spam guards intact.
- `npm run check`: all existing Node tests, shared chrome, navigation controller syntax, UI contracts and WCAG AA text-token contrast.
- Browser review: home, bedliner and quote at 320/375/390/414/768/1024/1280 CSS pixels; desktop disclosure keyboard flow; mobile modal/disclosure/Escape; quote tabs; validation; configured service; mocked request and success reference.
- Browser screenshots use the exact staging source as the before reference and the review branch as after. Phone screenshots are responsive iframe viewports, not physical-device testing. Test scripts and capture fixtures stay outside committed source.
- Existing server-side unit tests cover real persistence/email contracts. Browser submissions during UI QA use a local mock and never create shop leads.
- Review branch `redesign/ui-ux-polish-2026-11-02` has automatic Vercel deployment disabled. Do not deploy as part of this task.
