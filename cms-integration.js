/**
 * Capital Upfitters — CMS Integration Layer (Tina-powered)
 * Reads /cms-data.json (built from content/*.md by Tina) at page load.
 * Drop on any page: <script src="/cms-integration.js" defer></script>
 *
 * ─── Declarative binding ────────────────────────────────────────────────────
 *
 * 1. Page identification:
 *    <body data-cms-page="service" data-cms-slug="bedliner">
 *    Supported page types: service, geo, page, home
 *
 * 2. Single-field bindings — replace text or attribute on an element:
 *    <h1 data-cms-bind="hero.headline">FALLBACK TEXT</h1>
 *    <p  data-cms-bind="hero.subheadline">…</p>
 *    <a  data-cms-bind="hero.primaryCtaLabel" data-cms-bind-href="hero.primaryCtaUrl">…</a>
 *
 *    Supported attribute hooks:
 *      data-cms-bind         → element.textContent
 *      data-cms-bind-href    → element.href
 *      data-cms-bind-html    → element.innerHTML (use sparingly)
 *      data-cms-bind-attr    → set arbitrary attr, syntax "src:image,alt:caption"
 *      data-cms-bind-show    → show/hide based on truthy value (CSS display)
 *
 * 3. Lists — repeat a template item per array entry:
 *    <div data-cms-list="pricing">
 *      <template data-cms-item>
 *        <div class="pricing-card">
 *          <div class="pricing-name"  data-cms-bind="label">…</div>
 *          <div class="pricing-price" data-cms-bind="price">…</div>
 *          <div class="pricing-sub"   data-cms-bind="note">…</div>
 *        </div>
 *      </template>
 *      <!-- existing hardcoded fallback items live here; they're replaced
 *           only when CMS data is present -->
 *    </div>
 *
 * 4. Global bindings — anywhere on any page:
 *    <span data-cms-global="settings.phone">…</span>
 *    <a    data-cms-global="settings.email" data-cms-bind-href="settings.email" data-cms-bind-href-prefix="mailto:">…</a>
 *
 * Failure model: every fetch and DOM lookup is wrapped. Missing data leaves
 * the existing HTML in place. CMS is purely additive.
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

// Resolve a dotted path like "hero.subheadline" or "settings.phone" against a context object
function _get(obj, path) {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

// Set a value on an element using whatever data-cms-bind* hooks are present.
function _applyBinding(el, ctx) {
  // textContent binding (preserves child elements like inline SVG icons)
  const txtPath = el.getAttribute('data-cms-bind')
  if (txtPath) {
    const v = _get(ctx, txtPath)
    if (v != null && v !== '') _setTextPreserveChildren(el, v)
  }
  // href binding (with optional prefix like "tel:" or "mailto:")
  const hrefPath = el.getAttribute('data-cms-bind-href')
  if (hrefPath) {
    const v = _get(ctx, hrefPath)
    const prefix = el.getAttribute('data-cms-bind-href-prefix') || ''
    if (v != null && v !== '') el.setAttribute('href', prefix + v)
  }
  // innerHTML binding (used only when explicitly requested)
  const htmlPath = el.getAttribute('data-cms-bind-html')
  if (htmlPath) {
    const v = _get(ctx, htmlPath)
    if (v != null && v !== '') el.innerHTML = v
  }
  // arbitrary attribute binding: data-cms-bind-attr="src:image,alt:caption"
  const attrSpec = el.getAttribute('data-cms-bind-attr')
  if (attrSpec) {
    attrSpec.split(',').forEach((pair) => {
      const [attrName, path] = pair.split(':').map((s) => s && s.trim())
      if (!attrName || !path) return
      const v = _get(ctx, path)
      if (v != null && v !== '') el.setAttribute(attrName, v)
    })
  }
  // show/hide
  const showPath = el.getAttribute('data-cms-bind-show')
  if (showPath) {
    const v = _get(ctx, showPath)
    if (!v) el.style.display = 'none'
  }
}

// Walk all elements within `root` that have any data-cms-bind* attribute
// and apply the binding using `ctx` as the data source.
function _applyAllBindings(root, ctx) {
  if (!ctx) return
  const sel = '[data-cms-bind],[data-cms-bind-href],[data-cms-bind-html],[data-cms-bind-attr],[data-cms-bind-show]'
  root.querySelectorAll(sel).forEach((el) => _applyBinding(el, ctx))
  // Apply to root itself if it carries a binding
  if (root.matches && root.matches(sel)) _applyBinding(root, ctx)
}

// Render a list: <container data-cms-list="pricing"> with <template data-cms-item>
function _renderLists(root, ctx) {
  if (!ctx) return
  root.querySelectorAll('[data-cms-list]').forEach((container) => {
    const path = container.getAttribute('data-cms-list')
    const items = _get(ctx, path)
    if (!Array.isArray(items) || items.length === 0) return // keep fallback markup
    const template = container.querySelector(':scope > template[data-cms-item]')
    if (!template) return
    // Remove existing non-template children (fallback markup)
    Array.from(container.children).forEach((child) => {
      if (child !== template) container.removeChild(child)
    })
    items.forEach((item, index) => {
      const node = template.content.cloneNode(true)
      // Apply bindings inside the cloned fragment using the item as context
      const wrapper = document.createElement('div')
      wrapper.appendChild(node)
      _applyAllBindings(wrapper, item)
      // Auto-fill .process-num with 1-based index when present and empty
      const num = wrapper.querySelector('.process-num')
      if (num && !num.textContent.trim()) num.textContent = String(index + 1)
      // Append all wrapper children
      while (wrapper.firstChild) container.appendChild(wrapper.firstChild)
    })
  })
}

// Replace only the visible text inside an element while preserving child
// elements (e.g. inline SVG icons in footer contact items). If the element
// has element children, we replace any text nodes that follow them; if there
// are no element children, we just set textContent.
function _setTextPreserveChildren(el, value) {
  if (value == null || value === '') return
  const hasElementChildren = Array.from(el.childNodes).some((n) => n.nodeType === 1)
  if (!hasElementChildren) {
    el.textContent = value
    return
  }
  // Remove existing text nodes, append a single text node at the end.
  Array.from(el.childNodes).forEach((n) => {
    if (n.nodeType === 3) el.removeChild(n)
  })
  el.appendChild(document.createTextNode(value))
}

// Apply global bindings using settings + organization as context
function _applyGlobalBindings(data) {
  const ctx = {
    settings: data.settings || {},
    organization: data.organization || {},
    aiProfile: data.aiProfile || {},
  }
  document.querySelectorAll('[data-cms-global]').forEach((el) => {
    const path = el.getAttribute('data-cms-global')
    const v = _get(ctx, path)
    if (v != null && v !== '') _setTextPreserveChildren(el, v)
    // Also honor any data-cms-bind-href on the same element pointing to the same path
    if (el.hasAttribute('data-cms-bind-href')) _applyBinding(el, ctx)
  })
}

// Find the matching record for the current page based on data-cms-page + data-cms-slug
function _findPageContext(data) {
  const body = document.body
  const pageType = body.getAttribute('data-cms-page')
  const slug = body.getAttribute('data-cms-slug')
  if (!pageType) return null
  if (pageType === 'service') return (data.services || []).find((s) => s.slug === slug)
  if (pageType === 'geo') return (data.geoPages || []).find((g) => g.slug === slug)
  if (pageType === 'page') return (data.pages || []).find((p) => p.slug === slug)
  if (pageType === 'home') return (data.pages || []).find((p) => p.slug === 'home') || null
  return null
}

window.CU_CMS = {

  // ─── Submit lead form via mailto: fallback ────────────────────────────────
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
    return featured ? list.filter((t) => t.featured) : list
  },

  async getServices(category = null) {
    const data = await _loadData()
    let list = data.services || []
    if (category) list = list.filter((s) => s.category === category)
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
    return []
  },

  // ─── Auto-wire all forms on the page ──────────────────────────────────────
  wireAllForms() {
    document.querySelectorAll('form[data-cms-form]').forEach((form) => {
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

  // ─── Apply page-level + global bindings ───────────────────────────────────
  async applyBindings() {
    const data = await _loadData()
    if (!data) return
    const pageCtx = _findPageContext(data)
    if (pageCtx) {
      _applyAllBindings(document.body, pageCtx)
      _renderLists(document.body, pageCtx)
    }
    _applyGlobalBindings(data)

    // Sync SEO meta from frontmatter (only if present and non-empty)
    if (pageCtx && pageCtx.seoTitle) document.title = pageCtx.seoTitle
    if (pageCtx && pageCtx.seoDescription) {
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', pageCtx.seoDescription)
    }
  },

  // Backwards-compat helpers (still used by some pages)
  async syncUrgencyBanner() {
    const settings = await window.CU_CMS.getSettings()
    if (!settings) return
    const banner = document.querySelector(
      '[data-urgency-banner], .announce-bar, .cu-urgency-banner, #urgencyBanner, .cro-bar-msg'
    )
    if (banner && settings.urgency_message_1) {
      // Preserve the close button if present
      const closeBtn = banner.querySelector('.announce-close')
      banner.textContent = settings.urgency_message_1
      if (closeBtn) banner.appendChild(closeBtn)
    }
  },

  async syncServicesGrid() {
    const grid = document.querySelector('[data-cms-services-grid]')
    if (!grid) return
    const services = await window.CU_CMS.getServices()
    if (!services || services.length < 4) return
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
    const grid = document.querySelector('[data-cms-testimonials]')
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
  // applyBindings is the new general engine; the older sync* helpers are kept
  // for pages that opt-in via the older selectors.
  window.CU_CMS.applyBindings()
  window.CU_CMS.syncUrgencyBanner()
  window.CU_CMS.syncServicesGrid()
  window.CU_CMS.syncTestimonials()
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __cuInit)
} else {
  __cuInit()
}
