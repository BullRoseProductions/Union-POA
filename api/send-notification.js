// Sends an association email notification to members via Resend.
// Security: the caller must present a valid Supabase session token (Authorization: Bearer <token>)
// and be a Board/Admin member of the department. Member opt-outs are honored except for
// the "critical" category. Recipients are emailed individually (no shared To/BCC).
// Requires env: SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, RESEND_API_KEY, NOTIFY_FROM_EMAIL.

const MANAGE_ROLES = ['Board', 'DeptAdmin', 'Officer', 'ProjectAdmin'];
const ESSENTIAL = ['critical']; // categories that ignore opt-out

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL; // e.g. "Fort Worth POA <notify@yourdomain.org>"
  if (!serviceKey || !supabaseUrl) return res.status(501).json({ error: 'Supabase service key not configured' });
  if (!resendKey || !fromEmail) return res.status(501).json({ error: 'Email not configured — set RESEND_API_KEY and NOTIFY_FROM_EMAIL in Vercel' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { category, subject, body, test } = req.body || {};
  if (!category || !subject || !body) return res.status(400).json({ error: 'category, subject, and body are required' });

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(supabaseUrl, serviceKey);

  // 1) Verify the caller and their role
  const { data: userData, error: uErr } = await admin.auth.getUser(token);
  const callerEmail = userData?.user?.email;
  if (uErr || !callerEmail) return res.status(401).json({ error: 'Invalid or expired session' });

  const { data: meRows } = await admin.from('members')
    .select('id, department_id, access, full_name, email')
    .ilike('email', callerEmail).limit(1);
  const me = meRows && meRows[0];
  if (!me) return res.status(403).json({ error: 'Not a member of any association' });
  if (!(me.access || []).some(r => MANAGE_ROLES.includes(r))) {
    return res.status(403).json({ error: 'Only board or admin members can send notifications' });
  }

  // 2) Resolve recipients in the caller's department, honoring opt-outs
  const { data: members } = await admin.from('members')
    .select('id, email, full_name, status, notification_prefs')
    .eq('department_id', me.department_id);

  const essential = ESSENTIAL.includes(category);
  let recipients = (members || []).filter(m => {
    if (!m.email) return false;
    if (m.status && m.status !== 'active') return false;
    if (essential) return true;
    const prefs = m.notification_prefs || {};
    return prefs[category] !== false; // default opted-in
  });

  // Test mode: send only to the caller
  if (test) {
    recipients = [{ id: me.id, email: me.email, full_name: me.full_name }];
  }

  // 3) Log the send first (status updated after)
  const { data: logRow } = await admin.from('notification_log').insert({
    department_id: me.department_id,
    category, subject, body,
    sent_by: me.id,
    recipient_count: recipients.length,
    test: !!test,
  }).select().single();

  if (recipients.length === 0) {
    return res.status(200).json({ success: true, total: 0, sent: 0, failed: 0, test: !!test, note: 'No eligible recipients.' });
  }

  // 4) Send via Resend batch endpoint (<=100 per call), individually addressed
  const html = renderEmail(subject, body);
  let sent = 0, failed = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100);
    const payload = chunk.map(r => ({ from: fromEmail, to: [r.email], subject, html }));
    try {
      const rr = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${resendKey}` },
        body: JSON.stringify(payload),
      });
      if (rr.ok) sent += chunk.length;
      else failed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }

  if (logRow) {
    await admin.from('notification_log').update({ sent_count: sent, failed_count: failed }).eq('id', logRow.id);
  }

  return res.status(200).json({ success: true, total: recipients.length, sent, failed, test: !!test });
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderEmail(subject, body) {
  const paras = String(body).split(/\n{2,}/).map(p =>
    `<p style="margin:0 0 14px;line-height:1.6;color:#26303f;font-size:15px">${esc(p).replace(/\n/g, '<br>')}</p>`
  ).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f5f7;padding:24px;font-family:'Inter',Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 14px rgba(0,0,0,.07)">
    <div style="background:linear-gradient(120deg,#101d35,#0a1427);padding:22px 26px">
      <div style="font-weight:800;font-style:italic;font-size:24px;letter-spacing:-.05em;color:#f3cf74">B4C</div>
      <div style="font-size:11px;letter-spacing:.2em;color:#d8ac4c;text-transform:uppercase;margin-top:4px">Fort Worth POA</div>
    </div>
    <div style="padding:26px">
      <h1 style="font-size:20px;color:#101d35;margin:0 0 16px;font-weight:700">${esc(subject)}</h1>
      ${paras}
    </div>
    <div style="padding:16px 26px;border-top:1px solid #eef0f3;font-size:11px;color:#8a94a3;line-height:1.5">
      You're receiving this because you're a member of Fort Worth POA. You can manage which notifications you receive in the B4C app under Correspondence.
    </div>
  </div>
</body></html>`;
}
