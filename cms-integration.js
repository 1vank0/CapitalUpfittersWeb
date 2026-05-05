/**
 * Capital Upfitters — CMS Integration Layer (Tina-powered)
 * Reads /cms-data.json (built from content/*.md by Tina) at page load.
 * Drop this on any page: <script src="/cms-integration.js" defer></script>
 *
 * Failure model: every fetch is wrapped so the page always renders the
 * hardcoded HTML below as the fallback. CMS is purely additive.
 */

const CMS_DATA_URL = '/cms-data.json'

let _cachedData = null
async function _loadData() {
  if (_cachedData) return _cachedData
  try {
    const res = await fetch(CMS_DATA_URL, { cache: 'no-cache' })
    _cachedData = await res.json()
  } catch {
    _cachedData = {}
  }
  return _cachedData
}

window.CU_CMS = {

  // ─── Submit lead form via mailto: fallback ──────────────────────────────────
  // Replace this with Formspree, Web3Forms, or a Vercel serverless function
  // when you wire a real backend. For now, opens the user's email client.
  async submitLead(formData) {
    const settings = (await _loadData()).settings || {}
    const to = settings.email || 'CapitalUpfitters@gmail.com'
    const subject = `New ${formData.leadType || 'lead'} from ${formData.source || 'website'}`
    const body = Object.entries(formData)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    return { success: true, refId: 'mailto-' + Date.now() }
  },

  async getTestimonials(featured = true) {
    const data = await _loadData()
    const list = data.testimonials || []
    return featured ? list.filter(t => t.featured) : list
  },

  async getServices(category = null) {
    const data = await _loadData()
    let list = data.services || []
    if (category) list = list.filter(s => s.category === category)
    return list
  },

  async getSettings() {
    return (await _loadData()).settings || null
  },

  async getFAQs() {
    return (await _loadData()).faqs || []
  },

  async getGeoPages() {
    return (await _loadData()).geoPages || []
  },

  async getGallery() {
    return [] // gallery now lives in /assets/, no CMS layer
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
              <div style="font-size:2rem;margin-bottom:1rem;">✉</div>
              <strong>Email opened.</strong><br>
              Send the message and we'll reply within 4 hours.<br>
              <small>Or call us directly.</small>
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

  async syncUrgencyBanner() {
    const settings = await window.CU_CMS.getSettings()
    if (!settings) return
    const banner = document.querySelector(
      '.cu-urgency-banner, #urgencyBanner, [data-urgency-banner], .announce-bar p, .cro-bar-msg'
    )
    if (banner && settings.urgency_message_1) {
      banner.textContent = settings.urgency_message_1
    }
  },

  async syncServicesGrid() {
    const grid = document.querySelector('[data-cms-services-grid]')
    if (!grid) return
    const services = await window.CU_CMS.getServices()
    if (!services || services.length < 4) return // keep hardcoded fallback
    const cards = services.slice(0, 6).map((s, i) => {
      const slug = s.slug || ''
      const title = s.title || ''
      const blurb = s.summary || ''
      const tag = s.category || ''
      const price = s.priceFrom || ''
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

  async syncTestimonials() {
    const grid = document.querySelector('[data-cms-testimonials], .testimonials-grid')
    if (!grid) return
    const items = await window.CU_CMS.getTestimonials(true)
    if (!items || items.length === 0) return
    grid.innerHTML = items.slice(0, 3).map((t) => {
      const quote = t.body || ''
      const name = t.author || ''
      return (
        '<article class="testimonial-card">' +
        '<div class="testimonial-stars" aria-label="5 stars">★★★★★</div>' +
        '<p class="testimonial-quote">"' + quote + '"</p>' +
        '<div class="testimonial-author">' + name + '</div>' +
        '</article>'
      )
    }).join('')
  },

}

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
