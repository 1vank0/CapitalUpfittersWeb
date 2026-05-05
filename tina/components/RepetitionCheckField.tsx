// Repetition Check field — a non-saving "virtual" field that watches sibling
// fields (summary, hero.badge, hero.subheadline, faqs[].answer) and warns the
// editor when their wording is too similar. One click asks the AI to rewrite
// each so they vary in tone, length, and angle.
//
// Wire into a collection like this:
//   { type: 'string', name: '_repetitionCheck', label: 'Copy Variety Check',
//     ui: { component: RepetitionCheckField } }
//
// The leading underscore + omitted output keeps it out of the saved markdown
// (Tina ignores fields with no value during save, and the user never types here).

import * as React from 'react'
import { wrapFieldsWithMeta } from 'tinacms'

type Provider = 'openai' | 'anthropic' | 'ollama'

type FieldRef = {
  // dot-path into form values e.g. 'summary' or 'hero.badge'
  path: string
  label: string
}

const SERVICE_FIELDS: FieldRef[] = [
  { path: 'summary',           label: 'Short Summary' },
  { path: 'hero.badge',        label: 'Hero → Badge' },
  { path: 'hero.subheadline',  label: 'Hero → Subheadline' },
]

// ─── tiny in-browser similarity (Jaccard over word bigrams) ──────────────
function tokens(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}
function bigrams(s: string): Set<string> {
  const t = tokens(s)
  if (t.length < 2) return new Set(t)
  const out = new Set<string>()
  for (let i = 0; i < t.length - 1; i++) out.add(`${t[i]} ${t[i + 1]}`)
  return out
}
function jaccard(a: string, b: string): number {
  const A = bigrams(a), B = bigrams(b)
  if (A.size === 0 && B.size === 0) return 0
  let inter = 0
  A.forEach((x) => { if (B.has(x)) inter++ })
  const union = A.size + B.size - inter
  return union ? inter / union : 0
}

function getByPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
}

const SIM_THRESHOLD = 0.35  // ~35% bigram overlap = "feels repetitive"

type PairScore = { a: FieldRef; b: FieldRef; score: number }

export const RepetitionCheckField = wrapFieldsWithMeta(({ form }: any) => {
  const [tick, setTick] = React.useState(0)
  const [provider, setProvider] = React.useState<Provider>('openai')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [suggestions, setSuggestions] = React.useState<Record<string, string> | null>(null)

  // Subscribe to form value changes so the panel re-renders live.
  React.useEffect(() => {
    if (!form?.subscribe) return
    const unsub = form.subscribe(
      () => setTick((n) => n + 1),
      { values: true }
    )
    return () => { try { unsub && unsub() } catch {} }
  }, [form])

  const values = form?.getState ? form.getState().values : {}

  // Score every pair of tracked fields.
  const pairs: PairScore[] = []
  for (let i = 0; i < SERVICE_FIELDS.length; i++) {
    for (let j = i + 1; j < SERVICE_FIELDS.length; j++) {
      const a = SERVICE_FIELDS[i]
      const b = SERVICE_FIELDS[j]
      const va = (getByPath(values, a.path) || '').toString()
      const vb = (getByPath(values, b.path) || '').toString()
      if (!va.trim() || !vb.trim()) continue
      pairs.push({ a, b, score: jaccard(va, vb) })
    }
  }
  const repetitive = pairs.filter((p) => p.score >= SIM_THRESHOLD)

  // Also flag duplicate FAQ answers if any
  const faqs: any[] = Array.isArray(values?.faqs) ? values.faqs : []
  const faqDupes: { i: number; j: number; score: number }[] = []
  for (let i = 0; i < faqs.length; i++) {
    for (let j = i + 1; j < faqs.length; j++) {
      const ai = (faqs[i]?.answer || '').toString()
      const aj = (faqs[j]?.answer || '').toString()
      if (!ai.trim() || !aj.trim()) continue
      const s = jaccard(ai, aj)
      if (s >= SIM_THRESHOLD) faqDupes.push({ i, j, score: s })
    }
  }

  const hasIssues = repetitive.length > 0 || faqDupes.length > 0

  const askAi = async () => {
    setLoading(true)
    setError(null)
    setSuggestions(null)
    try {
      const snapshot: Record<string, string> = {}
      SERVICE_FIELDS.forEach((f) => {
        snapshot[f.path] = (getByPath(values, f.path) || '').toString()
      })

      const system =
        'You rewrite website copy so multiple short fields about the same product feel ' +
        'distinct in tone, length, and emphasis — without changing meaning or losing key facts. ' +
        'Reply with strict JSON only — no prose, no markdown.'

      const prompt =
        `These three fields all describe the SAME service and currently feel too similar to each other:\n\n` +
        Object.entries(snapshot)
          .map(([k, v]) => `- ${k}: "${v}"`)
          .join('\n') +
        `\n\nRewrite each so:\n` +
        `• "hero.badge" is 2–5 words, a punchy authority/credential tag.\n` +
        `• "hero.subheadline" is 1 sentence (~12–22 words) leading with the customer benefit.\n` +
        `• "summary" is 1 sentence (~15–25 words) framed for cards/listings, plain and scannable.\n` +
        `Each must use different opening words and emphasize a different angle (e.g. one credential-led, ` +
        `one benefit-led, one outcome/use-case-led). Keep the same product facts.\n\n` +
        `Return JSON exactly in this shape (no extra keys, no commentary):\n` +
        `{"summary": "...", "hero.badge": "...", "hero.subheadline": "..."}`

      const resp = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, prompt, system, maxTokens: 500 }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || `Server returned ${resp.status}`)

      // Extract JSON object even if model wrapped it in code fences
      const raw = (data.text || '').toString().trim()
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('AI did not return JSON. Got: ' + raw.slice(0, 120))
      const parsed = JSON.parse(m[0])
      setSuggestions(parsed)
    } catch (e: any) {
      setError(e.message || 'AI request failed.')
    } finally {
      setLoading(false)
    }
  }

  const apply = (path: string) => {
    if (!suggestions || suggestions[path] == null || !form?.change) return
    form.change(path, suggestions[path])
  }
  const applyAll = () => {
    if (!suggestions || !form?.change) return
    Object.entries(suggestions).forEach(([k, v]) => {
      if (typeof v === 'string') form.change(k, v)
    })
  }

  // ─── styles ────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = {
    border: '1px solid ' + (hasIssues ? '#fbbf24' : '#d1fae5'),
    background: hasIssues ? '#fffbeb' : '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
  }
  const chip: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: '#fff',
    border: '1px solid #e5e7eb',
    marginRight: 6,
    fontSize: 12,
    color: '#374151',
  }
  const btn = (color: string, disabled: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: 4,
    border: 'none',
    background: disabled ? '#9ca3af' : color,
    color: '#fff',
    fontSize: 13,
    cursor: disabled ? 'wait' : 'pointer',
  })

  return (
    <div style={wrap} key={tick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{hasIssues ? '⚠️' : '✅'}</span>
        <strong>{hasIssues ? 'Some fields look repetitive' : 'Copy variety looks good'}</strong>
      </div>

      {!hasIssues && (
        <div style={{ color: '#065f46' }}>
          Summary, badge, and subheadline read distinctly. No action needed.
        </div>
      )}

      {repetitive.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ marginBottom: 4 }}>These pairs share too many words / phrasing:</div>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {repetitive.map((p, idx) => (
              <li key={idx} style={{ marginBottom: 2 }}>
                <span style={chip}>{p.a.label}</span>
                ↔
                <span style={{ ...chip, marginLeft: 6 }}>{p.b.label}</span>
                <span style={{ color: '#92400e', marginLeft: 6 }}>
                  {(p.score * 100).toFixed(0)}% overlap
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {faqDupes.length > 0 && (
        <div style={{ marginBottom: 8, color: '#92400e' }}>
          {faqDupes.length} FAQ answer pair{faqDupes.length > 1 ? 's' : ''} repeat each other — consider tightening or merging.
        </div>
      )}

      {hasIssues && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #fcd34d' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#374151' }}>AI provider:</span>
            {(['openai', 'anthropic', 'ollama'] as Provider[]).map((p) => (
              <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <input type="radio" name="rep-prov" checked={provider === p} onChange={() => setProvider(p)} />
                {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Claude' : 'Ollama'}
              </label>
            ))}
            <button type="button" onClick={askAi} disabled={loading} style={btn('#b45309', loading)}>
              {loading ? 'Thinking…' : '✨ Suggest varied rewrites'}
            </button>
          </div>
          {error && (
            <div style={{ color: '#b91c1c', marginBottom: 8, fontSize: 12 }}>{error}</div>
          )}
          {suggestions && (
            <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 6, padding: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Suggested rewrites</div>
              {SERVICE_FIELDS.map((f) => {
                const cur = (getByPath(values, f.path) || '').toString()
                const sug = (suggestions as any)[f.path]
                if (!sug || sug === cur) return null
                return (
                  <div key={f.path} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px dotted #fde68a' }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through', marginBottom: 4 }}>{cur || '(empty)'}</div>
                    <div style={{ fontSize: 13, color: '#111827', marginBottom: 6 }}>{sug}</div>
                    <button type="button" onClick={() => apply(f.path)} style={btn('#059669', false)}>
                      Apply to {f.label}
                    </button>
                  </div>
                )
              })}
              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={applyAll} style={btn('#4f46e5', false)}>
                  Apply all
                </button>
                <span style={{ marginLeft: 8, color: '#6b7280', fontSize: 12 }}>
                  Then click <strong>Save</strong> at the top-right to publish.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
