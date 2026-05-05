import { defineConfig } from 'tinacms'

// Tina expects a plain branch name (e.g. 'main'). Strip any leading 'refs/heads/' or path segments.
const rawBranch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  'main'
const branch = rawBranch.replace(/^refs\/heads\//, '').replace(/^.*\//, '') || 'main'

export default defineConfig({
  branch,

  // Filled in by user from app.tina.io
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
      {
        name: 'service',
        label: 'Services',
        path: 'content/services',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Service Name', required: true, isTitle: true },
          { type: 'string', name: 'slug', label: 'URL Slug', required: true },
          { type: 'string', name: 'category', label: 'Category' },
          { type: 'string', name: 'summary', label: 'Short Summary', ui: { component: 'textarea' } },
          { type: 'string', name: 'icon', label: 'Icon Name (lucide)' },
          { type: 'number', name: 'priceFrom', label: 'Price From ($)' },
          { type: 'number', name: 'sortOrder', label: 'Sort Order' },
          { type: 'boolean', name: 'active', label: 'Active (Visible on Site)' },
          { type: 'string', name: 'seoTitle', label: 'SEO Title' },
          { type: 'string', name: 'seoDescription', label: 'SEO Description', ui: { component: 'textarea' } },
          { type: 'rich-text', name: 'body', label: 'Long Description', isBody: true },
        ],
      },
      {
        name: 'geoPage',
        label: 'Location Pages (Geo SEO)',
        path: 'content/geo-pages',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Page Title', required: true, isTitle: true },
          { type: 'string', name: 'slug', label: 'URL Slug', required: true },
          { type: 'string', name: 'city', label: 'City' },
          { type: 'string', name: 'state', label: 'State' },
          { type: 'string', name: 'seoTitle', label: 'SEO Title' },
          { type: 'string', name: 'seoDescription', label: 'SEO Description', ui: { component: 'textarea' } },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },
      {
        name: 'testimonial',
        label: 'Testimonials',
        path: 'content/testimonials',
        format: 'md',
        fields: [
          { type: 'string', name: 'author', label: 'Author Name', required: true, isTitle: true },
          { type: 'number', name: 'rating', label: 'Rating (1-5)' },
          { type: 'boolean', name: 'featured', label: 'Featured on Homepage' },
          { type: 'rich-text', name: 'body', label: 'Quote', isBody: true },
        ],
      },
      {
        name: 'faq',
        label: 'FAQs',
        path: 'content/faqs',
        format: 'md',
        fields: [
          { type: 'string', name: 'question', label: 'Question', required: true, isTitle: true },
          { type: 'number', name: 'sortOrder', label: 'Sort Order' },
          { type: 'rich-text', name: 'body', label: 'Answer', isBody: true },
        ],
      },
      {
        name: 'contentBlock',
        label: 'Content Blocks (Reusable)',
        path: 'content/content-blocks',
        format: 'md',
        fields: [
          { type: 'string', name: 'slug', label: 'Block Slug', required: true, isTitle: true },
          { type: 'string', name: 'title', label: 'Title' },
          { type: 'string', name: 'type', label: 'Type' },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },
      {
        name: 'page',
        label: 'Pages',
        path: 'content/pages',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Page Title', required: true, isTitle: true },
          { type: 'string', name: 'slug', label: 'URL Slug', required: true },
          { type: 'string', name: 'seoTitle', label: 'SEO Title' },
          { type: 'string', name: 'seoDescription', label: 'SEO Description', ui: { component: 'textarea' } },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },
      {
        name: 'settings',
        label: 'Business Settings',
        path: 'content/globals',
        format: 'json',
        match: { include: 'settings' },
        ui: {
          allowedActions: { create: false, delete: false },
        },
        fields: [
          { type: 'string', name: 'business_name', label: 'Business Name' },
          { type: 'string', name: 'phone', label: 'Phone' },
          { type: 'string', name: 'email', label: 'Email' },
          { type: 'string', name: 'address', label: 'Address', ui: { component: 'textarea' } },
          { type: 'string', name: 'weekday_hours', label: 'Weekday Hours' },
          { type: 'string', name: 'saturday_hours', label: 'Saturday Hours' },
          { type: 'string', name: 'sunday_hours', label: 'Sunday Hours' },
          { type: 'string', name: 'facebook_url', label: 'Facebook URL' },
          { type: 'string', name: 'instagram_url', label: 'Instagram URL' },
          { type: 'string', name: 'youtube_url', label: 'YouTube URL' },
          { type: 'string', name: 'google_business_url', label: 'Google Business URL' },
          { type: 'string', name: 'default_seo_title', label: 'Default SEO Title' },
          { type: 'string', name: 'default_seo_description', label: 'Default SEO Description', ui: { component: 'textarea' } },
          { type: 'string', name: 'urgency_message_1', label: 'Urgency Message 1' },
          { type: 'string', name: 'urgency_message_2', label: 'Urgency Message 2' },
        ],
      },
    ],
  },
})
