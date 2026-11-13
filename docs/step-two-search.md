# Step 2: search and measurement foundations

Preview only. Existing production routes remain intact; no production cutover, Google/Brave submission, account change, paid tracking or real lead submission is included.

## Implemented

- Public-page canonicals, Open Graph URLs, breadcrumb URLs, static internal navigation and sitemap use clean URLs. Existing `.html` routes and `cleanUrls` hosting behavior remain intact.
- Quote utilities carry `noindex, follow` in HTML and response-header configuration; they are excluded from sitemap. No blanket noindex is added to production. Vercel preview protection/noindex must still be checked on deployment and after eventual cutover.
- One consistent AutoRepair identity (`/#business`) with confirmed name/address/phone, referenced by Service providers. Duplicate breadcrumb graphs and unsupported business rating markup removed; visible FAQs retained.
- Analytics groundwork covers retail, fleet, dealer and project forms, including on-page forms, with successful-endpoint events rather than submit-click conversions. See `analytics-foundations.md`.
- `scripts/normalize-search.mjs` is an idempotent maintenance command for current static page inventory. Run it and `npm run sync-chrome` after changing page URLs or shared navigation.

## Verified official guidance (November 13, 2026)

- OpenAI: search and training controls are independent. https://developers.openai.com/api/docs/bots
- Google AI search features have no additional technical requirements beyond ordinary search eligibility and useful visible content. https://developers.google.com/search/docs/appearance/ai-features
- FAQ rich results retired May 7, 2026. FAQs remain useful visible buying information. https://developers.google.com/search/updates#faq-deprecation
- Self-serving LocalBusiness/Organization review stars are ineligible. https://developers.google.com/search/docs/appearance/structured-data/review-snippet#self-serving
- Google does not need llms.txt for search. https://developers.google.com/search/updates#clarifying-guidance-on-llms.txt-files
- Brave crawler does not advertise a unique user agent; Googlebot crawlability matters. https://search.brave.com/help/brave-search-crawler

Existing wildcard robots policy already allows search crawlers. No separate GPTBot/training allowance was added, and no visibility/ranking guarantee is made.

## Remaining gates

1. GA4 ID/property access and privacy/consent review; custom dimension and reporting setup. Code remains disabled for GA4 until configured. No Clarity or call tracking purchased/installed.
2. Controlled authorized end-to-end lead test for durable storage, notifications and outcome handoff. Mocked tests do not establish real delivery or automatic Shopmonkey synchronization.
3. Search Console access and indexing baseline. No claim that Google selected the proposed canonicals or indexed the changes.
4. Final all-page mobile/keyboard/browser QA, actual install photos, verified review provenance and service-specific content review. Illustrations cannot be converted into factual project evidence through captions.
5. Preview/production header checks at any future cutover, explicit production approval, then crawl/index monitoring. No automatic rollback threshold adopted.
6. GBP/directory edits, posts/replies and external re-fetch submissions remain separate actions with applicable approval.
