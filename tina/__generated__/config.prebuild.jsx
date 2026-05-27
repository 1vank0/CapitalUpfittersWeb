// tina/config.ts
import { defineConfig } from "tinacms";

// tina/components/AiAssistField.tsx
import * as React from "react";
import { wrapFieldsWithMeta } from "tinacms";
var PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Claude" },
  { value: "ollama", label: "Ollama" }
];
var AiAssistField = wrapFieldsWithMeta(({ input, field }) => {
  const isTextarea = field?.ui?.component === "textarea" || field?.aiAssist?.lines > 1;
  const [provider, setProvider] = React.useState("openai");
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const placeholder = field?.aiAssist?.promptHint || 'What should the AI write? e.g. "rewrite for SEO" or "shorter, friendlier tone"';
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const existing = (input.value || "").toString().trim();
      const composedPrompt = existing ? `Existing copy:
"""
${existing}
"""

Instruction: ${prompt}` : prompt;
      const resp = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          prompt: composedPrompt,
          system: field?.aiAssist?.system,
          maxTokens: field?.aiAssist?.maxTokens || 500
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `Server returned ${resp.status}`);
      input.onChange(data.text);
    } catch (e) {
      setError(e.message || "Generation failed.");
    } finally {
      setLoading(false);
    }
  };
  const inputProps = {
    ...input,
    placeholder: field?.placeholder || "",
    style: {
      width: "100%",
      padding: "8px 10px",
      borderRadius: 6,
      border: "1px solid #d1d5db",
      fontSize: 14,
      background: "#fff"
    }
  };
  return React.createElement("div", null, isTextarea ? React.createElement("textarea", { ...inputProps, rows: field?.aiAssist?.lines || 4 }) : React.createElement("input", { type: "text", ...inputProps }), React.createElement("details", { style: { marginTop: 8, fontSize: 13 } }, React.createElement("summary", { style: { cursor: "pointer", color: "#4f46e5", userSelect: "none" } }, "\u2728 Generate with AI"), React.createElement("div", { style: { marginTop: 8, padding: 10, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" } }, React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" } }, PROVIDERS.map((p) => React.createElement("label", { key: p.value, style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 } }, React.createElement(
    "input",
    {
      type: "radio",
      name: `prov-${field.name}`,
      checked: provider === p.value,
      onChange: () => setProvider(p.value)
    }
  ), p.label))), React.createElement(
    "textarea",
    {
      value: prompt,
      onChange: (e) => setPrompt(e.target.value),
      placeholder,
      rows: 2,
      style: { width: "100%", padding: 6, fontSize: 13, borderRadius: 4, border: "1px solid #d1d5db" }
    }
  ), React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 6, alignItems: "center" } }, React.createElement(
    "button",
    {
      type: "button",
      onClick: handleGenerate,
      disabled: loading || !prompt.trim(),
      style: {
        padding: "6px 12px",
        borderRadius: 4,
        border: "none",
        background: loading ? "#9ca3af" : "#4f46e5",
        color: "#fff",
        fontSize: 13,
        cursor: loading ? "wait" : "pointer"
      }
    },
    loading ? "Generating\u2026" : "Generate"
  ), input.value ? React.createElement("span", { style: { color: "#6b7280", fontSize: 12 } }, "Will rewrite the existing text using your instruction.") : React.createElement("span", { style: { color: "#6b7280", fontSize: 12 } }, "Will write fresh copy from your instruction.")), error && React.createElement("div", { style: { marginTop: 8, color: "#b91c1c", fontSize: 12 } }, error))));
});
var aiAssistField = (base, opts = {}) => ({
  ...base,
  ui: {
    ...base.ui || {},
    component: AiAssistField
  },
  aiAssist: { ...opts }
});

// tina/components/RepetitionCheckField.tsx
import * as React2 from "react";
import { wrapFieldsWithMeta as wrapFieldsWithMeta2 } from "tinacms";
var SERVICE_FIELDS = [
  { path: "summary", label: "Short Summary" },
  { path: "hero.badge", label: "Hero \u2192 Badge" },
  { path: "hero.subheadline", label: "Hero \u2192 Subheadline" }
];
function tokens(s) {
  return (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/).filter(Boolean);
}
function bigrams(s) {
  const t = tokens(s);
  if (t.length < 2) return new Set(t);
  const out = /* @__PURE__ */ new Set();
  for (let i = 0; i < t.length - 1; i++) out.add(`${t[i]} ${t[i + 1]}`);
  return out;
}
function jaccard(a, b) {
  const A = bigrams(a), B = bigrams(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  A.forEach((x) => {
    if (B.has(x)) inter++;
  });
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}
function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => o == null ? o : o[k], obj);
}
var SIM_THRESHOLD = 0.35;
var RepetitionCheckField = wrapFieldsWithMeta2(({ form }) => {
  const [tick, setTick] = React2.useState(0);
  const [provider, setProvider] = React2.useState("openai");
  const [loading, setLoading] = React2.useState(false);
  const [error, setError] = React2.useState(null);
  const [suggestions, setSuggestions] = React2.useState(null);
  React2.useEffect(() => {
    if (!form?.subscribe) return;
    const unsub = form.subscribe(
      () => setTick((n) => n + 1),
      { values: true }
    );
    return () => {
      try {
        unsub && unsub();
      } catch {
      }
    };
  }, [form]);
  const values = form?.getState ? form.getState().values : {};
  const pairs = [];
  for (let i = 0; i < SERVICE_FIELDS.length; i++) {
    for (let j = i + 1; j < SERVICE_FIELDS.length; j++) {
      const a = SERVICE_FIELDS[i];
      const b = SERVICE_FIELDS[j];
      const va = (getByPath(values, a.path) || "").toString();
      const vb = (getByPath(values, b.path) || "").toString();
      if (!va.trim() || !vb.trim()) continue;
      pairs.push({ a, b, score: jaccard(va, vb) });
    }
  }
  const repetitive = pairs.filter((p) => p.score >= SIM_THRESHOLD);
  const faqs = Array.isArray(values?.faqs) ? values.faqs : [];
  const faqDupes = [];
  for (let i = 0; i < faqs.length; i++) {
    for (let j = i + 1; j < faqs.length; j++) {
      const ai = (faqs[i]?.answer || "").toString();
      const aj = (faqs[j]?.answer || "").toString();
      if (!ai.trim() || !aj.trim()) continue;
      const s = jaccard(ai, aj);
      if (s >= SIM_THRESHOLD) faqDupes.push({ i, j, score: s });
    }
  }
  const hasIssues = repetitive.length > 0 || faqDupes.length > 0;
  const askAi = async () => {
    setLoading(true);
    setError(null);
    setSuggestions(null);
    try {
      const snapshot = {};
      SERVICE_FIELDS.forEach((f) => {
        snapshot[f.path] = (getByPath(values, f.path) || "").toString();
      });
      const system = "You rewrite website copy so multiple short fields about the same product feel distinct in tone, length, and emphasis \u2014 without changing meaning or losing key facts. Reply with strict JSON only \u2014 no prose, no markdown.";
      const prompt = `These three fields all describe the SAME service and currently feel too similar to each other:

` + Object.entries(snapshot).map(([k, v]) => `- ${k}: "${v}"`).join("\n") + `

Rewrite each so:
\u2022 "hero.badge" is 2\u20135 words, a punchy authority/credential tag.
\u2022 "hero.subheadline" is 1 sentence (~12\u201322 words) leading with the customer benefit.
\u2022 "summary" is 1 sentence (~15\u201325 words) framed for cards/listings, plain and scannable.
Each must use different opening words and emphasize a different angle (e.g. one credential-led, one benefit-led, one outcome/use-case-led). Keep the same product facts.

Return JSON exactly in this shape (no extra keys, no commentary):
{"summary": "...", "hero.badge": "...", "hero.subheadline": "..."}`;
      const resp = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, prompt, system, maxTokens: 500 })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || `Server returned ${resp.status}`);
      const raw = (data.text || "").toString().trim();
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI did not return JSON. Got: " + raw.slice(0, 120));
      const parsed = JSON.parse(m[0]);
      setSuggestions(parsed);
    } catch (e) {
      setError(e.message || "AI request failed.");
    } finally {
      setLoading(false);
    }
  };
  const apply = (path) => {
    if (!suggestions || suggestions[path] == null || !form?.change) return;
    form.change(path, suggestions[path]);
  };
  const applyAll = () => {
    if (!suggestions || !form?.change) return;
    Object.entries(suggestions).forEach(([k, v]) => {
      if (typeof v === "string") form.change(k, v);
    });
  };
  const wrap = {
    border: "1px solid " + (hasIssues ? "#fbbf24" : "#d1fae5"),
    background: hasIssues ? "#fffbeb" : "#f0fdf4",
    borderRadius: 8,
    padding: 12,
    fontSize: 13
  };
  const chip = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#fff",
    border: "1px solid #e5e7eb",
    marginRight: 6,
    fontSize: 12,
    color: "#374151"
  };
  const btn = (color, disabled) => ({
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    background: disabled ? "#9ca3af" : color,
    color: "#fff",
    fontSize: 13,
    cursor: disabled ? "wait" : "pointer"
  });
  return React2.createElement("div", { style: wrap, key: tick }, React2.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } }, React2.createElement("span", { style: { fontSize: 16 } }, hasIssues ? "\u26A0\uFE0F" : "\u2705"), React2.createElement("strong", null, hasIssues ? "Some fields look repetitive" : "Copy variety looks good")), !hasIssues && React2.createElement("div", { style: { color: "#065f46" } }, "Summary, badge, and subheadline read distinctly. No action needed."), repetitive.length > 0 && React2.createElement("div", { style: { marginBottom: 8 } }, React2.createElement("div", { style: { marginBottom: 4 } }, "These pairs share too many words / phrasing:"), React2.createElement("ul", { style: { margin: "4px 0 0 16px", padding: 0 } }, repetitive.map((p, idx) => React2.createElement("li", { key: idx, style: { marginBottom: 2 } }, React2.createElement("span", { style: chip }, p.a.label), "\u2194", React2.createElement("span", { style: { ...chip, marginLeft: 6 } }, p.b.label), React2.createElement("span", { style: { color: "#92400e", marginLeft: 6 } }, (p.score * 100).toFixed(0), "% overlap"))))), faqDupes.length > 0 && React2.createElement("div", { style: { marginBottom: 8, color: "#92400e" } }, faqDupes.length, " FAQ answer pair", faqDupes.length > 1 ? "s" : "", " repeat each other \u2014 consider tightening or merging."), hasIssues && React2.createElement("div", { style: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #fcd34d" } }, React2.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" } }, React2.createElement("span", { style: { color: "#374151" } }, "AI provider:"), ["openai", "anthropic", "ollama"].map((p) => React2.createElement("label", { key: p, style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 } }, React2.createElement("input", { type: "radio", name: "rep-prov", checked: provider === p, onChange: () => setProvider(p) }), p === "openai" ? "OpenAI" : p === "anthropic" ? "Claude" : "Ollama")), React2.createElement("button", { type: "button", onClick: askAi, disabled: loading, style: btn("#b45309", loading) }, loading ? "Thinking\u2026" : "\u2728 Suggest varied rewrites")), error && React2.createElement("div", { style: { color: "#b91c1c", marginBottom: 8, fontSize: 12 } }, error), suggestions && React2.createElement("div", { style: { background: "#fff", border: "1px solid #fde68a", borderRadius: 6, padding: 10 } }, React2.createElement("div", { style: { fontWeight: 600, marginBottom: 8 } }, "Suggested rewrites"), SERVICE_FIELDS.map((f) => {
    const cur = (getByPath(values, f.path) || "").toString();
    const sug = suggestions[f.path];
    if (!sug || sug === cur) return null;
    return React2.createElement("div", { key: f.path, style: { marginBottom: 10, paddingBottom: 8, borderBottom: "1px dotted #fde68a" } }, React2.createElement("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 2 } }, f.label), React2.createElement("div", { style: { fontSize: 12, color: "#9ca3af", textDecoration: "line-through", marginBottom: 4 } }, cur || "(empty)"), React2.createElement("div", { style: { fontSize: 13, color: "#111827", marginBottom: 6 } }, sug), React2.createElement("button", { type: "button", onClick: () => apply(f.path), style: btn("#059669", false) }, "Apply to ", f.label));
  }), React2.createElement("div", { style: { marginTop: 8 } }, React2.createElement("button", { type: "button", onClick: applyAll, style: btn("#4f46e5", false) }, "Apply all"), React2.createElement("span", { style: { marginLeft: 8, color: "#6b7280", fontSize: 12 } }, "Then click ", React2.createElement("strong", null, "Save"), " at the top-right to publish.")))));
});

// tina/config.ts
var rawBranch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";
var branch = rawBranch.trim().replace(/[\r\n]/g, "").replace(/^refs\/heads\//, "").replace(/^.*\//, "") || "main";
var heroFields = [
  {
    type: "string",
    name: "badge",
    label: "Hero Badge",
    description: 'Small label shown above the headline (e.g. "Authorized Patriot Liner Dealer"). Optional.'
  },
  {
    type: "image",
    name: "backgroundImage",
    label: "Hero Background Image",
    description: "Optional background photo behind the hero. Shown with a dark overlay for legibility."
  },
  {
    type: "string",
    name: "textAlign",
    label: "Hero Text Alignment",
    description: "How the hero text lines up \u2014 left, center, or right.",
    options: [
      { value: "left", label: "Left" },
      { value: "center", label: "Center" },
      { value: "right", label: "Right" }
    ]
  },
  {
    type: "string",
    name: "headline",
    label: "Hero Headline",
    description: "The big H1 at the top of the page. Keep it punchy \u2014 under ~10 words."
  },
  aiAssistField({
    type: "string",
    name: "subheadline",
    label: "Hero Subheadline",
    ui: { component: "textarea" },
    description: "One or two sentences directly under the headline."
  }, { lines: 3, promptHint: 'e.g. "shorter", "more urgent", "add a benefit"' }),
  {
    type: "string",
    name: "primaryCtaLabel",
    label: "Primary Button Label",
    description: 'Text on the orange button (e.g. "Get a Free Quote").'
  },
  {
    type: "string",
    name: "primaryCtaUrl",
    label: "Primary Button Link",
    description: "Where the orange button goes. Use /quote.html for the standard quote form."
  },
  {
    type: "string",
    name: "secondaryCtaLabel",
    label: "Secondary Button Label",
    description: 'Text on the outlined button. Often a phone number \u2014 "Call (301) 304-1419".'
  },
  {
    type: "string",
    name: "secondaryCtaUrl",
    label: "Secondary Button Link",
    description: "For phone, use tel:3013041419. For another page, use a path like /contact.html."
  }
];
var pricingRowFields = [
  { type: "string", name: "label", label: "Tier / Size", description: 'E.g. "Compact (up to 5ft)" or "Standard Package".' },
  { type: "string", name: "price", label: "Price", description: 'Display string \u2014 e.g. "$575" or "From $1,200".' },
  { type: "string", name: "note", label: "Note", description: 'Optional small text under the price (e.g. "+ tax", "popular pick").' }
];
var kpiFields = [
  { type: "string", name: "value", label: "Value", description: 'Big number/text shown front-and-center \u2014 e.g. "30+", "5.0\u2605".' },
  { type: "string", name: "label", label: "Label", description: 'Description under the value \u2014 e.g. "Years Serving DMV".' }
];
var processStepFields = [
  { type: "string", name: "title", label: "Step Title", description: 'Short heading for the step (e.g. "Inspect").' },
  { type: "string", name: "description", label: "Step Description", ui: { component: "textarea" }, description: "1\u20132 sentence explanation of what happens at this step." }
];
var faqItemFields = [
  { type: "string", name: "question", label: "Question", description: "The question as the visitor would ask it." },
  { type: "string", name: "answer", label: "Answer", ui: { component: "textarea" }, description: "A clear, friendly answer in 1\u20133 sentences." }
];
var benefitCardFields = [
  { type: "string", name: "icon", label: "Icon", description: 'Lucide icon name (e.g. "shield", "clock", "award"). Optional.' },
  { type: "string", name: "title", label: "Card Title", description: 'Short, punchy headline (e.g. "150+ Brands in Stock").' },
  { type: "string", name: "description", label: "Card Description", ui: { component: "textarea" }, description: "1\u20132 sentences explaining the benefit." }
];
var featureCardFields = [
  { type: "string", name: "icon", label: "Icon", description: "Lucide icon name. Optional." },
  { type: "string", name: "title", label: "Card Title", description: 'E.g. "5th Wheel Prep & Install".' },
  { type: "string", name: "subtitle", label: "Card Subtitle", description: 'Short context line below the title (e.g. "For full-size pickup trucks").' },
  { type: "string", name: "description", label: "Card Description", ui: { component: "textarea" }, description: "2\u20133 sentence explanation." }
];
var config_default = defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",
  build: {
    outputFolder: "admin",
    publicFolder: "."
  },
  media: {
    tina: {
      mediaRoot: "assets",
      publicFolder: "."
    }
  },
  schema: {
    collections: [
      // ────────────────────────────────────────────────────────
      // BRAND LIBRARY (global)
      // Each brand has a key, name, logo image, and link.
      // Service pages reference brands by key via `brandKeys`.
      // ────────────────────────────────────────────────────────
      {
        name: "brand",
        label: "Brand Library",
        path: "content/brands",
        format: "json",
        ui: {
          filename: { readonly: false, slugify: (values) => `${(values?.key || values?.name || "brand").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}` }
        },
        fields: [
          { type: "string", name: "key", label: "Brand Key", required: true, isTitle: true, description: "Short ID (lowercase, dashes only). Used to link this brand from a service." },
          { type: "string", name: "name", label: "Brand Name", required: true, description: 'Display name shown under the logo (e.g. "Patriot Liner").' },
          { type: "string", name: "tagline", label: "Tagline", description: 'Short subtitle shown next to/under the logo (e.g. "Authorized Dealer"). Optional.' },
          { type: "image", name: "logo", label: "Logo Image", description: "Brand logo. PNG/SVG with transparent background works best." },
          { type: "string", name: "url", label: "Brand Website", description: "Optional link out to the brand\u2019s site." },
          { type: "number", name: "sortOrder", label: "Sort Order", description: "Lower numbers appear first." }
        ]
      },
      // ────────────────────────────────────────────────────────
      // GALLERY (project photos / portfolio)
      // Each item has an image, caption, category, tags.
      // ────────────────────────────────────────────────────────
      {
        name: "galleryItem",
        label: "Gallery",
        path: "content/gallery",
        format: "json",
        ui: {
          filename: { readonly: false, slugify: (values) => `${(values?.label || values?.caption || "photo").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)}-${Date.now().toString(36).slice(-4)}` }
        },
        fields: [
          { type: "string", name: "label", label: "Short Label", required: true, isTitle: true, description: 'Caption shown on hover (e.g. "Spray-On Bedliner \u2014 Ram 1500").' },
          { type: "string", name: "category", label: "Category", description: 'Filter group (e.g. "bedliner", "ceramic", "hitch", "window-tint"). Used by the gallery filter pills.' },
          { type: "image", name: "image", label: "Photo", description: "The gallery photo. Landscape works best." },
          { type: "string", name: "tags", label: "Tags", list: true, description: "Optional tags for searching/grouping." },
          { type: "string", name: "size", label: "Tile Size", description: "Visual height in the grid.", options: [{ value: "short", label: "Short" }, { value: "med", label: "Medium" }, { value: "tall", label: "Tall" }] },
          { type: "number", name: "sortOrder", label: "Sort Order", description: "Lower numbers appear first." },
          { type: "boolean", name: "active", label: "Visible on Site", description: "Uncheck to temporarily hide." }
        ]
      },
      // ────────────────────────────────────────────────────────
      // SERVICES
      // ────────────────────────────────────────────────────────
      {
        name: "service",
        label: "Services",
        path: "content/services",
        format: "md",
        ui: {
          // Show a friendly preview / filename = slug.md
          filename: { readonly: false, slugify: (values) => `${(values?.slug || values?.title || "service").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}` }
        },
        fields: [
          // Top-level basics
          { type: "string", name: "title", label: "Service Name", required: true, isTitle: true, description: 'How the service appears in menus and listings (e.g. "Spray-In Bedliner").' },
          { type: "string", name: "slug", label: "URL Slug", required: true, description: "Used in the URL: /services/<slug>.html. Lowercase, dashes only." },
          { type: "string", name: "category", label: "Category", description: 'Group used for filtering \u2014 e.g. "bedliners", "protection", "truck-accessories".' },
          { type: "string", name: "brandKeys", label: "Brands Used", list: true, description: 'Brand keys (from the Brand Library) shown as a logo strip on this service page. E.g. ["patriot-liner","line-x"].' },
          { type: "image", name: "image", label: "Card / Hero Image", description: "Optional photo used in service cards and as the hero background." },
          aiAssistField({ type: "string", name: "summary", label: "Short Summary", ui: { component: "textarea" }, description: "One-sentence description shown in service cards on the homepage and listings." }, { lines: 2, maxTokens: 200, promptHint: 'e.g. "under 20 words", "more SEO-friendly", "highlight warranty"' }),
          {
            type: "string",
            name: "_repetitionCheck",
            label: "Copy Variety Check",
            description: "Automatically warns if Summary, Hero Badge, and Hero Subheadline say the same thing \u2014 and rewrites them with AI.",
            ui: {
              component: RepetitionCheckField,
              // Never persist this virtual field to the markdown file.
              parse: () => void 0,
              format: () => void 0
            }
          },
          { type: "string", name: "icon", label: "Icon", description: 'Lucide icon name (e.g. "truck", "shield", "sparkles"). See lucide.dev for options.' },
          { type: "number", name: "priceFrom", label: "Starting Price ($)", description: 'Minimum price shown as "From $X". Leave blank for "Custom Quote".' },
          { type: "number", name: "sortOrder", label: "Sort Order", description: "Lower numbers appear first on listings. 1 = top." },
          { type: "boolean", name: "active", label: "Visible on Site", description: "Uncheck to temporarily hide this service from menus and listings." },
          // Hero block
          {
            type: "object",
            name: "hero",
            label: "Hero Section (Top of Page)",
            description: "The large banner at the top of this service page.",
            fields: [...heroFields]
          },
          // Pricing rows
          {
            type: "object",
            name: "pricing",
            label: "Pricing Table",
            description: "Rows shown in the service's pricing table. Add as many as you need; leave empty to hide the table.",
            list: true,
            ui: { itemProps: (i) => ({ label: i?.label || "New row" }) },
            fields: [...pricingRowFields]
          },
          // KPIs / Benefits strip
          {
            type: "object",
            name: "kpis",
            label: "Benefits / KPI Strip",
            description: "Small tiles of stats or selling points displayed in a horizontal strip.",
            list: true,
            ui: { itemProps: (i) => ({ label: i?.value ? `${i.value} \u2014 ${i.label || ""}` : "New stat" }) },
            fields: [...kpiFields]
          },
          // Process steps
          {
            type: "object",
            name: "process",
            label: "Process / Steps",
            description: '"How it works" \u2014 describe the steps a customer goes through.',
            list: true,
            ui: { itemProps: (i) => ({ label: i?.title || "New step" }) },
            fields: [...processStepFields]
          },
          // FAQ block
          {
            type: "object",
            name: "faqs",
            label: "FAQs (Page-Specific)",
            description: "Questions specific to this service. The site combines these with global FAQs.",
            list: true,
            ui: { itemProps: (i) => ({ label: i?.question || "New FAQ" }) },
            fields: [...faqItemFields]
          },
          // Benefits / value-prop card grid (typically 3 cards under an H2)
          {
            type: "object",
            name: "benefits",
            label: "Benefits Section (3-Up Cards)",
            description: "The first card grid below the hero \u2014 e.g. \u201CThe Right Hitch, Installed Right.\u201D Leave fields blank to keep current page text.",
            fields: [
              { type: "string", name: "heading", label: "Section Heading", description: "The H2 above the cards (e.g. \u201CTHE RIGHT HITCH, INSTALLED RIGHT.\u201D)." },
              { type: "string", name: "intro", label: "Section Intro", ui: { component: "textarea" }, description: "Short paragraph below the heading." },
              {
                type: "object",
                name: "cards",
                label: "Benefit Cards",
                list: true,
                ui: { itemProps: (i) => ({ label: i?.title || "New benefit" }) },
                fields: [...benefitCardFields]
              }
            ]
          },
          // Larger feature/expansion section (e.g. “Beyond the Standard Hitch”, “Choose Your Film”)
          {
            type: "object",
            name: "featureSection",
            label: "Feature / Expansion Section",
            description: "A second card grid further down the page \u2014 e.g. \u201CBEYOND THE STANDARD HITCH.\u201D Leave blank to keep current page text.",
            fields: [
              { type: "string", name: "heading", label: "Section Heading" },
              { type: "string", name: "intro", label: "Section Intro", ui: { component: "textarea" } },
              {
                type: "object",
                name: "cards",
                label: "Feature Cards",
                list: true,
                ui: { itemProps: (i) => ({ label: i?.title || "New feature" }) },
                fields: [...featureCardFields]
              }
            ]
          },
          // Local-SEO / geo callout block (the “servicing the DMV” strip)
          {
            type: "object",
            name: "geoCallout",
            label: "Geo / Service Area Callout",
            description: "The local-SEO band that lists cities served \u2014 e.g. \u201CHITCH INSTALLATION ACROSS THE DMV.\u201D",
            fields: [
              { type: "string", name: "heading", label: "Section Heading" },
              { type: "string", name: "body", label: "Body Paragraph", ui: { component: "textarea" }, description: "The descriptive paragraph under the heading." }
            ]
          },
          // Final about / closing paragraph
          { type: "string", name: "aboutBody", label: "About / Closing Paragraph", ui: { component: "textarea" }, description: "A wrap-up paragraph near the bottom of the page (often near the footer CTA)." },
          // Override section H2s without re-tagging cards
          {
            type: "object",
            name: "sectionTitles",
            label: "Section Headings (Optional Overrides)",
            description: "Quick-edit the H2 text for the standard sections. Leave blank to keep the current heading on the page.",
            fields: [
              { type: "string", name: "pricing", label: "Pricing Section Heading" },
              { type: "string", name: "process", label: "Process Section Heading" },
              { type: "string", name: "testimonials", label: "Testimonials Heading" },
              { type: "string", name: "faqs", label: "FAQs Heading" }
            ]
          },
          // SEO
          aiAssistField({ type: "string", name: "seoTitle", label: "SEO \u2014 Page Title", description: "Shown in browser tab and Google results. ~60 chars max." }, { maxTokens: 80, promptHint: 'e.g. "include city + service + brand", "under 60 chars"' }),
          aiAssistField({ type: "string", name: "seoDescription", label: "SEO \u2014 Meta Description", ui: { component: "textarea" }, description: "Search-engine snippet. ~155 chars max." }, { lines: 3, maxTokens: 200, promptHint: 'e.g. "add city names", "include phone number", "under 155 chars"' }),
          // Long body
          { type: "rich-text", name: "body", label: "Long Description / Page Body", isBody: true, description: "The main written content of the page. Supports headings, lists, links, images." }
        ]
      },
      // ────────────────────────────────────────────────────────
      // GEO / LOCATION PAGES
      // ────────────────────────────────────────────────────────
      {
        name: "geoPage",
        label: "Location Pages",
        path: "content/geo-pages",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Page Title", required: true, isTitle: true, description: "Headline for the location page." },
          { type: "string", name: "slug", label: "URL Slug", required: true, description: 'URL path (e.g. "bethesda-md" \u2192 /locations/bethesda-md.html).' },
          { type: "string", name: "city", label: "City", description: "Just the city name (no state)." },
          { type: "string", name: "state", label: "State", description: 'Two-letter abbreviation (e.g. "MD", "VA", "DC").' },
          {
            type: "object",
            name: "hero",
            label: "Hero Section",
            fields: [...heroFields]
          },
          { type: "string", name: "directionsTitle", label: "Directions Heading", description: 'E.g. "15 Minutes Away"' },
          { type: "string", name: "directionsBody", label: "Directions Body", ui: { component: "textarea" }, description: "How to get to the shop from this city." },
          aiAssistField({ type: "string", name: "seoTitle", label: "SEO \u2014 Page Title" }, { maxTokens: 80, promptHint: 'e.g. "include city + state + service"' }),
          aiAssistField({ type: "string", name: "seoDescription", label: "SEO \u2014 Meta Description", ui: { component: "textarea" } }, { lines: 3, maxTokens: 200, promptHint: 'e.g. "under 155 chars, include city + phone"' }),
          { type: "rich-text", name: "body", label: "Body", isBody: true, description: "Main local-page narrative." }
        ]
      },
      // ────────────────────────────────────────────────────────
      // TESTIMONIALS
      // ────────────────────────────────────────────────────────
      {
        name: "testimonial",
        label: "Testimonials",
        path: "content/testimonials",
        format: "md",
        fields: [
          { type: "string", name: "author", label: "Author Name", required: true, isTitle: true, description: `Reviewer's display name (e.g. "Mike T.").` },
          { type: "string", name: "authorMeta", label: "Author Detail", description: `Where they're from / source \u2014 e.g. "Rockville, MD \xB7 Google Review".` },
          { type: "number", name: "rating", label: "Star Rating (1\u20135)", description: "Whole number 1\u20135. Defaults to 5." },
          { type: "boolean", name: "featured", label: "Featured on Homepage", description: "Top picks shown on the homepage." },
          { type: "string", name: "serviceSlug", label: "Related Service Slug", description: 'Optional \u2014 link this review to a specific service (e.g. "bedliner") so it appears on that page.' },
          { type: "rich-text", name: "body", label: "Quote", isBody: true, description: "The review text itself." }
        ]
      },
      // ────────────────────────────────────────────────────────
      // FAQs (global)
      // ────────────────────────────────────────────────────────
      {
        name: "faq",
        label: "FAQs (Global)",
        path: "content/faqs",
        format: "md",
        fields: [
          { type: "string", name: "question", label: "Question", required: true, isTitle: true, description: "The visitor's question, written naturally." },
          { type: "number", name: "sortOrder", label: "Sort Order", description: "Lower numbers appear first." },
          { type: "string", name: "category", label: "Category", description: 'Optional grouping \u2014 e.g. "bedliner", "general", "fleet".' },
          { type: "rich-text", name: "body", label: "Answer", isBody: true, description: "The answer in 1\u20133 sentences." }
        ]
      },
      // ────────────────────────────────────────────────────────
      // CONTENT BLOCKS (reusable)
      // ────────────────────────────────────────────────────────
      {
        name: "contentBlock",
        label: "Reusable Content Blocks",
        path: "content/content-blocks",
        format: "md",
        fields: [
          { type: "string", name: "slug", label: "Block ID", required: true, isTitle: true, description: "Unique identifier \u2014 used by the site to find this block. Don't change unless you know where it's used." },
          { type: "string", name: "title", label: "Display Title", description: "Just for editor reference." },
          { type: "string", name: "type", label: "Type", description: "announce | hero | cta | stats | etc." },
          { type: "rich-text", name: "body", label: "Content", isBody: true, description: "The block's editable copy." }
        ]
      },
      // ────────────────────────────────────────────────────────
      // PAGES
      // ────────────────────────────────────────────────────────
      {
        name: "page",
        label: "Pages",
        path: "content/pages",
        format: "md",
        fields: [
          { type: "string", name: "title", label: "Page Title", required: true, isTitle: true },
          { type: "string", name: "slug", label: "URL Slug", required: true },
          {
            type: "object",
            name: "hero",
            label: "Hero Section",
            fields: [...heroFields]
          },
          { type: "string", name: "seoTitle", label: "SEO \u2014 Page Title" },
          { type: "string", name: "seoDescription", label: "SEO \u2014 Meta Description", ui: { component: "textarea" } },
          { type: "rich-text", name: "body", label: "Body", isBody: true }
        ]
      },
      // ────────────────────────────────────────────────────────
      // BUSINESS SETTINGS (global)
      // ────────────────────────────────────────────────────────
      {
        name: "settings",
        label: "Business Settings",
        path: "content/globals",
        format: "json",
        match: { include: "settings" },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: "string", name: "business_name", label: "Business Name" },
          { type: "string", name: "phone", label: "Phone", description: 'Display format with parens \u2014 e.g. "(301) 304-1419".' },
          { type: "string", name: "email", label: "Email" },
          { type: "string", name: "address", label: "Address", ui: { component: "textarea" }, description: "Full street address shown in the footer." },
          { type: "string", name: "weekday_hours", label: "Weekday Hours", description: 'E.g. "Mon\u2013Fri: 9:30am\u20134:30pm".' },
          { type: "string", name: "saturday_hours", label: "Saturday Hours" },
          { type: "string", name: "sunday_hours", label: "Sunday Hours" },
          { type: "string", name: "facebook_url", label: "Facebook URL" },
          { type: "string", name: "instagram_url", label: "Instagram URL" },
          { type: "string", name: "youtube_url", label: "YouTube URL" },
          { type: "string", name: "google_business_url", label: "Google Business URL" },
          { type: "string", name: "default_seo_title", label: "Default SEO Title" },
          { type: "string", name: "default_seo_description", label: "Default SEO Description", ui: { component: "textarea" } },
          { type: "string", name: "urgency_message_1", label: "Announcement Bar \u2014 Primary", description: "Shown across the top of the site." },
          { type: "string", name: "urgency_message_2", label: "Announcement Bar \u2014 Secondary" }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
