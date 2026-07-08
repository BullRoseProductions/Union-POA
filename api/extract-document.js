export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return res.status(501).send('Supabase service key not configured');

  const { text, documentId } = req.body || {};
  if (!text || !documentId) return res.status(400).send('text and documentId required');

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase
    .from('documents')
    .update({ extracted_text: text.slice(0, 50000) })
    .eq('id', documentId);

  if (error) return res.status(500).send(error.message);
  return res.status(200).json({ ok: true });
}
