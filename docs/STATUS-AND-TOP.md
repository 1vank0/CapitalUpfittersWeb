# Step 6 preview

Based on the measurement-only production design. No visual pilot switch, tracking IDs, backend provisioning, Spanish publication, or production changes.

Back-to-top: visible beyond two viewports on pages at least three viewports tall; hidden while a marked closing CTA is visible. Native button, accessible name, keyboard focus returns to main/heading, reduced-motion support, mobile-action-bar clearance. Legacy floating quote bubble removed from display while the existing sticky mobile bar remains unchanged.

Status: `/api/status` returns unknown when `CMS_STATUS_CONTENT_URL` is unset, invalid or unavailable. Configure only with the reviewed HTTPS Payload `/api/public/content` feed after its published Business record is verified. The endpoint accepts no client-supplied feed URL and sends no secret. Weekly hours and date-only holiday overrides follow Payload's public projection. Same-day intervals only; ambiguous/overnight/invalid records fail unknown. Eastern Time including DST is computed on the server, with opening inclusive and closing exclusive. Browser refreshes at next change, at most five minutes, and on visibility/online; failure clears stale state. It never guesses hours from old site text. No response-time promise.

`shop_status` is prepared as a bounded event parameter (open/closed/unknown), with tracking still gated off. Real DebugView has not been tested. Footer/contact/schema remain existing baseline content until the planned CMS adapter connects all hours; this preview does not claim a synchronized CMS publication or a two-minute propagation SLA.

Tests cover boundaries, weekends, DST, holidays, validation and disabled endpoint. No real lead is submitted.
