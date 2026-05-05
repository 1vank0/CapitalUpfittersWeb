// Vercel serverless function: POST /api/ai-assist
// Body: { provider: 'openai' | 'anthropic' | 'ollama', prompt: string,
//         system?: string, model?: string, maxTokens?: number }
// Returns: { text: string } or { error: string }
//
// Required env vars per provider:
//   - OPENAI_API_KEY
//   - ANTHROPIC_API_KEY
//   - OLLAMA_HOST (e.g. https://your-ollama-host)
//
// If a key is missing for the requested provider, the endpoint returns
// HTTP 400 with a clear "configure XXX" message — the editor sees it.

const ALLOWED_PROVIDERS = ['openai', 'anthropic', 'ollama']

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.end(JSON.stringify(body))
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

async function callOpenAI({ prompt, system, model, maxTokens }) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured on the server.')
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      max_tokens: maxTokens || 600,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`OpenAI ${resp.status}: ${txt.slice(0, 300)}`)
  }
  const data = await resp.json()
  return data?.choices?.[0]?.message?.content?.trim() || ''
}

async function callAnthropic({ prompt, system, model, maxTokens }) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured on the server.')
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-latest',
      max_tokens: maxTokens || 600,
      system: system || undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Anthropic ${resp.status}: ${txt.slice(0, 300)}`)
  }
  const data = await resp.json()
  const block = (data.content || []).find((c) => c.type === 'text')
  return block?.text?.trim() || ''
}

async function callOllama({ prompt, system, model, maxTokens }) {
  const host = process.env.OLLAMA_HOST
  if (!host) throw new Error('OLLAMA_HOST is not configured on the server.')
  const url = host.replace(/\/+$/, '') + '/api/generate'
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3.1',
      prompt: system ? `${system}\n\n${prompt}` : prompt,
      stream: false,
      options: { num_predict: maxTokens || 600 },
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Ollama ${resp.status}: ${txt.slice(0, 300)}`)
  }
  const data = await resp.json()
  return (data.response || '').trim()
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })

  let body
  try { body = await readJsonBody(req) }
  catch { return send(res, 400, { error: 'Invalid JSON body.' }) }

  const provider = (body.provider || 'openai').toLowerCase()
  const prompt = (body.prompt || '').trim()
  const system =
    body.system ||
    'You write concise, polished marketing copy for a vehicle-upfitting business in Rockville, MD called Capital Upfitters. Match the existing tone: confident, direct, no filler, no emojis. Use sentence case unless asked otherwise. Return only the requested copy with no preamble.'
  const model = body.model || undefined
  const maxTokens = body.maxTokens || undefined

  if (!ALLOWED_PROVIDERS.includes(provider)) {
    return send(res, 400, { error: `Unknown provider "${provider}". Allowed: ${ALLOWED_PROVIDERS.join(', ')}.` })
  }
  if (!prompt) return send(res, 400, { error: 'Missing prompt.' })

  try {
    let text = ''
    if (provider === 'openai') text = await callOpenAI({ prompt, system, model, maxTokens })
    else if (provider === 'anthropic') text = await callAnthropic({ prompt, system, model, maxTokens })
    else if (provider === 'ollama') text = await callOllama({ prompt, system, model, maxTokens })

    return send(res, 200, { text, provider })
  } catch (err) {
    return send(res, 400, { error: err.message || String(err), provider })
  }
}
