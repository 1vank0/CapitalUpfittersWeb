# Recommended Sitemap — Capital Upfitters Redesign

Companion to `best-principles.md` §9 and `reports/existing-site-audit.md` §1/§6. Planning document only — `sitemap.xml` itself is not edited here.

**Headline recommendation: preserve all 35 existing sitemapped URLs unchanged.** Audit confirms this is load-bearing SEO equity (audit §9, must-preserve item 4) — no slug changes, no removals, no consolidation this pass. The one structural fix recommended is a host-consistency correction on a single entry (§2 below), not a content change.

---

## 1. All 35 existing URLs, preserved, grouped

### Root / core pages (7)
| URL | Priority | Changefreq |
|---|---|---|
| `https://www.capitalupfitters.com/` | 1.0 | weekly |
| `https://www.capitalupfitters.com/start-here.html` | 0.9 | weekly |
| `https://www.capitalupfitters.com/fleet.html` | 0.9 | weekly |
| `https://www.capitalupfitters.com/dealer-government.html` | 0.9 | weekly |
| `https://www.capitalupfitters.com/quote.html` | 0.9 | weekly |
| `https://www.capitalupfitters.com/rebates.html` | 0.8 | monthly |
| `https://www.capitalupfitters.com/gallery.html` | 0.8 | weekly |

### Secondary pages (1)
| URL | Priority | Changefreq |
|---|---|---|
| `https://www.capitalupfitters.com/contact.html` | 0.8 | weekly |

### Services (17: index + 16)
| URL | Priority | Changefreq |
|---|---|---|
| `https://www.capitalupfitters.com/services/` | 0.9 | weekly |
| `https://www.capitalupfitters.com/services/bedliner.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/hitches.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/ceramic-coating.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/undercoating.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/tonneau.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/commercial-wraps.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/running-boards.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/camper-shells.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/toolboxes.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/suspension.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/exterior.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/lighting.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/industrial-coatings.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/mobile-detailing.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/window-tinting.html` | 0.85 | weekly |
| `https://www.capitalupfitters.com/services/stealth-hitches.html` | 0.8 | monthly |

Note: `stealth-hitches.html`'s priority (0.8) and changefreq (monthly) already differ slightly from its 15 sibling service pages (0.85/weekly) in the current sitemap — carried forward as-is; not a defect worth normalizing this pass, just noted since it's the same entry with the host issue (§2).

### Locations (4)
| URL | Priority | Changefreq |
|---|---|---|
| `https://www.capitalupfitters.com/locations/rockville-md.html` | 0.75 | weekly |
| `https://www.capitalupfitters.com/locations/bethesda-md.html` | 0.75 | weekly |
| `https://www.capitalupfitters.com/locations/silver-spring-md.html` | 0.75 | weekly |
| `https://www.capitalupfitters.com/locations/gaithersburg-md.html` | 0.75 | weekly |

### Blog (6: index + 5 posts)
| URL | Priority | Changefreq |
|---|---|---|
| `https://www.capitalupfitters.com/blog/` | 0.75 | weekly |
| `https://www.capitalupfitters.com/blog/undercoating-maryland-winter/` | 0.7 | monthly |
| `https://www.capitalupfitters.com/blog/leveling-vs-lift-kit/` | 0.7 | monthly |
| `https://www.capitalupfitters.com/blog/patriot-liner-vs-drop-in/` | 0.7 | monthly |
| `https://www.capitalupfitters.com/blog/weatherguard-vs-kargomaster/` | 0.7 | monthly |
| `https://www.capitalupfitters.com/blog/best-tonneau-covers-maryland/` | 0.7 | monthly |

**Total: 7 + 1 + 17 + 4 + 6 = 35 URLs — matches the audit's count exactly. No additions, no removals.**

Correctly excluded (per audit §6, judgment call not a defect): `privacy.html`, `terms.html`, `404.html` — legal boilerplate and error pages are commonly and defensibly left out of sitemaps.

## 2. Sitemap host inconsistency — recommended fix

**Finding (audit §1, §6):** 34 of the 35 `<loc>` entries use `https://www.capitalupfitters.com/...`. One entry — `services/stealth-hitches.html` — uses the bare `https://capitalupfitters.com/services/stealth-hitches.html` (no `www`). This entry also sits outside the `<!-- Service pages -->` comment block in the current file, suggesting it was appended later rather than authored as part of the standard block.

**Recommendation:** change this single entry's host to `https://www.capitalupfitters.com/services/stealth-hitches.html`, matching every other entry and matching the canonical-host policy in `seo-aeo-geo-plan.md` §3 (`https://www.capitalupfitters.com` as the single canonical entity across canonical tags, JSON-LD `url` fields, and the sitemap). This is a one-line change to `sitemap.xml`; also fold the entry back into the standard `<!-- Service pages -->` block formatting (matching `lastmod`/`changefreq`/`priority` pattern of its siblings) for consistency, while keeping its slightly different priority/changefreq values as noted in §1 unless Ivan wants them normalized too.

## 3. robots.txt

No change recommended. Current file is minimal and correct:
```
User-agent: *
Allow: /
Disallow: /assets/private/
Sitemap: https://www.capitalupfitters.com/sitemap.xml
```
`Disallow: /assets/private/` references a path that doesn't currently exist — harmless, no action needed. `Sitemap:` already points to the correct `www` host.

## 4. Noted future opportunity — NOT required this pass

**Location-page template + data pattern.** The audit found the 4 current location pages (`rockville-md.html`, `bethesda-md.html`, `silver-spring-md.html`, `gaithersburg-md.html`) are near-identical in structure and CSS, differing mainly in copy strings, `addressLocality`/`postalCode` schema values, and hero alt text (audit §4.4) — the expected, correct pattern for local-SEO geo pages, not a bug. This is a strong candidate for a one-template + small per-city-data-object generation approach rather than 4 independently hand-edited ~800–960-line files, and research (`research/top-five-analysis.md`) shows the strongest local competitors run denser geo-page networks than Capital Upfitters' current 4 cities.

Both the template-driven refactor and any expansion beyond the current 4 cities are explicitly **flagged as a future opportunity, not a requirement for this redesign pass** — consistent with `best-principles.md` §21's scope-discipline call ("4 real, well-built pages beat rushed additional ones") and §9's directive to keep `locations/` "as-is" structurally this round. No new location pages, no new URLs, and no sitemap changes beyond §2 are recommended in this pass.

## 5. Summary of changes recommended in this document

1. Preserve all 35 URLs, slugs, priorities, and changefreqs exactly as they are (§1).
2. Fix the single `stealth-hitches.html` host inconsistency to `www` (§2) — the only sitemap content change recommended.
3. Leave `robots.txt` untouched (§3).
4. Note, but do not act on, the location-page templating opportunity (§4) — future phase.
