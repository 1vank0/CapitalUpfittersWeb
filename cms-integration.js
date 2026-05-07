/**
 * Capital Upfitters — CMS Integration Layer
 * Connects static Phase 1 site to live Payload CMS
 * Drop this script tag on any page: <script src="/cms-integration.js" defer></script>
 */

const CMS_URL = 'https://capital-upfitters-6iq57bc73-ivan-s-projects-fc67197c.vercel.app'

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
    const banner = document.querySelector('.cu-urgency-banner, #urgencyBanner, [data-urgency-banner]')
    if (banner && settings.urgency.message1) {
      banner.textContent = settings.urgency.message1
    }
  },

}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.CU_CMS.wireAllForms()
    window.CU_CMS.syncUrgencyBanner()
  })
} else {
  window.CU_CMS.wireAllForms()
  window.CU_CMS.syncUrgencyBanner()
}
