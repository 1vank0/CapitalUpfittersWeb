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

// Resolve a dotted path like "hero.subheadline", "settings.phone", or
// "benefits.cards[0].title" (bracket notation) against a context object.
function _get(obj, path) {
  if (!obj || !path) return undefined
  // Normalize bracket notation "cards[0]" -> "cards.0" before splitting on "."
  const norm = path.replace(/\[(\d+)\]/g, '.$1')
  return norm.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

// Apply optional prefix/suffix to a value. Used for things like
// data-cms-bind="priceFrom" data-cms-bind-prefix="Starting from $".
function _formatValue(v, el) {
  if (v == null || v === '') return v
  const prefix = el.getAttribute('data-cms-bind-prefix') || ''
  const suffix = el.getAttribute('data-cms-bind-suffix') || ''
  return `${prefix}${v}${suffix}`
}

// Set a value on an element using whatever data-cms-bind* hooks are present.
function _applyBinding(el, ctx) {
  // textContent binding (preserves child elements like inline SVG icons)
  const txtPath = el.getAttribute('data-cms-bind')
  if (txtPath) {
    const v = _get(ctx, txtPath)
    if (v != null && v !== '') _setTextPreserveChildren(el, _formatValue(v, el))
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
  // Special attr names: 'class' appends (space-separated), 'style-bg-image'
  // sets `background-image: url(value)` on inline style.
  const attrSpec = el.getAttribute('data-cms-bind-attr')
  if (attrSpec) {
    attrSpec.split(',').forEach((pair) => {
      const [attrName, path] = pair.split(':').map((s) => s && s.trim())
      if (!attrName || !path) return
      const v = _get(ctx, path)
      if (v == null || v === '') return
      if (attrName === 'class') {
        el.classList.add(...String(v).split(/\s+/).filter(Boolean))
      } else if (attrName === 'style-bg-image') {
        el.style.backgroundImage = `url(${v})`
        el.classList.add('has-bg-image')
      } else if (attrName === 'class-prefix') {
        // Used like data-cms-bind-attr="class-prefix:hero.textAlign"
        // with data-cms-bind-class-prefix="hero-align-" → adds hero-align-left
        const prefix = el.getAttribute('data-cms-bind-class-prefix') || ''
        el.classList.add(`${prefix}${v}`)
      } else {
        el.setAttribute(attrName, v)
      }
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
    return (await _loadData()).gallery || []
  },

  async getBrands() {
    return (await _loadData()).brands || []
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

  // Render the homepage / services-index card grid from CMS data.
  // The container needs `data-cms-services-grid`; optional attributes:
  //   data-cms-services-limit="6"        → cap how many cards
  //   data-cms-services-link-prefix="./services/"  → prefix for each link
  async syncServicesGrid() {
    const grids = document.querySelectorAll('[data-cms-services-grid]')
    if (!grids.length) return
    const services = await window.CU_CMS.getServices()
    if (!services || services.length < 4) return
    grids.forEach((grid) => {
      const limit = parseInt(grid.getAttribute('data-cms-services-limit') || '0', 10)
      const linkPrefix = grid.getAttribute('data-cms-services-link-prefix') || './services/'
      const list = limit > 0 ? services.slice(0, limit) : services
      const cards = list.map((s, i) => {
        const slug = s.slug || ''
        const title = s.title || ''
        const blurb = s.summary || ''
        const tag = s.category || ''
        const price = s.priceFrom
        const img = s.image || (s.hero && s.hero.backgroundImage) || ''
        const bgStyle = img ? ' style="background-image:url(' + img + ');background-size:cover;background-position:center;"' : ''
        return (
          '<a href="' + linkPrefix + slug + '.html" class="service-card reveal reveal-delay-' + ((i % 4) + 1) + '"' + bgStyle + '>' +
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
    })
  },

  // Render a brand-logo strip from CMS data.
  // Container: <div data-cms-brand-strip [data-cms-brand-keys="key1,key2"]>
  //   - When data-cms-brand-keys is set, only those brands render (in that order).
  //   - Otherwise, all brands render.
  // On a service page, brand keys are auto-pulled from the service's brandKeys field.
  async syncBrandStrip() {
    const strips = document.querySelectorAll('[data-cms-brand-strip]')
    if (!strips.length) return
    const data = await _loadData()
    const allBrands = data.brands || []
    if (!allBrands.length) return
    const byKey = Object.fromEntries(allBrands.map((b) => [b.key, b]))

    // Service page context: pull brandKeys off the current service
    let serviceBrandKeys = []
    const body = document.body
    if (body.getAttribute('data-cms-page') === 'service') {
      const svc = (data.services || []).find((s) => s.slug === body.getAttribute('data-cms-slug'))
      if (svc && Array.isArray(svc.brandKeys)) serviceBrandKeys = svc.brandKeys
    }

    strips.forEach((strip) => {
      const explicit = strip.getAttribute('data-cms-brand-keys')
      let keys = []
      if (explicit && explicit.trim()) {
        keys = explicit.split(',').map((s) => s.trim()).filter(Boolean)
      } else if (serviceBrandKeys.length) {
        keys = serviceBrandKeys
      } else {
        keys = allBrands.map((b) => b.key)
      }
      const brands = keys.map((k) => byKey[k]).filter(Boolean)
      if (!brands.length) return // keep fallback markup

      strip.innerHTML = brands.map((b) => {
        const logo = b.logo
          ? '<img src="' + b.logo + '" alt="' + (b.name || '') + ' logo" loading="lazy">'
          : '<div class="brand-logo-text">' + (b.name || '') + '</div>'
        const tagline = b.tagline ? '<span class="brand-tagline">' + b.tagline + '</span>' : ''
        const inner = '<div class="brand-logo">' + logo + '</div>' +
          '<div class="brand-meta"><strong>' + (b.name || '') + '</strong>' + tagline + '</div>'
        return b.url
          ? '<a class="brand-item" href="' + b.url + '" target="_blank" rel="noopener">' + inner + '</a>'
          : '<div class="brand-item">' + inner + '</div>'
      }).join('')
    })
  },

  // Render the gallery grid from CMS data.
  // Container: <div data-cms-gallery-grid>  — child filter pills with
  // data-cat="all|<category>" continue to work via the existing gallery.html JS.
  async syncGallery() {
    const grids = document.querySelectorAll('[data-cms-gallery-grid]')
    if (!grids.length) return
    const items = await window.CU_CMS.getGallery()
    if (!items || !items.length) return
    grids.forEach((grid) => {
      grid.innerHTML = items.map((item) => {
        const cat = item.category || ''
        const label = item.label || ''
        const sizeClass = item.size ? ' ' + item.size : ' med'
        const img = item.image
        const inner = img
          ? '<img src="' + img + '" alt="' + label + '" loading="lazy" class="gallery-photo">'
          : '<div class="gallery-placeholder' + sizeClass + '"><div class="placeholder-inner">' +
            '<span class="placeholder-tag">' + (cat || 'Project') + '</span></div></div>'
        return (
          '<div class="gallery-item" data-cat="' + cat + '" data-label="' + label + '" role="listitem" tabindex="0">' +
          inner +
          '<div class="gallery-item-overlay"><span class="gallery-item-label">' + label + '</span></div>' +
          '</div>'
        )
      }).join('')
    })
  },

  // Apply hero alignment + background-image. Driven by attributes on the hero element:
  //   <section class="hero" data-cms-hero>
  // Reads pageCtx.hero.textAlign and pageCtx.hero.backgroundImage when present.
  async syncHeroStyling() {
    const heroes = document.querySelectorAll('[data-cms-hero]')
    if (!heroes.length) return
    const data = await _loadData()
    const ctx = _findPageContext(data)
    if (!ctx || !ctx.hero) return
    heroes.forEach((hero) => {
      if (ctx.hero.backgroundImage) {
        hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), url(${ctx.hero.backgroundImage})`
        hero.style.backgroundSize = 'cover'
        hero.style.backgroundPosition = 'center'
        hero.classList.add('has-bg-image')
      }
      if (ctx.hero.textAlign) {
        hero.classList.remove('hero-align-left', 'hero-align-center', 'hero-align-right')
        hero.classList.add(`hero-align-${ctx.hero.textAlign}`)
        hero.style.textAlign = ctx.hero.textAlign
      }
    })
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
  window.CU_CMS.syncBrandStrip()
  window.CU_CMS.syncGallery()
  window.CU_CMS.syncHeroStyling()
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __cuInit)
} else {
  __cuInit()
}
