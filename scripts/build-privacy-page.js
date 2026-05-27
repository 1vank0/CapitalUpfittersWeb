#!/usr/bin/env node
/**
 * Build privacy.html by cloning rebates.html (so it inherits nav, footer,
 * fonts, CSS, JSON-LD scaffolding) and replacing the hero + main body.
 * Idempotent — safe to re-run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'rebates.html');
const DEST = path.join(ROOT, 'privacy.html');

let html = fs.readFileSync(SRC, 'utf8');

// Page title + meta description
html = html
  .replace(/<title>.*?<\/title>/i, '<title>Privacy Policy | Capital Upfitters Rockville MD</title>')
  .replace(/<meta name="description" content=".*?">/i,
    '<meta name="description" content="How Capital Upfitters collects, uses, and protects information from website visitors and quote-request forms.">')
  .replace(/<link rel="canonical" href=".*?">/i,
    '<link rel="canonical" href="https://www.capitalupfitters.com/privacy.html">')
  .replace(/<meta property="og:title" content=".*?">/i,
    '<meta property="og:title" content="Privacy Policy | Capital Upfitters">')
  .replace(/<meta property="og:description" content=".*?">/i,
    '<meta property="og:description" content="How Capital Upfitters collects, uses, and protects information from website visitors and quote-request forms.">')
  .replace(/<meta property="og:url" content=".*?">/i,
    '<meta property="og:url" content="https://www.capitalupfitters.com/privacy.html">');

// Replace hero + every page-content section up to FOOTER comment.
const NAV_END_MARKER = /(<!-- NAV -->[\s\S]*?<\/nav>\s*<\/header>?\s*)/i;
// Find the hero (first <section class="page-hero">) through to the comment <!-- FOOTER -->
const heroToFooterRegex = /<section class="page-hero"[\s\S]*?<!-- FOOTER -->/;
if (!heroToFooterRegex.test(html)) {
  console.error('Could not find hero→footer block in rebates.html');
  process.exit(1);
}

const newBody = `<section class="page-hero" aria-labelledby="hero-heading">
  <div class="page-hero-bg"></div>
  <div class="page-hero-overlay"></div>
  <div class="container page-hero-content">
    <div class="page-eyebrow">Legal</div>
    <h1 id="hero-heading" class="page-hero-title">Privacy Policy</h1>
    <p class="page-hero-sub">How Capital Upfitters collects, uses, and protects the information you share with us — including data captured from quote-request forms and ordinary website browsing.</p>
    <div class="page-hero-meta">Last updated: May 27, 2026</div>
  </div>
</section>

<section class="section">
  <div class="container" style="max-width: 820px;">
    <article class="prose" style="color: var(--color-text); line-height: 1.7;">

      <h2>Overview</h2>
      <p>Capital Upfitters operates capitalupfitters.com to market our vehicle upfitting, coating, and accessory services. This policy explains what we collect, why we collect it, and how to contact us with questions or removal requests.</p>

      <h2>Information You Provide</h2>
      <p>When you submit a quote, callback, or dealer/government inquiry, we collect the contact, vehicle, and service-request details you enter — for example name, email, phone, ZIP code, business name, vehicle year/make/model, VIN, license plate, color, the services you’re interested in, your preferred appointment date, and any message you include. This information is used to respond to your request, prepare an estimate, and follow up about your project.</p>

      <h2>Technical and Attribution Data We Collect Automatically</h2>
      <p>To prevent fraud, secure the site, understand which marketing channels work, and improve your experience, our forms also capture technical data when you submit. Specifically:</p>
      <ul>
        <li><strong>IP address</strong> and approximate geolocation derived from it (city, region, country, and ISP/organization).</li>
        <li><strong>Browser and device information</strong> (user-agent string).</li>
        <li><strong>Referral source</strong> — the website that linked you to us, if any.</li>
        <li><strong>Landing page and form page</strong> URLs.</li>
        <li><strong>Campaign tracking parameters</strong> when present in the URL (UTM source, medium, campaign, term, and content; Google <em>gclid</em>, Microsoft <em>msclkid</em>, and Meta <em>fbclid</em> click identifiers).</li>
        <li>A derived <strong>lead source</strong> label (for example: Google Organic, Google Ads, Bing Organic, DuckDuckGo Organic, Meta Social, Yelp, YouTube, Direct, ChatGPT/AI Referral, or generic referral).</li>
      </ul>
      <p>By submitting one of our forms, you acknowledge that submissions may collect technical data such as IP address, referral source, browser, and approximate location for fraud prevention, analytics, and lead-attribution purposes.</p>

      <h2>Cookies and Local Storage</h2>
      <p>We use first-party browser storage (localStorage) to remember the first page you landed on and the first referrer that brought you to our site, so that our quote follow-up reflects how you originally found us. We do not use third-party advertising cookies on this site.</p>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>To respond to quote, callback, and dealer/government inquiries.</li>
        <li>To prepare accurate estimates and schedule work.</li>
        <li>To send transactional emails and SMS related to your appointment or project status.</li>
        <li>To detect and prevent spam and fraudulent submissions.</li>
        <li>To measure marketing performance in aggregate.</li>
      </ul>

      <h2>Sharing</h2>
      <p>We do not sell or rent your personal information. We share information only with service providers that help us operate (email delivery, hosting, scheduling, IP-geolocation lookup), and only the minimum data needed to do their job. We may also disclose information when required by law.</p>

      <h2>Data Retention</h2>
      <p>Lead submissions are retained as long as needed to service your inquiry and meet our legal and accounting obligations. You may request deletion at any time using the contact details below.</p>

      <h2>Your Choices</h2>
      <ul>
        <li><strong>Access, correction, or deletion:</strong> email us and we will respond within 30 days.</li>
        <li><strong>Do-not-contact:</strong> reply STOP to any SMS or email and we will stop further marketing follow-up.</li>
        <li><strong>Browser controls:</strong> you can clear localStorage in your browser settings at any time to remove the first-landing/first-referrer record we keep.</li>
      </ul>

      <h2>Security</h2>
      <p>Submissions are transmitted over HTTPS and stored on access-controlled systems. No internet service is perfectly secure, but we take reasonable steps to protect the information you send us.</p>

      <h2>Children</h2>
      <p>This site is not intended for individuals under 13. We do not knowingly collect personal information from children.</p>

      <h2>Changes to This Policy</h2>
      <p>We may update this policy from time to time. The “Last updated” date at the top of the page reflects the most recent change.</p>

      <h2>Contact</h2>
      <p>
        <strong>Capital Upfitters</strong><br>
        Rockville, MD<br>
        Phone: <a href="tel:3013041419">(301) 304-1419</a><br>
        Email: <a href="mailto:CapitalUpfitters@gmail.com">CapitalUpfitters@gmail.com</a>
      </p>

    </article>
  </div>
</section>

<!-- FOOTER -->`;

html = html.replace(heroToFooterRegex, newBody);

// Strip JSON-LD that no longer applies (rebates list / breadcrumb to rebates page).
html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');

fs.writeFileSync(DEST, html);
console.log('Wrote', path.relative(ROOT, DEST));
