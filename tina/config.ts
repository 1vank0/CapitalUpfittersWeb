import { defineConfig } from 'tinacms'
import { aiAssistField } from './components/AiAssistField'

// Tina expects a plain branch name (e.g. 'main'). Strip any leading 'refs/heads/' or path segments.
const rawBranch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main'
const branch = rawBranch.trim().replace(/[\r\n]/g, '').replace(/^refs\/heads\//, '').replace(/^.*\//, '') || 'main'

// ────────────────────────────────────────────────────────────────────────────
// Reusable field groups — designed to be readable by non-technical editors.
// Each field has a `description` so the admin shows inline help text.
// ────────────────────────────────────────────────────────────────────────────

const heroFields = [
  {
    type: 'string',
    name: 'badge',
    label: 'Hero Badge',
    description: 'Small label shown above the headline (e.g. "Authorized Patriot Liner Dealer"). Optional.',
  },
  {
    type: 'string',
    name: 'headline',
    label: 'Hero Headline',
    description: 'The big H1 at the top of the page. Keep it punchy — under ~10 words.',
  },
  aiAssistField({
    type: 'string',
    name: 'subheadline',
    label: 'Hero Subheadline',
    ui: { component: 'textarea' },
    description: 'One or two sentences directly under the headline.',
  }, { lines: 3, promptHint: 'e.g. "shorter", "more urgent", "add a benefit"' }),
  {
    type: 'string',
    name: 'primaryCtaLabel',
    label: 'Primary Button Label',
    description: 'Text on the orange button (e.g. "Get a Free Quote").',
  },
  {
    type: 'string',
    name: 'primaryCtaUrl',
    label: 'Primary Button Link',
    description: 'Where the orange button goes. Use /quote.html for the standard quote form.',
  },
  {
    type: 'string',
    name: 'secondaryCtaLabel',
    label: 'Secondary Button Label',
    description: 'Text on the outlined button. Often a phone number — "Call (301) 304-1419".',
  },
  {
    type: 'string',
    name: 'secondaryCtaUrl',
    label: 'Secondary Button Link',
    description: 'For phone, use tel:3013041419. For another page, use a path like /contact.html.',
  },
] as const

// Pricing row used in service-page price tables
const pricingRowFields = [
  { type: 'string', name: 'label', label: 'Tier / Size', description: 'E.g. "Compact (up to 5ft)" or "Standard Package".' },
  { type: 'string', name: 'price', label: 'Price', description: 'Display string — e.g. "$575" or "From $1,200".' },
  { type: 'string', name: 'note', label: 'Note', description: 'Optional small text under the price (e.g. "+ tax", "popular pick").' },
] as const

// KPI / stats tile
const kpiFields = [
  { type: 'string', name: 'value', label: 'Value', description: 'Big number/text shown front-and-center — e.g. "30+", "5.0★".' },
  { type: 'string', name: 'label', label: 'Label', description: 'Description under the value — e.g. "Years Serving DMV".' },
] as const

// Process / "How it works" step
const processStepFields = [
  { type: 'string', name: 'title', label: 'Step Title', description: 'Short heading for the step (e.g. "Inspect").' },
  { type: 'string', name: 'description', label: 'Step Description', ui: { component: 'textarea' }, description: '1–2 sentence explanation of what happens at this step.' },
] as const

// FAQ item nested directly inside a service/page
const faqItemFields = [
  { type: 'string', name: 'question', label: 'Question', description: 'The question as the visitor would ask it.' },
  { type: 'string', name: 'answer', label: 'Answer', ui: { component: 'textarea' }, description: 'A clear, friendly answer in 1–3 sentences.' },
] as const

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: '.',
  },
  media: {
    tina: {
      mediaRoot: 'assets',
      publicFolder: '.',
    },
  },

  schema: {
    collections: [
      // ────────────────────────────────────────────────────────
      // SERVICES
      // ────────────────────────────────────────────────────────
      {
        name: 'service',
        label: 'Services',
        path: 'content/services',
        format: 'md',
        ui: {
          // Show a friendly preview / filename = slug.md
          filename: { readonly: false, slugify: (values: any) => `${(values?.slug || values?.title || 'service').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}` },
        },
        fields: [
          // Top-level basics
          { type: 'string', name: 'title', label: 'Service Name', required: true, isTitle: true, description: 'How the service appears in menus and listings (e.g. "Spray-In Bedliner").' },
          { type: 'string', name: 'slug', label: 'URL Slug', required: true, description: 'Used in the URL: /services/<slug>.html. Lowercase, dashes only.' },
          { type: 'string', name: 'category', label: 'Category', description: 'Group used for filtering — e.g. "bedliners", "protection", "truck-accessories".' },
          aiAssistField({ type: 'string', name: 'summary', label: 'Short Summary', ui: { component: 'textarea' }, description: 'One-sentence description shown in service cards on the homepage and listings.' }, { lines: 2, maxTokens: 200, promptHint: 'e.g. "under 20 words", "more SEO-friendly", "highlight warranty"' }),
          { type: 'string', name: 'icon', label: 'Icon', description: 'Lucide icon name (e.g. "truck", "shield", "sparkles"). See lucide.dev for options.' },
          { type: 'number', name: 'priceFrom', label: 'Starting Price ($)', description: 'Minimum price shown as "From $X". Leave blank for "Custom Quote".' },
          { type: 'number', name: 'sortOrder', label: 'Sort Order', description: 'Lower numbers appear first on listings. 1 = top.' },
          { type: 'boolean', name: 'active', label: 'Visible on Site', description: 'Uncheck to temporarily hide this service from menus and listings.' },

          // Hero block
          {
            type: 'object',
            name: 'hero',
            label: 'Hero Section (Top of Page)',
            description: 'The large banner at the top of this service page.',
            fields: [...heroFields],
          },

          // Pricing rows
          {
            type: 'object',
            name: 'pricing',
            label: 'Pricing Table',
            description: 'Rows shown in the service\'s pricing table. Add as many as you need; leave empty to hide the table.',
            list: true,
            ui: { itemProps: (i: any) => ({ label: i?.label || 'New row' }) },
            fields: [...pricingRowFields],
          },

          // KPIs / Benefits strip
          {
            type: 'object',
            name: 'kpis',
            label: 'Benefits / KPI Strip',
            description: 'Small tiles of stats or selling points displayed in a horizontal strip.',
            list: true,
            ui: { itemProps: (i: any) => ({ label: i?.value ? `${i.value} — ${i.label || ''}` : 'New stat' }) },
            fields: [...kpiFields],
          },

          // Process steps
          {
            type: 'object',
            name: 'process',
            label: 'Process / Steps',
            description: '"How it works" — describe the steps a customer goes through.',
            list: true,
            ui: { itemProps: (i: any) => ({ label: i?.title || 'New step' }) },
            fields: [...processStepFields],
          },

          // FAQ block
          {
            type: 'object',
            name: 'faqs',
            label: 'FAQs (Page-Specific)',
            description: 'Questions specific to this service. The site combines these with global FAQs.',
            list: true,
            ui: { itemProps: (i: any) => ({ label: i?.question || 'New FAQ' }) },
            fields: [...faqItemFields],
          },

          // SEO
          aiAssistField({ type: 'string', name: 'seoTitle', label: 'SEO — Page Title', description: 'Shown in browser tab and Google results. ~60 chars max.' }, { maxTokens: 80, promptHint: 'e.g. "include city + service + brand", "under 60 chars"' }),
          aiAssistField({ type: 'string', name: 'seoDescription', label: 'SEO — Meta Description', ui: { component: 'textarea' }, description: 'Search-engine snippet. ~155 chars max.' }, { lines: 3, maxTokens: 200, promptHint: 'e.g. "add city names", "include phone number", "under 155 chars"' }),

          // Long body
          { type: 'rich-text', name: 'body', label: 'Long Description / Page Body', isBody: true, description: 'The main written content of the page. Supports headings, lists, links, images.' },
        ],
      },

      // ────────────────────────────────────────────────────────
      // GEO / LOCATION PAGES
      // ────────────────────────────────────────────────────────
      {
        name: 'geoPage',
        label: 'Location Pages',
        path: 'content/geo-pages',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Page Title', required: true, isTitle: true, description: 'Headline for the location page.' },
          { type: 'string', name: 'slug', label: 'URL Slug', required: true, description: 'URL path (e.g. "bethesda-md" → /locations/bethesda-md.html).' },
          { type: 'string', name: 'city', label: 'City', description: 'Just the city name (no state).' },
          { type: 'string', name: 'state', label: 'State', description: 'Two-letter abbreviation (e.g. "MD", "VA", "DC").' },

          {
            type: 'object',
            name: 'hero',
            label: 'Hero Section',
            fields: [...heroFields],
          },

          { type: 'string', name: 'directionsTitle', label: 'Directions Heading', description: 'E.g. "15 Minutes Away"' },
          { type: 'string', name: 'directionsBody', label: 'Directions Body', ui: { component: 'textarea' }, description: 'How to get to the shop from this city.' },

          aiAssistField({ type: 'string', name: 'seoTitle', label: 'SEO — Page Title' }, { maxTokens: 80, promptHint: 'e.g. "include city + state + service"' }),
          aiAssistField({ type: 'string', name: 'seoDescription', label: 'SEO — Meta Description', ui: { component: 'textarea' } }, { lines: 3, maxTokens: 200, promptHint: 'e.g. "under 155 chars, include city + phone"' }),

          { type: 'rich-text', name: 'body', label: 'Body', isBody: true, description: 'Main local-page narrative.' },
        ],
      },

      // ────────────────────────────────────────────────────────
      // TESTIMONIALS
      // ────────────────────────────────────────────────────────
      {
        name: 'testimonial',
        label: 'Testimonials',
        path: 'content/testimonials',
        format: 'md',
        fields: [
          { type: 'string', name: 'author', label: 'Author Name', required: true, isTitle: true, description: 'Reviewer\'s display name (e.g. "Mike T.").' },
          { type: 'string', name: 'authorMeta', label: 'Author Detail', description: 'Where they\'re from / source — e.g. "Rockville, MD · Google Review".' },
          { type: 'number', name: 'rating', label: 'Star Rating (1–5)', description: 'Whole number 1–5. Defaults to 5.' },
          { type: 'boolean', name: 'featured', label: 'Featured on Homepage', description: 'Top picks shown on the homepage.' },
          { type: 'string', name: 'serviceSlug', label: 'Related Service Slug', description: 'Optional — link this review to a specific service (e.g. "bedliner") so it appears on that page.' },
          { type: 'rich-text', name: 'body', label: 'Quote', isBody: true, description: 'The review text itself.' },
        ],
      },

      // ────────────────────────────────────────────────────────
      // FAQs (global)
      // ────────────────────────────────────────────────────────
      {
        name: 'faq',
        label: 'FAQs (Global)',
        path: 'content/faqs',
        format: 'md',
        fields: [
          { type: 'string', name: 'question', label: 'Question', required: true, isTitle: true, description: 'The visitor\'s question, written naturally.' },
          { type: 'number', name: 'sortOrder', label: 'Sort Order', description: 'Lower numbers appear first.' },
          { type: 'string', name: 'category', label: 'Category', description: 'Optional grouping — e.g. "bedliner", "general", "fleet".' },
          { type: 'rich-text', name: 'body', label: 'Answer', isBody: true, description: 'The answer in 1–3 sentences.' },
        ],
      },

      // ────────────────────────────────────────────────────────
      // CONTENT BLOCKS (reusable)
      // ────────────────────────────────────────────────────────
      {
        name: 'contentBlock',
        label: 'Reusable Content Blocks',
        path: 'content/content-blocks',
        format: 'md',
        fields: [
          { type: 'string', name: 'slug', label: 'Block ID', required: true, isTitle: true, description: 'Unique identifier — used by the site to find this block. Don\'t change unless you know where it\'s used.' },
          { type: 'string', name: 'title', label: 'Display Title', description: 'Just for editor reference.' },
          { type: 'string', name: 'type', label: 'Type', description: 'announce | hero | cta | stats | etc.' },
          { type: 'rich-text', name: 'body', label: 'Content', isBody: true, description: 'The block\'s editable copy.' },
        ],
      },

      // ────────────────────────────────────────────────────────
      // PAGES
      // ────────────────────────────────────────────────────────
      {
        name: 'page',
        label: 'Pages',
        path: 'content/pages',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Page Title', required: true, isTitle: true },
          { type: 'string', name: 'slug', label: 'URL Slug', required: true },
          {
            type: 'object',
            name: 'hero',
            label: 'Hero Section',
            fields: [...heroFields],
          },
          { type: 'string', name: 'seoTitle', label: 'SEO — Page Title' },
          { type: 'string', name: 'seoDescription', label: 'SEO — Meta Description', ui: { component: 'textarea' } },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },

      // ────────────────────────────────────────────────────────
      // BUSINESS SETTINGS (global)
      // ────────────────────────────────────────────────────────
      {
        name: 'settings',
        label: 'Business Settings',
        path: 'content/globals',
        format: 'json',
        match: { include: 'settings' },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: 'string', name: 'business_name', label: 'Business Name' },
          { type: 'string', name: 'phone', label: 'Phone', description: 'Display format with parens — e.g. "(301) 304-1419".' },
          { type: 'string', name: 'email', label: 'Email' },
          { type: 'string', name: 'address', label: 'Address', ui: { component: 'textarea' }, description: 'Full street address shown in the footer.' },
          { type: 'string', name: 'weekday_hours', label: 'Weekday Hours', description: 'E.g. "Mon–Fri: 9:30am–4:30pm".' },
          { type: 'string', name: 'saturday_hours', label: 'Saturday Hours' },
          { type: 'string', name: 'sunday_hours', label: 'Sunday Hours' },
          { type: 'string', name: 'facebook_url', label: 'Facebook URL' },
          { type: 'string', name: 'instagram_url', label: 'Instagram URL' },
          { type: 'string', name: 'youtube_url', label: 'YouTube URL' },
          { type: 'string', name: 'google_business_url', label: 'Google Business URL' },
          { type: 'string', name: 'default_seo_title', label: 'Default SEO Title' },
          { type: 'string', name: 'default_seo_description', label: 'Default SEO Description', ui: { component: 'textarea' } },
          { type: 'string', name: 'urgency_message_1', label: 'Announcement Bar — Primary', description: 'Shown across the top of the site.' },
          { type: 'string', name: 'urgency_message_2', label: 'Announcement Bar — Secondary' },
        ],
      },
    ],
  },
})
