// Sends a Supabase magic-link invite to a member's email so they can onboard.
// Uses the service role key server-side only — never exposed to the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return res.status(501).json({ error: 'Supabase service key not configured' });

  const { email, full_name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: process.env.VITE_APP_URL || 'https://union-poa.vercel.app',
  });
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ success: true });
}
