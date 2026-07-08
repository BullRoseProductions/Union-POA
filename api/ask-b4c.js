export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).send('ANTHROPIC_API_KEY not set');

  const { question, org, system } = req.body || {};
  if (!question) return res.status(400).send('question required');

  const systemPrompt = system || `You are Ask B4C, an AI assistant for ${org || 'a police officers association'}. Answer member questions accurately and helpfully. If you don't know something, say so clearly.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      }),
    });
    if (!r.ok) return res.status(502).send(await r.text());
    const data = await r.json();
    const answer = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return res.status(200).json({ answer });
  } catch (e) {
    return res.status(500).send(String(e));
  }
}
