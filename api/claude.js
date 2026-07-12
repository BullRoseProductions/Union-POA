// Generic Claude proxy: takes { system, content, max_tokens } and returns { text }.
// Holds ANTHROPIC_API_KEY server-side so the key is never exposed to the browser.
// Enable by setting ANTHROPIC_API_KEY in Vercel. If it's unset, callers get a
// friendly 501 and can show a "not configured yet" message.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(501).send('ANTHROPIC_API_KEY is not set')

  const { system = '', content = '', max_tokens = 1000, temperature } = req.body || {}
  if (!content) return res.status(400).send('content is required')

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens,
        ...(temperature != null ? { temperature } : {}),
        system: system || undefined,
        messages: [{ role: 'user', content }],
      }),
    })
    if (!r.ok) return res.status(502).send(await r.text())
    const data = await r.json()
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
    return res.status(200).json({ text })
  } catch (e) {
    return res.status(500).send(String(e))
  }
}
