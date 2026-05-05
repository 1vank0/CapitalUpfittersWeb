/**
 * Capital Upfitters — CMS Integration Layer
 * Connects static Phase 1 site to live Payload CMS / Upfit Portal.
 * Drop this script tag on any page: <script src="/cms-integration.js" defer></script>
 *
 * Failure model: every fetch is wrapped so the page always renders the
 * hardcoded HTML below as the fallback. CMS is purely additive.
 */

const CMS_URL = 'https://capital-upfitters-cms.vercel.app'

window.CU_CMS = {

  // ─── Submit any form to the CMS leads collection ────────────────────────────
  async submitLead(formData) {
    try {
      const res = await fetch(`${CMS_URL}/api/public/submit-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      return await res.json()
    } catch {
      return { error: 'Network error — please call us directly.' }
    }
  },

  // ─── Load featured testimonials ─────────────────────────────────────────────
  async getTestimonials(featured = true) {
    try {
      const res = await fetch(`${CMS_URL}/api/public/testimonials?featured=${featured}`)
      const data = await res.json()
      return data.docs || []
    } catch {
      return []
    }
  },

  // ─── Load services (all or by category) ────────────────────────────────────
  async getServices(category = null) {
    try {
      const url = category
        ? `${CMS_URL}/api/public/services?category=${category}`
        : `${CMS_URL}/api/public/services`
      const res = await fetch(url)
      const data = await res.json()
      return data.docs || []
    } catch {
      return []
    }
  },

  // ─── Load business settings (phone, hours, urgency banner) ──────────────────
  async getSettings() {
    try {
      const res = await fetch(`${CMS_URL}/api/public/settings`)
      return await res.json()
    } catch {
      return null
    }
  },

  // ─── Load gallery images ────────────────────────────────────────────────────
  async getGallery(category = null) {
    try {
      const url = category
        ? `${CMS_URL}/api/public/gallery?category=${category}`
        : `${CMS_URL}/api/public/gallery`
      const res = await fetch(url)
      const data = await res.json()
      return data.docs || []
    } catch {
      return []
    }
  },

  // ─── Auto-wire all forms on the page ────────────────────────────────────────
  wireAllForms() {
    document.querySelectorAll('form[data-cms-form]').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const submitBtn = form.querySelector('[type="submit"]')
        if (submitBtn) {
          submitBtn.disabled = true
          submitBtn.textContent = 'Sending...'
        }

        const formData = Object.fromEntries(new FormData(form))
        formData.leadType = form.dataset.cmsForm || 'retail'
        formData.source = window.location.pathname.replace('/', '') || 'home'

        const result = await window.CU_CMS.submitLead(formData)

        if (result.success) {
          form.innerHTML = `
            <div style="text-align:center;padding:2rem;">
              <div style="font-size:2rem;margin-bottom:1rem;">✓</div>
              <strong>Request received!</strong><br>
              Reference: <code>${result.refId}</code><br>
              <small>We'll contact you within 4 hours.</small>
            </div>
          `
        } else {
          if (submitBtn) {
            submitBtn.disabled = false
            submitBtn.textContent = 'Try Again'
          }
          alert(result.error || 'Something went wrong. Please call us directly.')
        }
      })
    })
  },

  // ─── Sync urgency banner text from CMS settings ─────────────────────────────
  async syncUrgencyBanner() {
    const settings = await window.CU_CMS.getSettings()
    if (!settings?.urgency?.enabled) return
    const banner = document.querySelector(
      '.cu-urgency-banner, #urgencyBanner, [data-urgency-banner], .announce-bar p, .cro-bar-msg'
    )
    if (banner && settings.urgency.message1) {
      banner.textContent = settings.urgency.message1
    }
  },

  // ─── Sync services grid — only replaces if CMS returns 4+ services ────────
  // Targets <div data-cms-services-grid> with hardcoded children as fallback.
  // Children stay in the DOM if CMS is unreachable or returns too few records.
  async syncServicesGrid() {
    const grid = document.querySelector('[data-cms-services-grid]')
    if (!grid) return
    const services = await window.CU_CMS.getServices()
    if (!services || services.length < 4) return // keep hardcoded fallback
    const cards = services.slice(0, 6).map((s, i) => {
      const slug = s.slug || ''
      const title = s.title || s.name || ''
      const blurb = s.shortDescription || s.summary || ''
      const tag = s.tagline || s.badge || ''
      const price = s.startingPrice || s.priceFrom || ''
      return (
        '<a href="./services/' + slug + '.html" class="service-card reveal reveal-delay-' + ((i % 4) + 1) + '">' +
        '<div class="service-card-overlay"></div>' +
        '<div class="service-card-body">' +
        (tag ? '<div class="service-card-tag">' + tag + '</div>' : '') +
        '<div class="service-card-title">' + title + '</div>' +
        '<p class="service-card-desc">' + blurb + '</p>' +
        (price ? '<div class="service-card-price">Starting from <strong>$' + price + '</strong></div>' : '') +
        '</div>' +
        '</a>'
      )
    })
    grid.innerHTML = cards.join('')
  },

  // ─── Sync featured testimonials — only replaces when CMS returns content ──
  async syncTestimonials() {
    const grid = document.querySelector('[data-cms-testimonials], .testimonials-grid')
    if (!grid) return
    const items = await window.CU_CMS.getTestimonials(true)
    if (!items || items.length === 0) return // keep hardcoded fallback
    grid.innerHTML = items.slice(0, 3).map((t) => {
      const quote = t.quote || t.text || t.body || ''
      const name = t.name || t.author || ''
      const role = t.title || t.role || t.subtitle || ''
      return (
        '<article class="testimonial-card">' +
        '<div class="testimonial-stars" aria-label="5 stars">★★★★★</div>' +
        '<p class="testimonial-quote">“' + quote + '”</p>' +
        '<div class="testimonial-author">' + name + (role ? ' — ' + role : '') + '</div>' +
        '</article>'
      )
    }).join('')
  },

}

// Auto-initialize when DOM is ready
function __cuInit() {
  window.CU_CMS.wireAllForms()
  window.CU_CMS.syncUrgencyBanner()
  window.CU_CMS.syncServicesGrid()
  window.CU_CMS.syncTestimonials()
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __cuInit)
} else {
  __cuInit()
}
