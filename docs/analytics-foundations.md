# Analytics foundations (preview)

GA4 remains disabled: `analytics.js` still uses `G-XXXXXXXXXX`. No new analytics vendor, paid call tracking, or account configuration has been activated.

Existing Vercel analytics behavior is preserved. Existing `phone_click`, `cta_click`, `quote_start`, `quote_step`, and `quote_submit` names remain compatible. Quote tracking now includes on-page service forms and project intake. `quote_submit` requires `cu:lead-success` after the endpoint returns `ok:true`; it does not count button clicks, validation errors or failed requests. Once GA4 is configured, the same successful response also emits the recommended `generate_lead` event. Choose one lead event for business reporting, not both.

Events carry the coarse `ai_source` category: chatgpt, perplexity, claude, gemini, copilot, brave_search, or other_or_direct. Brave Search traffic is not proof of an AI answer citation. The source is taken from current recognized `utm_source` values or referrer hostname. Direct/hidden-referrer visits cannot identify their original AI engine. This is reporting groundwork, not an account-side segment or demonstrated conversion lift.

No form values, VINs, contact details, project scopes or raw UTM values are sent in funnel events. CTA URLs omit queries and fragments; GA4 page location omits queries and referrer is origin-only. Existing lead attribution stays separate from analytics.

## Activation and verification before launch

1. Obtain the intended GA4 property's measurement ID and verify consent/privacy configuration before activation.
2. Register `ai_source` as an event-scoped custom dimension and create an exploration filtered to the desired recognized source categories. Configure `generate_lead` as the lead key event only once.
3. Test a controlled authorized lead through actual storage and notification delivery; no real submission was made during these code checks.
4. Use DebugView/Realtime to confirm events in the intended property, no duplicate key events, no personal data, and production-only collection. The debug override is for authorized test properties, not production data.
5. Paid call tracking, Clarity, CRM/Shopmonkey outcome import, GBP activity, and external accounts remain separate decisions/configuration. Nothing here changes the public telephone number.
