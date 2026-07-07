import { supabase } from './supabase'

// current member row (identity bridges by email, server-side)
export async function getMe() {
  const { data, error } = await supabase.rpc('current_member')
  if (error) throw error
  return Array.isArray(data) ? (data[0] || null) : (data || null)
}

export async function listMeetings() {
  const { data, error } = await supabase
    .from('meetings').select('*').order('scheduled_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getMeeting(id) {
  const { data, error } = await supabase
    .from('meetings')
    .select('*, agenda_items(*), action_items(*, members(full_name))')
    .eq('id', id).single()
  if (error) throw error
  data.agenda_items = (data.agenda_items || []).sort((a, b) => a.position - b.position)
  return data
}

export async function myActionItems(memberId) {
  const { data, error } = await supabase
    .from('action_items')
    .select('*, meetings(title, scheduled_at)')
    .eq('owner_member_id', memberId)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data
}

// --- lifecycle RPCs (server-stamped, role-checked) ---
export async function setActionStatus(id, status) {
  const { data, error } = await supabase.rpc('set_action_status', { p_action: id, p_status: status })
  if (error) throw error
  return data
}
export async function fileMinutes(id, body) {
  const { data, error } = await supabase.rpc('file_minutes', { p_meeting: id, p_body: body })
  if (error) throw error
  return data
}
export async function completeMeeting(id) {
  const { data, error } = await supabase.rpc('complete_meeting', { p_meeting: id })
  if (error) throw error
  return data
}
export async function cancelMeeting(id) {
  const { data, error } = await supabase.rpc('cancel_meeting', { p_meeting: id })
  if (error) throw error
  return data
}

// optional AI drafting (serverless function; degrades gracefully if not configured)
export async function draftMinutes({ title, agenda, notes }) {
  const res = await fetch('/api/draft-minutes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, agenda, notes }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(t || 'AI drafting is not configured yet.')
  }
  const json = await res.json()
  return json.minutes
}
