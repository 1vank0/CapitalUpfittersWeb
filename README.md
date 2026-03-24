# Capital Upfitters — Phase 1 Website

**Live site:** https://www.perplexity.ai/computer/a/capital-upfitters-phase-1-wsrEl_22TWScNe6kem57zg

Professional vehicle upfitting website for Capital Upfitters, Rockville MD.  
Built with [Perplexity Computer](https://www.perplexity.ai/computer).

---

## Site Architecture

```
/
├── index.html                    Homepage (audience funnel)
├── start-here.html               Audience routing page
├── fleet.html                    Fleet & Commercial hub
├── dealer-government.html        Dealer & Government hub
├── gallery.html                  Filterable masonry gallery
├── quote.html                    3-audience quote form
├── contact.html                  Contact, map, callback form
│
├── services/
│   ├── index.html                Retail services hub
│   ├── bedliner.html             Spray-On Bedliners (Patriot Liner)
│   ├── hitches.html              Hitches & Towing / Stealth Hitch
│   ├── ceramic-coating.html      Ceramic Coating & PPF
│   ├── undercoating.html         Undercoating & Rust Protection
│   ├── tonneau.html              Tonneau Covers
│   ├── running-boards.html       Running Boards & Steps
│   └── commercial-wraps.html     Commercial Vehicle Wraps & Advertising
│
├── locations/
│   ├── rockville-md.html         Rockville, MD geo page
│   ├── bethesda-md.html          Bethesda, MD geo page
│   ├── silver-spring-md.html     Silver Spring, MD geo page
│   └── gaithersburg-md.html      Gaithersburg, MD geo page
│
├── base.css                      Design tokens, reset, typography
├── style.css                     Global components (nav, hero, footer, gallery)
├── sitemap.xml                   19-URL sitemap
└── robots.txt                    Search engine directives
```

---

## Design System

| Token | Value |
|---|---|
| Nav / Footer background | `#111827` |
| Brand accent (navy) | `#203055` |
| Body background | `#ffffff` |
| Surface | `#f9fafb` |
| Primary text | `#111827` |
| Muted text | `#6b7280` |
| Footer text | `#B3B3B3` |
| Display font | Barlow Condensed (≈ HCo Tungsten) |
| Body font | Inter (≈ HCo Gotham SSm) |
| Button style | Pill-shaped (`border-radius: 9999px`) |
| Nav height | 64px |

Colors sourced from [onehourhitch.com](https://www.onehourhitch.com).  
Fonts approximate [patriotliner.site](https://patriotliner.site) (HCo Tungsten / HCo Gotham SSm).

---

## Business Details

- **Name:** Capital Auto Upfitters & Protective Coatings
- **Address:** 12019 Nebel Street, Rockville MD 20852
- **Phone:** (301) 304-1419
- **Email:** CapitalUpfitters@gmail.com
- **Hours:** Mon–Fri 9:30am–4:30pm
- **Dealer Portal:** https://upfit-portal-58190af9.base44.app

---

## Hosting

Static HTML/CSS/JS — deploy to any host:
- **Hostinger:** Upload via File Manager or FTP to `public_html/`
- **Vercel:** Connect this repo for automatic deploys
- **Netlify:** Drag & drop the folder or connect GitHub

---

## Phase 2 (Planned)

- Who We Serve audience pages with case studies
- Why Choose Us trust section
- Resources & Insights (3–4 SEO articles)
- Fleet Equipment Catalog (reference)
- DOT/OSHA Compliance guides
- Client Portal integration (Upfit Portal)
