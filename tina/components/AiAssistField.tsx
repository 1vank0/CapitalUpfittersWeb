// Custom Tina field wrapper that renders the standard textarea/string input
// AND a "Generate with AI" button group below it. The editor types a short
// prompt, picks a provider, and the field is filled with the AI's response.

import * as React from 'react'
import { wrapFieldsWithMeta } from 'tinacms'

type Provider = 'openai' | 'anthropic' | 'ollama'

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Claude' },
  { value: 'ollama', label: 'Ollama' },
]

export const AiAssistField = wrapFieldsWithMeta(({ input, field }: any) => {
  const isTextarea = field?.ui?.component === 'textarea' || field?.aiAssist?.lines > 1
  const [provider, setProvider] = React.useState<Provider>('openai')
  const [prompt, setPrompt] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const placeholder = field?.aiAssist?.promptHint || 'What should the AI write? e.g. "rewrite for SEO" or "shorter, friendlier tone"'

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      // Compose a richer prompt using the field's current value if any,
      // so the AI rewrites instead of starting from scratch when there's text.
      const existing = (input.value || '').toString().trim()
      const composedPrompt = existing
        ? `Existing copy:\n"""\n${existing}\n"""\n\nInstruction: ${prompt}`
        : prompt

      const resp = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          prompt: composedPrompt,
          system: field?.aiAssist?.system,
          maxTokens: field?.aiAssist?.maxTokens || 500,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || `Server returned ${resp.status}`)
      input.onChange(data.text)
    } catch (e: any) {
      setError(e.message || 'Generation failed.')
    } finally {
      setLoading(false)
    }
  }

  const inputProps = {
    ...input,
    placeholder: field?.placeholder || '',
    style: {
      width: '100%',
      padding: '8px 10px',
      borderRadius: 6,
      border: '1px solid #d1d5db',
      fontSize: 14,
      background: '#fff',
    } as React.CSSProperties,
  }

  return (
    <div>
      {isTextarea ? (
        <textarea {...inputProps} rows={field?.aiAssist?.lines || 4} />
      ) : (
        <input type="text" {...inputProps} />
      )}

      <details style={{ marginTop: 8, fontSize: 13 }}>
        <summary style={{ cursor: 'pointer', color: '#4f46e5', userSelect: 'none' }}>
          ✨ Generate with AI
        </summary>
        <div style={{ marginTop: 8, padding: 10, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            {PROVIDERS.map((p) => (
              <label key={p.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <input
                  type="radio"
                  name={`prov-${field.name}`}
                  checked={provider === p.value}
                  onChange={() => setProvider(p.value)}
                />
                {p.label}
              </label>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            rows={2}
            style={{ width: '100%', padding: 6, fontSize: 13, borderRadius: 4, border: '1px solid #d1d5db' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: 'none',
                background: loading ? '#9ca3af' : '#4f46e5',
                color: '#fff',
                fontSize: 13,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
            {input.value ? (
              <span style={{ color: '#6b7280', fontSize: 12 }}>
                Will rewrite the existing text using your instruction.
              </span>
            ) : (
              <span style={{ color: '#6b7280', fontSize: 12 }}>
                Will write fresh copy from your instruction.
              </span>
            )}
          </div>
          {error && (
            <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 12 }}>
              {error}
            </div>
          )}
        </div>
      </details>
    </div>
  )
})

// Re-usable: returns a field config object with this UI applied.
export const aiAssistField = (base: any, opts: { lines?: number; system?: string; maxTokens?: number; promptHint?: string } = {}) => ({
  ...base,
  ui: {
    ...(base.ui || {}),
    component: AiAssistField,
  },
  aiAssist: { ...opts },
})
