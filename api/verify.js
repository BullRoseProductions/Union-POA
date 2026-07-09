import { createClient } from '@supabase/supabase-js';
export default async function handler(req, res) {
  const { m } = req.query;
  if (!m) return res.status(400).json({ error: 'Member ID required' });
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data, error } = await supabase
    .from('members')
    .select('full_name, badge, district, standing, dues_paid_through, member_since, department_id')
    .eq('id', m)
    .single();
  if (error || !data) return res.status(404).json({ error: 'Member not found' });
  const { data: dept } = await supabase
    .from('departments')
    .select('name')
    .eq('id', data.department_id)
    .single();
  return res.status(200).json({
    full_name: data.full_name,
    badge: data.badge,
    district: data.district,
    standing: data.standing || 'Good',
    dues_paid_through: data.dues_paid_through,
    member_since: data.member_since,
    org_name: dept?.name || 'Association',
    verified_at: new Date().toISOString(),
  });
}
