export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).send('ANTHROPIC_API_KEY not set');

  const { text, documentId, supabaseUrl, supabaseKey } = req.body || {};
  if (!text || !documentId) return res.status(400).send('text and documentId required');

  // store extracted text in documents table
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase
    .from('documents')
    .update({ extracted_text: text.slice(0, 50000) }) // cap at 50K chars
    .eq('id', documentId);

  if (error) return res.status(500).send(error.message);
  return res.status(200).json({ ok: true });
}
