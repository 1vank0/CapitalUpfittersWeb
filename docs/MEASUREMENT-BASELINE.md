# Measurement integration (unified preview, not enabled)

This unified preview includes the approved light pilots and redesigned content. It is NOT the production baseline. The separate measurement/baseline-gated-2026-11-13 branch remains the production-design baseline candidate; no baseline has begun.

## Gate

This is a static Vercel site, not Next.js. `/api/measurement-config` reads only `NEXT_PUBLIC_GA4_ID` and `NEXT_PUBLIC_CLARITY_ID` at runtime, validates IDs, and returns no-store public config. Empty/invalid IDs, errors, or missing endpoint fail closed. No env values were set. The analytics module never loads Vercel insights/speed, ad pixels or enhanced conversions. With IDs empty its only fetch is same-origin config; it makes no third-party **measurement** requests. Existing product images, Google reviews and other page resources remain outside this module: this is not a claim that the entire existing site is third-party-free.

A deployment-scoped config change can enable a tag; changing Vercel env values may require redeploy. Enable only after account ownership, privacy/consent requirements, vendor settings and intended environment are approved. GA4 and Clarity are third-party services. No legal exemption or no-banner conclusion has been established. Do not use real customer data for test verification.

GA4: disable Enhanced Measurement automatic form/outbound/download capture in property settings to avoid duplicates and automatic URL capture. Verify sanitized payloads in DebugView with a test property before production. Default page_view is disabled; explicit page_view carries a sanitized path, empty referrer, and explicit page variant label. No customer fields or VINs are sent. Clarity masks the entire document before loading; it does not load on query/hash-bearing URLs because its URL recording cannot be sanitized by our own event allowlist. This reduces coverage intentionally. Review masking and recording requirements before enabling; no cookie/consent setting is changed here.

## Ten measurement events and status extension

- call_click: telephone link, coarse location; click is not a completed call.
- form_start: first focus within each CMS form.
- form_submit: successful response with opaque lead_id; discarded spam excluded, retries deduplicated in page memory.
- vehicle_select: model completion in existing quote, year only. Free-text make/model intentionally excluded until a versioned allowlist exists.
- cover_select: supported radio controls on later pages; only fixed products. The unified cover pilot has mapped product controls. Controls absent from the production baseline remain dormant there; do not compare event rates without accounting for available controls.
- quote_step: existing quote step custom event, not initial render.
- hero_video: 25/50/75 milestones, only if a hero video exists. No video added.
- outbound_gbp: known Google maps/review hosts.
- guide_download: explicit `data-guide="price-guide|winter-checklist"` controls; no guide invented.
- nav_use: existing desktop menu hover/focus and expanded navigation controls.

The separate `shop_status` event accepts only open/closed/unknown when the status feature dispatches its update. All measurement names have allowlisted APIs; dormant triggers are not fabricated interactions. No approval/booking event is emitted from browser inputs. `CU_ANALYTICS.events` is a bounded, ephemeral diagnostic queue, not saved analytics. Events before config arrival are replayed to GA only if later explicitly enabled.

## Outcomes and sequence

Keep the existing design for the baseline. Accounts/privacy approved → enable measurement and approved phone setup → validate the same measurement stack → at least 2–3 clean weeks, with longer duration if volume or booking lag requires → controlled sequential pilot. No tracking/phone/CRM integration activated by this commit.

`lead_id` is an opaque submission UUID, not a customer/account identifier. Persisted response `reference` maps it to the durable lead; email-only fallback carries the same UUID but lacks a durable reference. Shopmonkey has not been wired. A reviewed private outcome ledger/import must map lead_id/reference to unique approved estimates and booked installs, timestamps and period before claiming complete attribution. Keep contact details and raw outcomes out of browser analytics; do not treat click counts as bookings. Calls without a verified source remain unmatched.

Primary metrics remain approved estimates and booked installs per 100 service-page visits (separate), not booked installs per estimate. Baseline and pilot periods use the same denominator and outcome maturation windows. Sequential comparison cannot fully remove seasonality, traffic mix or sales-process confounding. A 2–3 week baseline alone does not establish statistical power. Preserve tracking when reverting a design. The agreed >20% search decline for three sustained weeks is a design rollback guardrail, not a reason to disable measurement; investigate demand/indexing and revert immediately for technical form/indexing breakage.

## Verification remaining

Local mocks cover empty/configured flags, sanitization, event taxonomy, no-tag traffic and accepted/rejected lead behavior. No real DebugView, Clarity recording, lead delivery, Shopmonkey integration or production baseline was verified. Production is unchanged.

The page variant is light-pilot only on /services/bedliner and /services/tonneau; other paths are baseline. This labels technical exposure, not experiment assignment or proof of causality.
