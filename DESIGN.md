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
- Shared decorative icons use `assets/ui-icons-v2.svg`, 24px viewBox, 1.75px stroke, round caps/joins and `currentColor`. Controls carry accessible text names; icons themselves are hidden from assistive technology.
- Use the existing technical option illustrations inside the quote builder. They explain real configuration choices.

## Page rhythm

- Home: stable split offer, vehicle finder, customer paths, services, industrial work, retained proof/FAQ/location content and final CTA. No rotating headline or competing floating quote button.
- Service pages: breadcrumb, concise heading, short summary and two actions beside a properly sized media slot. Keep each route's existing detail, quote links, FAQs, pricing behavior and gallery feed.
- Service cards: image above the title and description. Copy is readable without hovering. No text over dark artwork.
- Services directory: compact white introduction, five native toggle-button filters, announced result count and captioned image cards. Filtering removes hidden cards from keyboard and assistive-technology navigation. Without JavaScript, every service remains visible and inactive filters stay hidden.
- Quote: concise intro, audience tabs, visible progress rail, existing vehicle/services/contact steps, and one bottom wizard action rail. Desktop help stays secondary; phones keep the form first.
- Do not hide states, required fields, validation messages, success/reference panels or conditional hitch acknowledgments with presentation rules.

## Photography

Generated automotive artwork is illustration, not evidence of completed work. The initial coordinated set lives in the media backend and carries an illustrative label until an actual photo is published through the image manager. `docs/IMAGE-NEEDS.md` maps every new placeholder to its crop, subject and illustrative generation prompt. Preserve real gallery-feed photos and their provenance. Generated concepts may be used only as clearly labeled illustration, never as customers or completed shop work.

## Compatibility and checks

- Keep page paths, canonical links, form IDs/names, API handlers, attribution, security checks, idempotency, rate limiting and spam guards intact.
- `npm run check`: all existing Node tests, shared chrome, navigation controller syntax, UI contracts and WCAG AA text-token contrast.
- Browser review: home, bedliner and quote at 320/375/390/414/768/1024/1280 CSS pixels; desktop disclosure keyboard flow; mobile modal/disclosure/Escape; quote tabs; validation; configured service; mocked request and success reference.
- Browser screenshots use the exact staging source as the before reference and the review branch as after. Phone screenshots are responsive iframe viewports, not physical-device testing. Test scripts and capture fixtures stay outside committed source.
- Existing server-side unit tests cover real persistence/email contracts. Browser submissions during UI QA use a local mock and never create shop leads.
- Review branch `redesign/ui-ux-polish-2026-11-02` has automatic Vercel deployment disabled. Do not deploy as part of this task.

## Customer experience and media editing

Service cards offer a service-detail link and a distinct direct quote action carrying an exact supported service ID. The vehicle step confirms an existing service selection. The homepage explains the quote-to-install sequence without promising a booking or price before fitment review. All existing required fields and submission controllers remain intact.

Images resolve through named backend slots at `/api/media`; never hardcode generated file paths in page markup. `/admin/media` provides upload, crop focus, alt text, illustration/photo classification, explicit preview/publish, history and restore. Icons remain versioned SVG. Read docs/MEDIA-MANAGEMENT.md for release configuration and validation limits.

## Shared motion refinement

Pages using `.site-nav` bypass the legacy animation injector. Scroll entry is a short, one-shot reveal on service offerings, audience paths, related cards and roadmap steps only. Content is visible before JavaScript and remains readable if an animation API is unavailable. Headings, counters, forms and wizard steps are not animated. Keyboard focus cancels a card's reveal; changing the operating-system motion preference cancels active reveals. Fine-pointer arrow cues and media elevation use the same ink/mist tokens; reduced motion disables image zoom. No copy, image slot or lead-controller contract changes.

## November 3 research-led editorial pass

The current preview moves from the earlier white gallery layout to a stronger neutral industrial composition. The palette remains white/mist/ink with the existing colored mark, and the font remains Geist. A graphite full-width split hero puts readable copy beside unobscured managed imagery. Four open, numbered customer paths precede optional vehicle entry. Existing address, hours and phone appear immediately below the hero. The service catalog uses larger two-column imagery, service headers share the split treatment and link to existing section anchors, and the quote workspace uses a graphite guidance rail beside the active form. Controls use 6px corners rather than pills.

Evidence informing the hierarchy: DiamondBack Covers' agency-reported hero and compatibility tests (Conversion Rate Experts), 50Floor's staged form case study (Intrepid), and live inspections of Christian Brothers Automotive Firestone, OC Mounts and Sabre Equipment. Those results do not predict Capital's conversion rate. Capital's mixed consumer/fleet/custom audience is why customer paths remain before optional fitment entry. Real shop facts and existing service content are retained; no new ratings, warranties, prices or compatibility claims are introduced.

The generated concept is an internal composition reference, not shipped imagery or proof of shop work. Existing backend slots and illustration labels remain. Media-origin availability and authenticated hosted browser verification are release gates; static checks alone are not visual sign-off. Original URLs, cleanUrls behavior, canonicals, schema, IDs, attribution and submit handlers remain in place.
