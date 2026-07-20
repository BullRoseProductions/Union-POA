// B4C Union POA — build 2026-07-16
// build-kick
import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Phone, MessageSquare, Handshake, TrendingUp, Shield,
  Calendar, CreditCard, Vote, ShoppingBag, AlertTriangle, Bell,
  CalendarCheck, ClipboardList, DollarSign, Heart, Megaphone,
  BookOpen, Mail, Users, BarChart3, LogOut, Menu, X, ChevronRight, ChevronDown, ChevronUp,
  Sparkles, CheckCircle2, Clock, Loader2, Send, Building2,
  Plus, Pencil, Trash2, ArrowLeft, RefreshCw, FileText, QrCode, Settings, Upload,
  KeyRound, Play, UserCircle, CalendarPlus, Filter, Download, ExternalLink,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { QRCodeCanvas } from "qrcode.react";

/* ================================================================
   B4C · POA Member Hub
   Patterned directly from the VFD App.jsx:
   - Single file, inline styles, POA token system
   - hasAny() role checks, sidebar nav, desktop-first
   - Member nav (10 items) vs Board nav (11 items) based on access[]
   ================================================================ */

const APP = "Before the Call";

/* ---------- POA palette (violet-dark, mirrors FIRE token shape) ---------- */
const POA = {
  pageBg: "radial-gradient(130% 100% at 100% 0%, #0D1428 0%, #070C18 42%, #04070F 100%)",
  sidebar: "linear-gradient(180deg, #060B1A 0%, #030610 100%)",
  sidebarSolid: "#030610",
  card: "#0A1020",
  card2: "#0E1630",
  hairline: "rgba(255,255,255,.07)",
  hairline2: "rgba(255,255,255,.12)",
  cardShadow: "0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)",
  cardRadius: 13,
  textPrimary: "#F5F0E8",
  textSecondary: "#B8B0A0",
  textMuted: "#706860",
  textMuted2: "#8A8278",
  accent: "#DBA525",
  accentDim: "#8A6510",
  accentSoft: "rgba(219,165,37,.10)",
  accentGlow: "rgba(219,165,37,.20)",
  accentBright: "#F0C84A",
  green: "#46C793",
  greenText: "#7AD8B0",
  amber: "#E8A030",
  amberText: "#D4904A",
  red: "#EF6A64",
  redText: "#E58A90",
  track: "rgba(255,255,255,.06)",
  btnBg: "rgba(255,255,255,.04)",
  btnBorder: "rgba(255,255,255,.10)",
  inputBorder: "rgba(255,255,255,.10)",
  btnText: "#E0D8C8",
  btnIcon: "#908878",
  navLabel: "rgba(192,184,168,.7)",
  white: "#fff",
};

/* ---------- Style recipes (same shape as fire's FS) ---------- */
const PS = {
  card: {
    background: "linear-gradient(135deg, #0E1630 0%, #0A1020 100%)",
    border: "0.5px solid rgba(255,255,255,.10)",
    borderRadius: 13,
    padding: "14px 16px",
    boxShadow: "0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)",
    position: "relative",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 13px",
    borderRadius: 8,
    border: "0.5px solid rgba(255,255,255,.10)",
    background: "rgba(255,255,255,.04)",
    color: "#E0D8C8",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 1px 4px rgba(0,0,0,.3)",
  },
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #DBA525, #C49B2A)",
    color: "#06090A",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 2px 10px rgba(219,165,37,.3), inset 0 1px 0 rgba(255,255,255,.12)",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "0.5px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.3)",
    color: "#F5F0E8",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,.4)",
  },
  textarea: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "0.5px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.3)",
    color: "#F5F0E8",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    minHeight: 80,
    boxShadow: "inset 0 1px 3px rgba(0,0,0,.4)",
  },
  kicker: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "#DBA525",
    marginBottom: 8,
  },
};

/* ---------- Role helpers (exact shape from fire) ---------- */
const hasAny      = (rs, set) => Array.isArray(rs) && rs.some(r => set.includes(r));

// Three tiers:
// Member       — view-only, own actions, QR self-check-in
// Board        — full board console, add events, file minutes, manage causes (no hard-delete, no roster edits)
// DeptAdmin    — everything Board has + roster management + hard-delete
//                (Administrative Assistant / Secretary / POA President)

const BOARD_ROLES     = ["Board", "DeptAdmin", "ProjectAdmin"];
const DEPTADMIN_ROLES = ["DeptAdmin", "ProjectAdmin"];
const MANAGE_ROLES    = ["Board", "DeptAdmin", "ProjectAdmin"];

const isBoard     = rs => hasAny(rs, BOARD_ROLES);
const isDeptAdmin = rs => hasAny(rs, DEPTADMIN_ROLES);
const canManage   = rs => hasAny(rs, MANAGE_ROLES);
// canEdit = Board + DeptAdmin can create/edit (not delete causes, not roster)
// canAdmin = DeptAdmin only — roster edits, hard-deletes
const canEdit     = rs => hasAny(rs, BOARD_ROLES);
const canAdmin    = rs => hasAny(rs, DEPTADMIN_ROLES);

/* ---------- Helpers ---------- */
const fmtDate  = d => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtShort = d => d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
const initials = n => (n || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
const money    = n => (n != null) ? "$" + Number(n).toLocaleString() : null;
const isOverdue = (due, status) => status === "open" && due && new Date(due) < new Date(new Date().toDateString());

/* ================================================================
   MEMBER NAV  (10 items + alerts/incident at top)
   BOARD NAV   (11 items)
   Both arrays: { id, label, Icon, boardOnly? }
   ================================================================ */
const MEMBER_NAV = [
  { id: "m_dash",     label: "Dashboard",       Icon: LayoutDashboard },
  { id: "m_call",     label: "Who to Call",      Icon: Phone },
  { id: "m_ask",      label: "Ask B4C",          Icon: MessageSquare },
  { id: "m_partners", label: "Trusted Partners", Icon: Handshake },
  { id: "m_community", label: "Community",        Icon: Users },
  { id: "m_benefits", label: "Benefits",         Icon: Shield },
  { id: "m_events",   label: "Events",           Icon: Calendar },
  { id: "m_card",     label: "My Card",          Icon: CreditCard },
  { id: "m_vote",     label: "VoteLink",         Icon: Vote },
  { id: "m_store",    label: "Store",            Icon: ShoppingBag },
  { id: "m_booking",  label: "Event Space",      Icon: Building2 },
  { id: "m_correspondence", label: "Correspondence", Icon: Mail },
  { id: "m_documents", label: "Documents", Icon: FileText },
];

const BOARD_NAV = [
  { id: "b_dash",         label: "Dashboard",        Icon: LayoutDashboard },
  { id: "b_profile",      label: "My Profile",       Icon: UserCircle },
  { id: "b_attendance",   label: "Meetings & Events", Icon: CalendarCheck },
  { id: "b_meetings",     label: "Agenda & Minutes",  Icon: ClipboardList },
  { id: "b_stipend",      label: "Stipend Log",       Icon: DollarSign },
  { id: "b_causes",       label: "Causes",            Icon: Heart },
  { id: "b_fundraising",  label: "Fundraising",       Icon: Megaphone },
  { id: "b_social",       label: "Social & Media",    Icon: BarChart3 },
  { id: "b_building",     label: "POA Building",      Icon: Building2 },
  { id: "b_continuity",   label: "Board Continuity",  Icon: BookOpen },
  { id: "b_correspondence",label: "Correspondence",   Icon: Mail },
  { id: "m_vote",         label: "VoteLink",          Icon: Vote },
  { id: "b_community",    label: "Community",         Icon: Users },
  { id: "b_members",      label: "Members",           Icon: Users },
  { id: "b_documents",    label: "Documents",         Icon: FileText },
  { id: "b_ledger",       label: "Value Ledger",      Icon: TrendingUp },
  { id: "b_settings",     label: "Settings",          Icon: Settings },
];

const PA_NAV = [
  { id: "pa_dash",   label: "PA Dashboard",     Icon: LayoutDashboard },
  { id: "pa_orgs",   label: "Manage Orgs",      Icon: Building2 },
  { id: "pa_config", label: "Org Config",       Icon: Settings },
  { id: "pa_add",    label: "Add Organization", Icon: Plus },
];

/* ================================================================
   SUPABASE DATA LAYER
   ================================================================ */
async function getMe() {
  const { data, error } = await supabase.rpc("current_member");
  if (error) throw error;
  return Array.isArray(data) ? (data[0] || null) : (data || null);
}
async function getMyOrg() {
  const { data, error } = await supabase.from("departments").select("*").single();
  if (error) throw error;
  return data;
}
async function listMeetings() {
  const { data, error } = await supabase.from("meetings").select("*").order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
async function getMeeting(id) {
  const { data, error } = await supabase
    .from("meetings")
    .select("*, agenda_items(*), action_items(*, members(full_name))")
    .eq("id", id).single();
  if (error) throw error;
  data.agenda_items = (data.agenda_items || []).sort((a, b) => a.position - b.position);
  return data;
}
async function myActionItems(memberId) {
  const { data, error } = await supabase
    .from("action_items")
    .select("*, meetings(title, scheduled_at)")
    .eq("owner_member_id", memberId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data || [];
}
async function listCauses() {
  const { data, error } = await supabase.from('causes')
    .select('*, cause_entries(*), cause_contacts!cause_contacts_cause_id_fkey(*), point_person:members!causes_point_person_id_fkey(id, full_name, phone)')
    .order('sort', { ascending: true });
  if (error) throw error;
  return data || [];
}
async function listMembers() {
  const { data, error } = await supabase.from("members").select("*").order("full_name");
  if (error) throw error;
  return data || [];
}
async function setActionStatus(id, status) {
  const { data, error } = await supabase.rpc("set_action_status", { p_action: id, p_status: status });
  if (error) throw error;
  return data;
}
async function fileMinutes(id, body) {
  const { data, error } = await supabase.rpc("file_minutes", { p_meeting: id, p_body: body });
  if (error) throw error;
  return data;
}
async function completeMeeting(id) {
  const { data, error } = await supabase.rpc("complete_meeting", { p_meeting: id });
  if (error) throw error;
  return data;
}

/* ================================================================
   SHARED COMPONENTS
   ================================================================ */
function Spinner() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
    <Loader2 size={22} color={POA.accent} className="spin" style={{ animation: "spin 1s linear infinite" }} />
  </div>;
}
function ErrBox({ msg }) {
  return msg ? <div style={{ background: "rgba(239,106,100,.1)", border: "0.5px solid rgba(239,106,100,.3)", color: POA.redText, borderRadius: 10, padding: "11px 14px", fontSize: 13, marginBottom: 12 }}>{msg}</div> : null;
}
function SectionTitle({ children }) {
  return <p style={PS.kicker}>{children}</p>;
}
function PageTitle({ children, sub }) {
  return <div style={{ marginBottom: 22 }}>
    <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: "0 0 4px" }}>{children}</h1>
    {sub && <div style={{ fontSize: 13.5, color: POA.textMuted }}>{sub}</div>}
  </div>;
}
function Card({ children, style, onClick }) {
  return <div style={{ ...PS.card, padding: "16px 18px", marginBottom: 10, ...style }} onClick={onClick}>{children}</div>;
}
function StatRow({ stats }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 10, marginBottom: 18 }}>
    {stats.map(({ n, label, color }) => (
      <div key={label} style={{ ...PS.card, padding: "14px 16px" }}>
        <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 26, color: color || POA.accent, lineHeight: 1 }}>{n ?? "·"}</div>
        <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      </div>
    ))}
  </div>;
}
function ComingSoon({ label }) {
  return <div style={{ textAlign: "center", padding: "60px 20px", color: POA.textMuted }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>🔜</div>
    <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 17, color: POA.textPrimary, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>This section is on the build list.<br />The database is ready — the screen is coming next.</div>
  </div>;
}

/* ================================================================
   MEMBER SCREENS
   ================================================================ */
function RecentVideos({ deptId }) {
  const [videos, setVideos] = useState([]);
  useEffect(() => {
    listVideos().then(v => setVideos(v.slice(0, 3))).catch(() => null);
  }, []);
  if (videos.length === 0) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <SectionTitle>From your association</SectionTitle>
      {videos.map(v => {
        const embedUrl = vimeoEmbedUrl(v.vimeo_url);
        return (
          <Card key={v.id} style={{ marginBottom: 14 }}>
            {v.series_name && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent, marginBottom: 5 }}>{v.series_name}</div>}
            <div style={{ fontWeight: 700, fontSize: 14.5, color: POA.textPrimary, marginBottom: 4 }}>{v.title}</div>
            {v.description && <div style={{ fontSize: 12.5, color: POA.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{v.description}</div>}
            {embedUrl && (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 10 }}>
                <iframe src={embedUrl} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }}
                  allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={v.title} />
              </div>
            )}
            <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8 }}>{fmtDate(v.created_at)}</div>
          </Card>
        );
      })}
    </div>
  );
}

function MemberDash({ me, org, setView }) {
  const today = new Date();
  const [emergency, setEmergency] = useState(false);
  const [nextMeeting, setNextMeeting] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [openActions, setOpenActions] = useState(0);
  const [videos, setVideos] = useState([]);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [onCall, setOnCall_state] = useState([]);
  const [activity, setActivity] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    listMeetings().then(ms => setNextMeeting(ms.find(m => m.status === "open") || null));
    getActiveAlert().then(setActiveAlert).catch(() => null);
    getOnCall().then(setOnCall_state).catch(() => null);
    listActivityLog().then(setActivity).catch(() => null);
    listAnnouncements().then(ann => {
      setAnnouncements(ann.slice(0, 3));
      const lastSeen = localStorage.getItem(`last_seen_${me.id}`) || '2000-01-01';
      const unseen = ann.filter(a => a.created_at > lastSeen).length;
      setNewCount(unseen);
    }).catch(() => null);
    listVideos().then(async vids => {
      const top3 = vids.slice(0, 3);
      setVideos(top3);
      const withThumbs = await Promise.all(top3.map(async v => {
        if (v.thumbnail_url) return v;
        const thumb = await getVimeoThumb(v.vimeo_url);
        return { ...v, thumbnail_url: thumb };
      }));
      setVideos(withThumbs);
    }).catch(() => setVideos([]));
    myActionItems(me.id).then(items => setOpenActions(items.filter(i => i.status === "open").length));
    // attendance this quarter
    const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    supabase.from("event_attendance")
      .select("event_id, events(event_date, title)")
      .eq("member_id", me.id)
      .gte("events.event_date", qStart.toISOString().split("T")[0])
      .then(({ data }) => setAttendance(data || []));
  }, [me.id]);

  const orgInitials = (org?.name || "POA").split(" ").map(w => w[0]).slice(0, 3).join("").toUpperCase();
  const firstName = me.full_name?.split(" ")[0] || "there";
  const hour = today.getHours();
  const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const attCount = attendance.length;
  const attGoal = 4;
  const attPct = Math.min(100, Math.round((attCount / attGoal) * 100));

  // ── EMERGENCY SCREEN ──
  if (emergency) return (
    <div style={{ minHeight: "calc(100vh - 80px)", background: "#2d0a0a", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 20, position: "relative" }}>
      <button onClick={() => setEmergency(false)}
        style={{ position: "absolute", top: 16, left: 16, background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "rgba(255,255,255,.7)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={13} /> Back
      </button>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 6 }}>{org?.name || "Your Association"}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Need help?<br />We've got you.</div>
      </div>

      <button onClick={() => { if (onCall[0]?.phone) window.location.href = `tel:${onCall[0].phone.replace(/\D/g, '')}`; else setView('m_call'); }}
        style={{ width: 150, height: 150, borderRadius: "50%", background: "#c0392b", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, animation: "pulse-emerg 2s infinite" }}>
        <Phone size={44} color="#fff" />
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: ".04em" }}>Call now</div>
      </button>
      <style>{`@keyframes pulse-emerg{0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,.5)}50%{box-shadow:0 0 0 20px rgba(192,57,43,0)}}`}</style>

      {/* Primary on-call */}
      {onCall.length > 0 ? (
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 8 }}>
          {onCall.map((oc, idx) => (
            <div key={oc.id}>
              {idx === 1 && (
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.35)", textAlign: "center", margin: "4px 0 8px" }}>
                  If no answer →
                </div>
              )}
              <div style={{ background: idx === 0 ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.06)", border: `0.5px solid ${idx === 0 ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 3 }}>
                    {idx === 0 ? "Primary on-call" : "Backup on-call"}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{oc.name}</div>
                  {oc.notes && <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{oc.notes}</div>}
                </div>
                <a href={`tel:${oc.phone.replace(/\D/g, "")}`}
                  style={{ background: idx === 0 ? "#c0392b" : "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0 }}>
                  <Phone size={14} /> Call
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ background: "rgba(255,255,255,.06)", border: "0.5px solid rgba(255,255,255,.1)", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>No on-call officer set.</div>
            <button onClick={() => { setEmergency(false); setView("m_call"); }}
              style={{ background: "rgba(255,255,255,.1)", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "rgba(255,255,255,.8)", cursor: "pointer" }}>
              View Who to Call →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── NORMAL DASHBOARD ──
  return (
    <div>
      {/* Active alert banner */}
      {activeAlert && (
        <div style={{ background: "rgba(239,106,100,.1)", border: "1px solid rgba(239,106,100,.4)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={16} color={POA.red} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: POA.red, fontSize: 13, marginBottom: 2 }}>CRITICAL ALERT</div>
            <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 2 }}>{activeAlert.subject}</div>
            <div style={{ fontSize: 12, color: POA.textSecondary }}>{activeAlert.body}</div>
          </div>
        </div>
      )}

      {/* Header + SOS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: POA.accentSoft, border: `1px solid ${POA.accentDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: POA.accent, flexShrink: 0 }}>
            {orgInitials}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accent }}>{org?.name || "Your Association"}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: POA.textPrimary, lineHeight: 1.2 }}>{timeGreet}, {firstName}.</div>
            <div style={{ fontSize: 12, color: POA.textMuted }}>Badge {me.badge || "—"} · District {me.district || "—"} · {me.standing || "Good"} standing</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <button onClick={() => setEmergency(true)}
            style={{ width: 48, height: 48, borderRadius: 12, background: POA.red, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", animation: "sos-pulse 3s infinite" }}>
            <Phone size={22} color="#fff" />
          </button>
          <div style={{ fontSize: 9, fontWeight: 700, color: POA.red, letterSpacing: ".1em" }}>SOS</div>
          <style>{`@keyframes sos-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,106,100,.5)}60%{box-shadow:0 0 0 8px rgba(239,106,100,0)}}`}</style>
        </div>
      </div>

      {/* Next meeting */}
      {nextMeeting && (
        <div style={{ background: POA.accentSoft, border: `1px solid ${POA.accentDim}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, cursor: "pointer" }}
          onClick={() => setView("m_events")}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent, marginBottom: 4 }}>Next meeting</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>{nextMeeting.title}</div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>{fmtDate(nextMeeting.scheduled_at)}{nextMeeting.location ? ` · ${nextMeeting.location}` : ""}</div>
          </div>
          <button style={{ ...PS.btn, fontSize: 12, flexShrink: 0 }}>View agenda</button>
        </div>
      )}

      {/* Three benefit tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { id: "m_call",     label: "Who to Call",   Icon: Phone,         sub: "Contacts + legal rep" },
          { id: "m_ask",      label: "Ask the POA",   Icon: MessageSquare, sub: "AI from your CBA" },
          { id: "m_benefits", label: "Benefits",      Icon: Shield,        sub: "Your coverage" },
        ].map(({ id, label, Icon, sub }) => (
          <button key={id} onClick={() => setView(id)}
            style={{ ...PS.card, padding: "14px 12px", textAlign: "center", cursor: "pointer", border: `0.5px solid ${POA.hairline}` }}>
            <Icon size={22} color={POA.accent} style={{ marginBottom: 6 }} />
            <div style={{ fontWeight: 700, fontSize: 13, color: POA.textPrimary, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 11, color: POA.textMuted }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Bottom two-col — left: attendance + announcements / right: bigger calendar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 10, marginBottom: 14 }}>

        {/* LEFT — Attendance + Announcements */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Attendance tracker */}
          <Card>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.accent, marginBottom: 8 }}>
              Attendance — Q{Math.ceil((today.getMonth()+1)/3)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: POA.textMuted }}>{attCount} of {attGoal} meetings</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: POA.accent }}>{attPct}%</div>
            </div>
            <div style={{ height: 6, background: POA.track, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${attPct}%`, background: "linear-gradient(90deg, #DBA525, #F0C84A)", borderRadius: 3, boxShadow: "0 0 6px rgba(219,165,37,.4)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3, marginBottom: 6 }}>
              {Array.from({ length: attGoal }, (_, i) => {
                const done = i < attCount;
                return (
                  <div key={i} style={{ background: done ? "linear-gradient(135deg, rgba(219,165,37,.25), rgba(219,165,37,.1))" : POA.accentSoft, border: `0.5px solid ${done ? "rgba(219,165,37,.3)" : POA.hairline}`, borderRadius: 6, padding: "5px 3px", textAlign: "center", boxShadow: done ? "0 0 6px rgba(219,165,37,.1), inset 0 1px 0 rgba(219,165,37,.15)" : "none" }}>
                    <CheckCircle2 size={12} color={done ? POA.accent : POA.accentDim} style={{ filter: done ? "drop-shadow(0 0 3px rgba(219,165,37,.5))" : "none" }} />
                    <div style={{ fontSize: 8, color: done ? POA.accentDim : POA.textMuted, marginTop: 2 }}>Mtg {i+1}</div>
                  </div>
                );
              })}
            </div>
            {attCount >= attGoal
              ? <div style={{ fontSize: 10, color: POA.green, fontWeight: 600 }}>🎉 Quarter complete — raffle entry earned!</div>
              : <div style={{ fontSize: 10, color: POA.textMuted }}>Attend {attGoal - attCount} more → raffle entry</div>
            }
          </Card>

          {/* Announcements — compact */}
          <Card style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.textMuted }}>Announcements</div>
                {newCount > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: POA.accentSoft, color: POA.accent, border: `0.5px solid ${POA.accentDim}` }}>
                    {newCount} new
                  </span>
                )}
              </div>
              <button onClick={() => setView("m_correspondence")}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: POA.accent, fontFamily: "inherit" }}>
                All →
              </button>
            </div>

            {announcements.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={13} color={POA.green} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: POA.textMuted }}>You're all caught up.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {announcements.map(a => (
                  <div key={a.id} style={{ cursor: "pointer", paddingBottom: 8, borderBottom: `0.5px solid ${POA.hairline}` }}
                    onClick={() => setView("m_correspondence")}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: POA.textPrimary, marginBottom: 2, lineHeight: 1.3 }}>{a.subject}</div>
                    <div style={{ fontSize: 11, color: POA.textMuted, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{a.body}</div>
                    <div style={{ fontSize: 10, color: POA.textMuted, marginTop: 3 }}>{fmtDate(a.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — Bigger calendar with events */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.accent }}>
              {MONTHS[today.getMonth()]} {today.getFullYear()}
            </div>
            <button onClick={() => setView("m_events")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: POA.accent, fontFamily: "inherit" }}>
              All events →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
            {DOW.map(d => <div key={d} style={{ fontSize: 8, textAlign: "center", color: POA.textMuted, fontWeight: 700, padding: "2px 0", textTransform: "uppercase" }}>{d}</div>)}
          </div>
          {(() => {
            const dim = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
            const startDow = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
            const cells = [];
            for (let i = 0; i < startDow; i++) cells.push(null);
            for (let d = 1; d <= dim; d++) cells.push(d);
            while (cells.length % 7) cells.push(null);
            return Array.from({ length: cells.length / 7 }, (_, w) => (
              <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
                {cells.slice(w*7, w*7+7).map((d, i) => {
                  const isToday = d === today.getDate();
                  return (
                    <div key={i} style={{ height: 30, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 4, borderRadius: 5, background: isToday ? "linear-gradient(135deg, rgba(219,165,37,.2), rgba(219,165,37,.08))" : "transparent", border: isToday ? "0.5px solid rgba(219,165,37,.3)" : "0.5px solid transparent", boxShadow: isToday ? "0 0 8px rgba(219,165,37,.15)" : "none" }}>
                      <div style={{ fontSize: 10, color: isToday ? POA.accent : POA.textMuted, fontWeight: isToday ? 700 : 400 }}>{d || ""}</div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}

          {/* Upcoming events list below calendar */}
          <div style={{ marginTop: 10, borderTop: `0.5px solid ${POA.hairline}`, paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 6 }}>Upcoming</div>
            {nextMeeting ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: POA.accent, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: POA.textPrimary }}>{nextMeeting.title}</div>
                  <div style={{ fontSize: 10, color: POA.textMuted }}>{fmtDate(nextMeeting.scheduled_at)}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: POA.textMuted }}>No upcoming events.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Video strip */}
      {videos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ ...PS.kicker, margin: 0 }}>From your association</p>
            <button style={{ ...PS.btn, fontSize: 11 }} onClick={() => setView('m_videos')}>
              View all →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {videos.slice(0, 3).map(v => (
              <div key={v.id} style={{ background: 'linear-gradient(160deg, #101828 0%, #0A1020 100%)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setPlayingVideo(playingVideo === v.id ? null : v.id)}>
                {playingVideo === v.id && v.vimeo_url ? (() => {
                  const match = v.vimeo_url.match(/vimeo\.com\/(\d+)/);
                  const embedUrl = match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : null;
                  return embedUrl ? (
                    <div style={{ aspectRatio: '16/9' }}>
                      <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }}
                        allow='autoplay; fullscreen' title={v.title} />
                    </div>
                  ) : null;
                })() : (
                  <div style={{ background: 'rgba(0,0,0,.4)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
                    <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'rgba(219,165,37,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.5)' }}>
                      <Play size={16} color='#06090A' fill='#06090A' style={{ marginLeft: 2 }} />
                    </div>
                  </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: POA.textPrimary, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</div>
                  {v.series_name && <div style={{ fontSize: 11, color: POA.textMuted }}>{v.series_name}</div>}
                  {playingVideo === v.id && (
                    <a href={v.vimeo_url} target='_blank' rel='noreferrer'
                      style={{ fontSize: 11, color: POA.accent, textDecoration: 'none', display: 'block', marginTop: 4 }}
                      onClick={e => e.stopPropagation()}>
                      Watch on Vimeo ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 8 }}>Quick actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {[
          { id: "m_documents",      label: "Documents",     Icon: FileText },
          { id: "m_correspondence", label: "Correspondence", Icon: Mail },
          { id: "m_vote",           label: "VoteLink",      Icon: Vote },
          { id: "m_card",           label: "My card",       Icon: CreditCard },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setView(id)}
            style={{ ...PS.card, padding: "12px 8px", textAlign: "center", cursor: "pointer", border: `0.5px solid ${POA.hairline}` }}>
            <Icon size={18} color={POA.textMuted} style={{ marginBottom: 4 }} />
            <div style={{ fontSize: 10, color: POA.textMuted }}>{label}</div>
          </button>
        ))}
      </div>

      {activity.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 8 }}>
            Your union is working
          </div>
          <Card>
            {activity.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < activity.length - 1 ? `0.5px solid ${POA.hairline}` : "none" }}>
                <CheckCircle2 size={14} color={POA.green} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: POA.textSecondary }}>{a.title}</div>
                <div style={{ fontSize: 11, color: POA.textMuted, flexShrink: 0 }}>{fmtDate(a.created_at)}</div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function WhoToCall({ me }) {
  const [contacts, setContacts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [members, setMembers]   = useState([]);
  const [editing, setEditing]   = useState(null);
  const [adding, setAdding]     = useState(false);
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [catForm, setCatForm]   = useState({ label: "", color: "#DBA525" });
  const [catBusy, setCatBusy]   = useState(false);
  const manage                  = canManage(me?.access);

  const blank = { role: "", name: "", phone: "", email: "", category: "Leadership", sort: 0 };
  const [f, setF] = useState(blank);
  const [requesting, setRequesting] = useState(null); // contact being requested
  const [rf, setRf] = useState({ subject: '', body: '', phone: '' });
  const [reqBusy, setReqBusy] = useState(false);
  const [reqSent, setReqSent] = useState(false);
  const [reqErr, setReqErr] = useState('');

  async function doRequestMeeting(contact) {
    if (!rf.subject.trim()) { setReqErr('Please describe what the meeting is about.'); return; }
    setReqBusy(true); setReqErr('');
    try {
      await supabase.from('correspondence').insert({
        department_id: me.department_id,
        member_id: me.id,
        kind: 'meeting_request',
        subject: rf.subject.trim(),
        body: `${rf.body.trim() ? rf.body.trim() + '\n\n' : ''}Preferred time: ${rf.preferred_time || 'Flexible'}\nPhone: ${rf.phone || 'Not provided'}`,
        status: 'pending',
        assigned_to: contact.member_id || null,
      });
      setReqSent(true);
      setRequesting(null);
      setRf({ subject: '', body: '', phone: me.phone || '', preferred_time: '' });
      setTimeout(() => setReqSent(false), 4000);
    } catch(e) { setReqErr(e.message); }
    finally { setReqBusy(false); }
  }

  async function load() {
    try {
      const [c, cats, mems] = await Promise.all([listContacts(), listContactCategories(), listMembers()]);
      setContacts(c); setCategories(cats); setMembers(mems);
    } catch(e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(c) {
    setF({ role: c.role, name: c.name || "", phone: c.phone || "", email: c.email || "", category: c.category, sort: c.sort || 0, member_id: c.member_id || "" });
    setEditing(c); setAdding(false); setErr("");
  }
  function resetForm() { setEditing(null); setAdding(false); setErr(""); setF(blank); }

  async function doSave() {
    if (!f.role.trim()) { setErr("Role is required."); return; }
    setBusy(true); setErr("");
    try {
      const row = {
        department_id: me.department_id,
        role: f.role.trim(),
        name: f.name.trim() || null,
        phone: f.phone.trim() || null,
        email: f.email.trim() || null,
        category: f.category,
        sort: Number(f.sort) || 0,
        member_id: f.member_id || null,
      };
      if (editing) await updateContact(editing.id, row);
      else await createContact(row);
      resetForm(); await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doRemove(id) {
    if (!confirm("Remove this contact?")) return;
    try { await deactivateContact(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  async function doSaveCat() {
    if (!catForm.label.trim()) return;
    setCatBusy(true);
    try {
      await createContactCategory({
        department_id: me.department_id,
        label: catForm.label.trim(),
        color: catForm.color,
        sort: categories.length + 1,
      });
      setCatForm({ label: "", color: "#DBA525" });
      await load();
    } catch(e) { setErr(e.message); }
    finally { setCatBusy(false); }
  }
  async function doDeleteCat(id) {
    if (!confirm('Remove this category? Contacts in it will still exist but lose their category grouping.')) return;
    try { await deleteContactCategory(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  const CATEGORIES = categories.map(c => c.label);
  const CAT_COLOR = Object.fromEntries(categories.map(c => [c.label, c.color]));

  // Group by category
  const grouped = {};
  (contacts || []).forEach(c => {
    (grouped[c.category] = grouped[c.category] || []).push(c);
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Who to Call</p>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            Your association contacts
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            Direct lines for what matters — tap to call or email.
          </div>
        </div>
        {manage && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={PS.btn} onClick={() => setShowCatMgr(v => !v)}>
              <Settings size={13} /> Categories
            </button>
            <button style={PS.btn} onClick={() => { setAdding(!adding); setEditing(null); }}>
              <Plus size={13} /> Add contact
            </button>
          </div>
        )}
      </div>

      <ErrBox msg={err} />
      {reqSent && (
        <div style={{ background: 'rgba(70,199,147,.1)', border: '0.5px solid rgba(70,199,147,.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: POA.greenText, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color={POA.green} />
          Meeting request sent. You'll hear back in Correspondence.
        </div>
      )}

      {showCatMgr && manage && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>Manage categories</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {categories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${cat.color}15`, border: `1px solid ${cat.color}40`, borderRadius: 8, padding: '5px 10px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: cat.color }}>{cat.label}</span>
                <button onClick={() => doDeleteCat(cat.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: POA.textMuted, fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>New category name</div>
              <input value={catForm.label} onChange={e => setCatForm(f => ({ ...f, label: e.target.value }))}
                style={PS.input} placeholder='e.g. Chaplain, EMS Liaison, Retiree Rep' />
            </div>
            <div>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Color</div>
              <input type='color' value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 44, height: 38, borderRadius: 7, border: `0.5px solid ${POA.hairline}`, background: 'transparent', cursor: 'pointer', padding: 2 }} />
            </div>
            <button style={PS.btnPrimary} disabled={catBusy || !catForm.label.trim()} onClick={doSaveCat}>
              <Plus size={13} /> Add
            </button>
          </div>
        </Card>
      )}

      {/* Add/Edit form */}
      {(adding || editing) && manage && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>{editing ? `Edit — ${editing.role}` : "New contact"}</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Role / title</div>
              <input value={f.role} onChange={e => setF({ ...f, role: e.target.value })}
                style={PS.input} placeholder="e.g. Legal Defense Rep" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Link to member (for meeting requests)</div>
              <select value={f.member_id || ''} onChange={e => setF(x => ({ ...x, member_id: e.target.value }))} style={PS.input}>
                <option value=''>— Not linked to a member —</option>
                {(members || []).map(m => <option key={m.id} value={m.id}>{m.full_name} · {(m.access || []).filter(r => r !== 'Member').join(', ') || 'Member'}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Name</div>
              <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
                style={PS.input} placeholder="Officer full name" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Category</div>
              <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} style={PS.input}>
                {categories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Phone</div>
              <input type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })}
                style={PS.input} placeholder="(817) 555-0100" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Email</div>
              <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })}
                style={PS.input} placeholder="officer@fwpoa.org" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doSave}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add contact"}
            </button>
            <button style={PS.btn} onClick={resetForm}>Cancel</button>
            {editing && (
              <button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }}
                onClick={() => { doRemove(editing.id); resetForm(); }}>
                Remove
              </button>
            )}
          </div>
        </Card>
      )}

      {!contacts ? <Spinner /> : contacts.length === 0 ? (
        <Card>
          <div style={{ color: POA.textMuted, fontSize: 13.5, textAlign: "center", padding: "16px 0" }}>
            {manage ? "No contacts yet — add your first contact above." : "No contacts have been added yet. Check back soon."}
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, catContacts]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: CAT_COLOR[cat] || POA.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ height: 1, width: 16, background: CAT_COLOR[cat] || POA.textMuted, opacity: .5 }} />
              {cat}
              <div style={{ height: 1, flex: 1, background: POA.hairline }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {catContacts.map(c => (
                <div key={c.id} style={{ background: "linear-gradient(135deg, #0E1630 0%, #0A1020 100%)", border: `0.5px solid ${POA.hairline2}`, borderRadius: 12, padding: "14px 15px", boxShadow: "0 2px 12px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.04)", position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Category color top bar */}
                  <div style={{ position: "absolute", top: 0, left: 16, right: 16, height: 2, background: CAT_COLOR[cat] || POA.accent, borderRadius: "0 0 3px 3px", opacity: .6 }} />
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: CAT_COLOR[cat] || POA.accent, marginTop: 4 }}>{c.role}</div>
                  {c.name && <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{c.name}</div>}
                  {!c.name && <div style={{ fontSize: 13, color: POA.textMuted, fontStyle: "italic" }}>Name not set</div>}
                  {c.phone && <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>{c.phone}</div>}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {c.phone ? (
                      <a href={`tel:${c.phone.replace(/\D/g, "")}`}
                        style={{ ...PS.btnPrimary, fontSize: 11, padding: "5px 10px", textDecoration: "none", flex: 1, justifyContent: "center" }}>
                        <Phone size={12} /> Call
                      </a>
                    ) : (
                      <button style={{ ...PS.btn, fontSize: 11, padding: "5px 10px", flex: 1, justifyContent: "center", opacity: .4 }} disabled>
                        <Phone size={12} /> No number
                      </button>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`}
                        style={{ ...PS.btn, fontSize: 11, padding: "5px 10px", textDecoration: "none", justifyContent: "center" }}>
                        <Mail size={12} />
                      </a>
                    )}
                    {manage && (
                      <button style={{ ...PS.btn, fontSize: 11, padding: "5px 8px" }}
                        onClick={() => startEdit(c)}>
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                  {(() => {
                    const linkedMember = c.member_id ? (members || []).find(m => m.id === c.member_id) : null;
                    if (!linkedMember?.availability_note) return null;
                    let avail = null;
                    try { avail = JSON.parse(linkedMember.availability_note); } catch { return null; }
                    const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                    const fmt = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr-12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`; };
                    const parts = DAYS.filter(d => avail.schedule?.[d]?.enabled)
                      .map(d => {
                        const slots = avail.schedule[d].slots || [{ start: avail.schedule[d].start, end: avail.schedule[d].end }];
                        return `${d} ${slots.map(s => `${fmt(s.start)}–${fmt(s.end)}`).join(', ')}`;
                      });
                    const blocked = (avail.blocked || []).filter(entry => {
                      const end = entry.includes('/') ? entry.split('/')[1] : entry;
                      return end >= new Date().toISOString().split('T')[0];
                    });
                    if (parts.length === 0 && blocked.length === 0) return null;
                    return (
                      <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 8, padding: '8px 12px', background: 'rgba(70,199,147,.06)', border: '0.5px solid rgba(70,199,147,.2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: POA.green, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Availability</div>
                        {parts.length > 0 && <div style={{ marginBottom: 3 }}>{parts.join(' · ')}</div>}
                        {blocked.length > 0 && (
                          <div style={{ color: POA.red, fontSize: 11 }}>
                            Unavailable: {blocked.map(entry => {
                              const [start, end] = entry.includes('/') ? entry.split('/') : [entry, null];
                              const fmtD = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                              return end ? `${fmtD(start)}–${fmtD(end)}` : fmtD(start);
                            }).join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <button style={{ ...PS.btn, width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 12 }}
                    onClick={() => { setRequesting(c); setRf({ subject: '', body: '', phone: me.phone || '' }); setReqErr(''); }}>
                    <CalendarPlus size={12} /> Request a meeting
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {!manage && (
        <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic", textAlign: "center" }}>
          Contact details are managed by your board. Flag missing info in Correspondence.
        </div>
      )}

      {requesting && (
        <div onClick={() => setRequesting(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(135deg, #0E1630, #0A1020)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 480, width: '100%', padding: '20px 22px', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent }}>Request a meeting</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: POA.textPrimary, marginTop: 2 }}>{requesting.name || requesting.role}</div>
              </div>
              <button style={{ ...PS.btn, padding: '5px 10px' }} onClick={() => setRequesting(null)}><X size={13} /></button>
            </div>
            {reqErr && <ErrBox msg={reqErr} />}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>What is this about?</div>
              <input value={rf.subject} onChange={e => setRf(x => ({ ...x, subject: e.target.value }))}
                style={PS.input} placeholder='e.g. Injury claim concern, contract question, benefit issue' />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Details (optional)</div>
              <textarea value={rf.body} onChange={e => setRf(x => ({ ...x, body: e.target.value }))}
                style={{ ...PS.textarea, minHeight: 70 }} placeholder='Any additional context that would help…' />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Your phone number</div>
              <input value={rf.phone} onChange={e => setRf(x => ({ ...x, phone: e.target.value }))}
                style={PS.input} placeholder='(817) 555-0100' type='tel' />
            </div>
            {(() => {
              const linkedMember = requesting?.member_id ? (members || []).find(m => m.id === requesting.member_id) : null;
              if (!linkedMember?.availability_note) return null;
              let avail = null;
              try { avail = JSON.parse(linkedMember.availability_note); } catch { return null; }
              const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
              const fmt = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr-12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`; };
              const parts = DAYS.filter(d => avail.schedule?.[d]?.enabled)
                .map(d => {
                  const slots = avail.schedule[d].slots || [];
                  return `${d}: ${slots.map(s => `${fmt(s.start)}–${fmt(s.end)}`).join(', ')}`;
                });
              const today = new Date().toISOString().split('T')[0];
              const blocked = (avail.blocked || []).filter(entry => {
                const end = entry.includes('/') ? entry.split('/')[1] : entry;
                return end >= today;
              }).map(entry => {
                const [start, end] = entry.includes('/') ? entry.split('/') : [entry, null];
                const fmtD = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return end ? `${fmtD(start)}–${fmtD(end)}` : fmtD(start);
              });
              if (parts.length === 0 && blocked.length === 0) return null;
              return (
                <div style={{ background: 'rgba(70,199,147,.06)', border: '0.5px solid rgba(70,199,147,.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.green, marginBottom: 6 }}>
                    {requesting.name || requesting.role} availability
                  </div>
                  {parts.map((p, i) => (
                    <div key={i} style={{ fontSize: 12, color: POA.textSecondary, marginBottom: 2 }}>· {p}</div>
                  ))}
                  {blocked.length > 0 && (
                    <div style={{ fontSize: 11, color: POA.red, marginTop: 4 }}>
                      Unavailable: {blocked.join(', ')}
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Preferred date/time</div>
              <input value={rf.preferred_time || ''} onChange={e => setRf(x => ({ ...x, preferred_time: e.target.value }))}
                style={PS.input} placeholder='e.g. Thursday after 6pm, weekday mornings' />
            </div>
            <button style={{ ...PS.btnPrimary, width: '100%' }} disabled={reqBusy || !rf.subject.trim()} onClick={() => doRequestMeeting(requesting)}>
              {reqBusy ? 'Sending…' : 'Send meeting request'}
            </button>
            <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>
              Your request goes directly to {requesting.name || 'the officer'}. You'll hear back in Correspondence.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AskB4C({ me, org }) {
  const [tab, setTab]       = useState("ai");
  const [q, setQ]           = useState("");
  const [msgs, setMsgs]     = useState([]);
  const [busy, setBusy]     = useState(false);
  const [bq, setBq]         = useState("");
  const [anon, setAnon]     = useState(false);
  const [bqBusy, setBqBusy] = useState(false);
  const [bqSent, setBqSent] = useState(false);
  const [bqErr, setBqErr]   = useState("");
  const [faqs, setFaqs]     = useState([]);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    listFAQs().then(setFaqs).catch(() => null);
  }, []);

  async function ask() {
    if (!q.trim()) return;
    const question = q.trim();
    setQ("");
    setMsgs(m => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const docs = await getDocsForAI();
      const docContext = docs.length > 0
        ? `\n\nASSOCIATION DOCUMENTS (answer from these — cite the document name):\n${docs.map(d => `[${d.name} — ${d.category}]\n${d.extracted_text || "(no text extracted yet)"}`).join("\n\n")}`
        : "";
      const sys = `You are Ask B4C, an AI assistant for the ${org?.name || "police officers' association"}. Answer member questions using ONLY the association's own documents provided below. If the answer isn't in the documents, say so clearly and suggest the member ask the board directly — never make up information. Always cite which document your answer comes from.${docContext}`;
      const res = await fetch("/api/ask-b4c", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, system: sys }),
      });
      const data = await res.json().catch(() => ({}));
      setMsgs(m => [...m, { role: "assistant", text: data.answer || "AI isn't configured yet — add ANTHROPIC_API_KEY in Vercel to enable grounded Q&A." }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", text: "Couldn't reach the AI endpoint. Check that ANTHROPIC_API_KEY is set in Vercel." }]);
    } finally { setBusy(false); }
  }

  async function doSubmitBoardQuestion() {
    if (!bq.trim()) { setBqErr("Please enter your question."); return; }
    setBqBusy(true); setBqErr("");
    try {
      await submitBoardQuestion(me.department_id, bq.trim(), anon, me.id);
      setBqSent(true); setBq(""); setAnon(false);
    } catch(e) { setBqErr(e.message); }
    finally { setBqBusy(false); }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const TABS = [
    { id: "ai",    label: "Ask B4C AI" },
    { id: "board", label: "Ask the Board" },
    { id: "faq",   label: `FAQ${faqs.length ? ` (${faqs.length})` : ""}` },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <PageTitle sub="Instant AI answers + direct questions to your board">Ask the POA</PageTitle>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#06090A" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}`, fontWeight: tab === t.id ? 700 : 500 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── AI CHAT ── */}
      {tab === "ai" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
            {msgs.length === 0 && (
              <Card style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.7 }}>
                  Ask anything about your CBA, bylaws, benefits, or member handbook. B4C answers from your association's own uploaded documents — never fabricates. If your question isn't covered in the documents, use <b style={{ color: POA.accent }}>Ask the Board</b> tab to send it directly.
                </div>
              </Card>
            )}
            {msgs.length === 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[
                  "What does our CBA say about overtime?",
                  "How do I file a grievance?",
                  "What benefits am I entitled to?",
                  "What's the process for legal defense?",
                ].map(suggestion => (
                  <button key={suggestion} onClick={() => { setQ(suggestion); }}
                    style={{ ...PS.card, padding: "10px 12px", textAlign: "left", cursor: "pointer", fontSize: 12.5, color: POA.textSecondary, border: `0.5px solid ${POA.hairline2}` }}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", background: m.role === "user"
                  ? "linear-gradient(135deg, rgba(219,165,37,.2), rgba(219,165,37,.08))"
                  : "linear-gradient(135deg, #0E1630, #0A1020)",
                  border: `0.5px solid ${m.role === "user" ? "rgba(219,165,37,.3)" : POA.hairline2}`,
                  borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  padding: "10px 14px", fontSize: 13.5, color: POA.textPrimary, lineHeight: 1.65,
                  boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}>
                  {m.text}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: "flex", gap: 8, padding: "10px 14px", color: POA.textMuted, fontSize: 13 }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Searching your documents…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !busy && ask()}
              placeholder="Ask about your CBA, benefits, bylaws…"
              style={{ ...PS.input, flex: 1 }} />
            <button onClick={ask} disabled={!q.trim() || busy}
              style={{ ...PS.btnPrimary, padding: "10px 14px" }}>
              <Send size={15} />
            </button>
          </div>
        </>
      )}

      {/* ── ASK THE BOARD ── */}
      {tab === "board" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7, marginBottom: 14 }}>
              Have a question the AI can't answer? Something sensitive about your contract, a grievance, or anything you want your board to address directly? Ask here. Your board will respond — you can choose to stay anonymous.
            </div>

            {bqSent ? (
              <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontWeight: 700, color: POA.green, marginBottom: 4 }}>✓ Question submitted</div>
                <div style={{ fontSize: 13, color: POA.textSecondary }}>
                  {anon ? "Your question was submitted anonymously. " : ""}
                  Your board will review and respond. Check your Correspondence inbox for their reply.
                </div>
                <button style={{ ...PS.btn, marginTop: 12 }} onClick={() => setBqSent(false)}>
                  Ask another question
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Your question</div>
                  <textarea value={bq} onChange={e => setBq(e.target.value)}
                    placeholder="What do you want to ask your board? Be as specific as you'd like — your question goes directly to them."
                    style={{ ...PS.textarea, minHeight: 100 }} />
                </div>

                {/* Anonymous toggle */}
                <div style={{ background: anon ? "rgba(219,165,37,.08)" : "rgba(255,255,255,.03)", border: `1px solid ${anon ? "rgba(219,165,37,.25)" : POA.hairline}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, cursor: "pointer" }}
                  onClick={() => setAnon(v => !v)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${anon ? POA.accent : POA.hairline2}`, background: anon ? POA.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: ".15s" }}>
                      {anon && <CheckCircle2 size={12} color="#06090A" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: anon ? POA.accent : POA.textPrimary }}>
                        Ask anonymously
                      </div>
                      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 1 }}>
                        {anon
                          ? "Your board will see the question but not who sent it. Truly anonymous — no ID stored."
                          : "Your name will be attached to this question so the board can follow up with you directly."}
                      </div>
                    </div>
                  </div>
                </div>

                {bqErr && <ErrBox msg={bqErr} />}
                <button style={{ ...PS.btnPrimary, width: "100%" }}
                  disabled={bqBusy || !bq.trim()} onClick={doSubmitBoardQuestion}>
                  <Send size={14} /> {bqBusy ? "Submitting…" : anon ? "Submit anonymously" : "Submit question"}
                </button>
                <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, textAlign: "center", fontStyle: "italic" }}>
                  {anon ? "Your identity is not stored. The board cannot trace this question back to you." : "Your board will reply in your Correspondence inbox."}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── FAQ ── */}
      {tab === "faq" && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {faqs.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>❓</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary, marginBottom: 4 }}>No FAQs yet</div>
                <div style={{ fontSize: 13, color: POA.textMuted }}>
                  When your board answers a question and marks it as a FAQ, it appears here for all members to read.
                </div>
              </div>
            </Card>
          ) : faqs.map(faq => (
            <Card key={faq.id} style={{ marginBottom: 10, cursor: "pointer" }}
              onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ fontSize: 18, flexShrink: 0 }}>❓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{faq.subject}</div>
                  {expandedFaq === faq.id && faq.body && (
                    <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65, marginTop: 8, borderTop: `0.5px solid ${POA.hairline}`, paddingTop: 8 }}>
                      {faq.body}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 6 }}>{fmtDate(faq.created_at)}</div>
                </div>
                <div style={{ color: POA.textMuted, fontSize: 16, flexShrink: 0 }}>
                  {expandedFaq === faq.id ? "▲" : "▼"}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MyCard({ me, org }) {
  const [cardSettings, setCardSettings] = useState({});
  const [showBack, setShowBack] = useState(false);
  useEffect(() => {
    supabase.from('org_settings')
      .select('*')
      .eq('department_id', me.department_id)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(r => { map[r.key] = r.value; });
        setCardSettings(map);
      });
  }, [me.department_id]);

  const orgName      = cardSettings.org_name || org?.name || 'Association';
  const orgInitials  = orgName.split(' ').map(w => w[0]).slice(0,3).join('').toUpperCase();
  const shortName    = cardSettings.org_short_name || orgInitials;
  const logoUrl      = cardSettings.org_logo_url || null;
  const role         = (me.access || ["Member"]).filter(r => r !== "Member")[0] || "Member";
  const standing     = me.standing || "Good";
  const goodStanding = standing === "Good" || standing === "Active";
  const standingColor  = goodStanding ? POA.accent : POA.red;
  const standingBg     = goodStanding ? "rgba(219,165,37,.12)" : "rgba(239,106,100,.12)";
  const standingBorder = goodStanding ? "rgba(219,165,37,.25)" : "rgba(239,106,100,.25)";
  return (
    <div>
      <PageTitle sub="Your digital membership card">My Card</PageTitle>
      {!showBack && (
      <div style={{ position: "relative", background: "linear-gradient(160deg, #111D35 0%, #0A1020 60%, #060911 100%)", border: "1px solid rgba(219,165,37,.35)", borderRadius: 20, padding: "28px 26px", marginBottom: 12, boxShadow: "0 0 60px rgba(219,165,37,.08), 0 20px 60px rgba(0,0,0,.7), 0 4px 12px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.06)", overflow: "hidden", minHeight: 220 }}>

        {/* Ambient glow top-right */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(219,165,37,.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        {/* Ambient glow bottom-left */}
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(219,165,37,.04) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Top gold line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, rgba(219,165,37,.7) 40%, rgba(240,200,74,.9) 50%, rgba(219,165,37,.7) 60%, transparent 100%)", borderRadius: "20px 20px 0 0" }} />

        {/* Main content — left side */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            {/* Header — logo + org */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="logo" style={{ height: 32, width: 32, objectFit: "contain", borderRadius: 6 }} onError={e => { e.target.style.display = "none"; }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 7, background: "linear-gradient(135deg, rgba(219,165,37,.2), rgba(219,165,37,.06))", border: "1px solid rgba(219,165,37,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700, color: POA.accent, flexShrink: 0, boxShadow: "0 0 10px rgba(219,165,37,.1)" }}>
                  {orgInitials}
                </div>
              )}
              <div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: ".1em", background: "linear-gradient(135deg, #F0C84A 0%, #DBA525 60%, #A87A18 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 6px rgba(219,165,37,.2))" }}>
                  {shortName}
                </div>
                <div style={{ fontSize: 10, color: POA.textMuted, letterSpacing: ".04em" }}>{orgName}</div>
              </div>
            </div>

            {/* Member name */}
            <div style={{ fontWeight: 700, fontSize: 22, color: "#F5F0E8", marginBottom: 5, letterSpacing: ".01em", textShadow: "0 1px 8px rgba(0,0,0,.4)" }}>
              {me.full_name}
            </div>

            {/* Badge + district + role */}
            <div style={{ fontSize: 12.5, color: POA.textSecondary, marginBottom: 14, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              {me.badge && <span>Badge {me.badge}</span>}
              {me.district && <><span style={{ color: "rgba(255,255,255,.2)" }}>·</span><span>District {me.district}</span></>}
              <span style={{ color: "rgba(255,255,255,.2)" }}>·</span>
              <span>{role}</span>
            </div>

            {/* Dues / member since */}
            {(me.dues_paid_through || me.member_since) && (
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                {me.dues_paid_through && (
                  <div>
                    <div style={{ fontSize: 8, color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 3 }}>Active through</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: new Date(me.dues_paid_through) < new Date() ? POA.red : POA.green }}>
                      {new Date(me.dues_paid_through).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                    </div>
                  </div>
                )}
                {me.member_since && (
                  <div>
                    <div style={{ fontSize: 8, color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 3 }}>Member since</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: POA.textSecondary }}>
                      {new Date(me.member_since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standing */}
            <div>
              <div style={{ fontSize: 8, color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 5 }}>Standing</div>
              <div style={{ fontWeight: 700, fontSize: 13, background: standingBg, border: `0.5px solid ${standingBorder}`, color: standingColor, borderRadius: 7, padding: "4px 14px", display: "inline-block", boxShadow: `0 0 12px ${standingColor}25, inset 0 1px 0 rgba(255,255,255,.06)` }}>
                {standing}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — QR code */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4 }}>
            <div style={{ background: "#fff", padding: 10, borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.1)", position: "relative" }}>
              <QRCodeCanvas value={`${window.location.origin}/verify.html?m=${me.id}`} size={90} />
            </div>
            <div style={{ fontSize: 9, color: POA.textMuted, letterSpacing: ".06em", textTransform: "uppercase" }}>Scan to verify</div>
            <div style={{ fontSize: 9, color: "rgba(219,165,37,.5)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: ".08em" }}>B4C · UNION</div>
          </div>
        </div>

        {/* Bottom gold line */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg, transparent 0%, rgba(219,165,37,.4) 40%, rgba(219,165,37,.6) 50%, rgba(219,165,37,.4) 60%, transparent 100%)" }} />
      </div>
      )}

      <button style={{ ...PS.btn, width: '100%', justifyContent: 'center', marginBottom: 12 }}
        onClick={() => setShowBack(v => !v)}>
        {showBack ? '← Show front' : 'Show back →'}
      </button>

      {showBack && (
        <div style={{ position: 'relative', background: 'linear-gradient(160deg, #111D35 0%, #0A1020 60%, #060911 100%)', border: '1px solid rgba(219,165,37,.3)', borderRadius: 20, padding: '28px 26px', marginBottom: 12, boxShadow: '0 0 40px rgba(219,165,37,.06), 0 8px 32px rgba(0,0,0,.6)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(219,165,37,.6), transparent)', borderRadius: '20px 20px 0 0' }} />
          <SectionTitle>Member rights</SectionTitle>
          <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.75, marginBottom: 16 }}>
            As a member of {orgName}, you have the right to legal representation before any investigative interview. Contact your Legal Defense Rep immediately — before speaking to any investigator.
          </div>
          <div style={{ background: 'rgba(219,165,37,.06)', border: '0.5px solid rgba(219,165,37,.2)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: POA.accent, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>Before any interview</div>
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65, fontStyle: 'italic' }}>
              "I am invoking my right to have association representation present before answering any questions."
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, lineHeight: 1.6 }}>
            This card is issued by {orgName}. For questions about your membership or benefits, contact your board through the B4C app.
          </div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(219,165,37,.4), transparent)' }} />
        </div>
      )}

      <div style={{ fontSize: 11.5, color: POA.textMuted, textAlign: "center", fontStyle: "italic" }}>Show this screen to verify membership at association events.</div>
    </div>
  );
}

function MemberEvents({ me, setView }) {
  const today = new Date();
  const [cur, setCur]         = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [events, setEvents]   = useState(null);
  const [funding, setFunding] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showPast, setShowPast] = useState(false);

  async function load() {
    try {
      const [evts, fund] = await Promise.all([
        supabase.from("events")
          .select("*")
          .neq("visibility", "board")
          .neq("status", "archived")
          .order("event_date", { ascending: true })
          .then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from("funding_events")
          .select("*")
          .order("date", { ascending: true })
          .then(({ data, error }) => { if (error) throw error; return data || []; }),
      ]);
      setEvents(evts);
      setFunding(fund);
    } catch(e) {
      setEvents([]);
    }
  }
  useEffect(() => { load(); }, []);

  // Normalize both sources into one shape
  const allEvents = [
    ...(events || []).map(e => ({
      id: e.id,
      title: e.title,
      date: e.event_date,
      time: e.event_time,
      location: e.location,
      kind: e.kind,
      description: e.description || e.notes,
      link_url: e.link_url,
      done: e.done,
      source: "event",
      color: KIND_COLOR[e.kind] || POA.accent,
    })),
    ...funding.map(f => ({
      id: f.id,
      title: f.title,
      date: f.date,
      time: null,
      location: null,
      kind: "fundraising",
      description: f.description,
      link_url: f.link_url,
      done: false,
      source: "funding",
      color: f.color || POA.amber,
    })),
  ].sort((a, b) => a.date > b.date ? 1 : -1);

  const upcoming = allEvents.filter(e => !e.done && e.date >= today.toISOString().split("T")[0]);
  const past     = allEvents.filter(e => e.done || e.date < today.toISOString().split("T")[0]);

  // Calendar grid
  const dim      = new Date(cur.y, cur.m + 1, 0).getDate();
  const startDow = new Date(cur.y, cur.m, 1).getDay();
  const cells    = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const byDay = {};
  allEvents.forEach(e => {
    if (!e.date) return;
    const ed = new Date(e.date + "T12:00:00");
    if (ed.getFullYear() === cur.y && ed.getMonth() === cur.m) {
      const d = ed.getDate();
      (byDay[d] = byDay[d] || []).push(e);
    }
  });

  const isToday = d => d && cur.y === today.getFullYear() && cur.m === today.getMonth() && d === today.getDate();

  const KIND_LABEL = {
    meeting: "Meeting", board: "Board Meeting", training: "Training",
    community: "Community", general: "General", other: "Event",
    fundraising: "Fundraiser",
  };

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ ...PS.btn, marginBottom: 16 }}>
          <ArrowLeft size={13} /> Events
        </button>
        <div style={{ ...PS.card, padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: selected.color, marginTop: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: selected.color, marginBottom: 4 }}>
                {KIND_LABEL[selected.kind] || "Event"}
              </div>
              <h2 style={{ fontFamily: "inherit", fontSize: 22, fontWeight: 700, color: POA.textPrimary, margin: "0 0 8px" }}>
                {selected.title}
              </h2>
              <div style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.6 }}>
                {selected.date && new Date(selected.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {selected.time ? ` · ${selected.time.slice(0,5)}` : ""}
              </div>
              {selected.location && (
                <div style={{ fontSize: 13.5, color: POA.textMuted, marginTop: 4 }}>
                  📍 {selected.location}
                </div>
              )}
            </div>
          </div>

          {selected.description && (
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7, marginBottom: 16, padding: "14px 16px", background: "rgba(0,0,0,.2)", borderRadius: 10, border: `0.5px solid ${POA.hairline}` }}>
              {selected.description}
            </div>
          )}

          {selected.link_url && (
            <a href={selected.link_url} target="_blank" rel="noreferrer"
              style={{ ...PS.btnPrimary, textDecoration: "none", display: "inline-flex", marginBottom: 12 }}>
              Register / Learn more ↗
            </a>
          )}

          <div style={{ fontSize: 12, color: POA.textMuted, fontStyle: "italic" }}>
            {selected.source === "funding" ? "This is a fundraising event." : "This event is organized by your association."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ ...PS.kicker, marginBottom: 4 }}>Events</p>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            {MONTHS[cur.m]} {cur.y}
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 2 }}>
            Meetings, community events, and everything in between.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={PS.btn} onClick={() => setCur(c => c.m === 0 ? { y: c.y-1, m: 11 } : { ...c, m: c.m-1 })}>‹</button>
          <button style={PS.btn} onClick={() => setCur({ y: today.getFullYear(), m: today.getMonth() })}>Today</button>
          <button style={PS.btn} onClick={() => setCur(c => c.m === 11 ? { y: c.y+1, m: 0 } : { ...c, m: c.m+1 })}>›</button>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ ...PS.card, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 8 }}>
          {DOW.map(d => <div key={d} style={{ fontSize: 9, fontWeight: 700, textAlign: "center", color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".06em", padding: "3px 0" }}>{d}</div>)}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
            {cells.slice(w*7, w*7+7).map((d, i) => {
              const dayEvents = d ? (byDay[d] || []) : [];
              return (
                <div key={i} style={{ minHeight: 70, background: isToday(d) ? "linear-gradient(135deg, rgba(219,165,37,.15), rgba(219,165,37,.05))" : "transparent", border: `0.5px solid ${isToday(d) ? "rgba(219,165,37,.3)" : POA.hairline}`, borderRadius: 8, padding: "4px 5px", boxShadow: isToday(d) ? "0 0 8px rgba(219,165,37,.1)" : "none" }}>
                  {d && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: isToday(d) ? 700 : 400, color: isToday(d) ? POA.accent : POA.textMuted, marginBottom: 3 }}>{d}</div>
                      {dayEvents.map(e => (
                        <button key={e.id} onClick={() => setSelected(e)}
                          style={{ display: "block", width: "100%", textAlign: "left", background: e.color, border: "none", borderRadius: 4, padding: "2px 5px", fontSize: 9.5, fontWeight: 600, color: "#fff", marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", boxShadow: `0 0 6px ${e.color}40` }}>
                          {e.time ? e.time.slice(0,5) + " " : ""}{e.title}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Meeting", color: KIND_COLOR.meeting || POA.accent },
          { label: "Community", color: KIND_COLOR.community || "#46C793" },
          { label: "Fundraiser", color: POA.amber },
          { label: "Training", color: KIND_COLOR.training || "#46C793" },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: POA.textMuted }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Upcoming list */}
      <p style={{ ...PS.kicker, marginBottom: 10 }}>Upcoming</p>
      {!events ? <Spinner /> : upcoming.length === 0 ? (
        <div style={{ ...PS.card, padding: "16px", color: POA.textMuted, fontSize: 13.5 }}>
          No upcoming events scheduled. Check back soon.
        </div>
      ) : upcoming.map(e => (
        <div key={e.id} style={{ ...PS.card, padding: "13px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
          onClick={() => setSelected(e)}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.color, flexShrink: 0, boxShadow: `0 0 6px ${e.color}60` }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{e.title}</div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
              {new Date(e.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              {e.time ? ` · ${e.time.slice(0,5)}` : ""}
              {e.location ? ` · ${e.location}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: `${e.color}18`, color: e.color, border: `0.5px solid ${e.color}40` }}>
              {KIND_LABEL[e.kind] || "Event"}
            </span>
            {e.link_url && (
              <a href={e.link_url} target="_blank" rel="noreferrer"
                onClick={ev => ev.stopPropagation()}
                style={{ ...PS.btnPrimary, fontSize: 11, padding: "4px 10px", textDecoration: "none" }}>
                Register ↗
              </a>
            )}
            <ChevronRight size={14} color={POA.textMuted} />
          </div>
        </div>
      ))}

      {/* Past events — collapsible */}
      {past.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div onClick={() => setShowPast(v => !v)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: showPast ? 10 : 0 }}>
            <p style={{ ...PS.kicker, margin: 0 }}>Past events ({past.length})</p>
            {showPast ? <ChevronUp size={15} color={POA.textMuted} /> : <ChevronDown size={15} color={POA.textMuted} />}
          </div>
          {showPast && past.slice(0,20).map(e => (
            <div key={e.id} style={{ ...PS.card, padding: "11px 14px", marginBottom: 6, opacity: .65, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
              onClick={() => setSelected(e)}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: POA.textPrimary }}>{e.title}</div>
                <div style={{ fontSize: 11, color: POA.textMuted }}>
                  {new Date(e.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   BOARD SCREENS
   ================================================================ */
function BoardDash({ me, org, setView }) {
  const today = new Date();
  const [meetings, setMeetings]         = useState([]);
  const [members, setMembers]           = useState([]);
  const [causes, setCauses]             = useState([]);
  const [actions, setActions]           = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [onCall, setOnCall]             = useState([]);
  const [calCur, setCalCur]             = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [events, setEvents]             = useState([]);
  const [overdueContacts, setOverdueContacts] = useState([]);

  useEffect(() => {
    supabase.from('cause_contacts')
      .select('name, organization, last_contact_date, causes!cause_contacts_cause_id_fkey(name)')
      .eq('department_id', me.department_id)
      .eq('active', true)
      .then(({ data }) => {
        const overdue = (data || []).filter(c => {
          if (!c.last_contact_date) return true;
          const days = Math.floor((new Date() - new Date(c.last_contact_date)) / (1000 * 60 * 60 * 24));
          return days > 60;
        });
        setOverdueContacts(overdue);
      });
  }, [me.department_id]);

  useEffect(() => {
    Promise.all([
      listMeetings(),
      listMembers(),
      listCauses(),
      myActionItems(me.id),
      listAnnouncements(),
      getOnCall(),
      supabase.from("events")
        .select("id, title, event_date, kind")
        .eq("department_id", me.department_id)
        .neq("status", "archived")
        .then(({ data }) => data || []),
    ]).then(([mtgs, mems, cau, acts, ann, oc, evts]) => {
      setMeetings(mtgs);
      setMembers(mems);
      setCauses(cau);
      setActions(acts);
      setAnnouncements(ann);
      setOnCall(oc);
      setEvents(evts);
    }).catch(() => null);
  }, [me.id]);

  const activeMembers  = members.filter(m => m.status === "active");
  const goodStanding   = members.filter(m => m.standing === "Good" || m.standing === "Active");
  const standingPct    = activeMembers.length ? Math.round((goodStanding.length / activeMembers.length) * 100) : 0;
  const activeCauses   = causes.filter(c => c.status === "active");
  const openActions    = actions.filter(a => a.status === "open");
  const overdueActions = openActions.filter(a => a.due_date && new Date(a.due_date) < today);
  const nextMeeting    = meetings.find(m => m.status === "open");
  const minutesFiled   = meetings.filter(m => m.minutes_body).length;
  const orgInitials    = (org?.name || "POA").split(" ").map(w => w[0]).slice(0,3).join("").toUpperCase();

  // Calendar
  const dim      = new Date(calCur.y, calCur.m + 1, 0).getDate();
  const startDow = new Date(calCur.y, calCur.m, 1).getDay();
  const cells    = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const byDay = {};
  events.forEach(e => {
    if (!e.event_date) return;
    const ed = new Date(e.event_date + "T12:00:00");
    if (ed.getFullYear() === calCur.y && ed.getMonth() === calCur.m) {
      (byDay[ed.getDate()] = byDay[ed.getDate()] || []).push(e);
    }
  });
  const isToday = d => d && calCur.y === today.getFullYear() && calCur.m === today.getMonth() && d === today.getDate();

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{ width: 50, height: 50, borderRadius: 12, background: "linear-gradient(135deg, rgba(219,165,37,.2), rgba(219,165,37,.05))", border: "1px solid rgba(219,165,37,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 700, color: POA.accent, flexShrink: 0, boxShadow: "0 0 16px rgba(219,165,37,.1)" }}>
          {orgInitials}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accent }}>Board · {org?.name || "Your Association"}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: POA.textPrimary, lineHeight: 1.2 }}>
            Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"}, {me.full_name?.split(" ")[0]}.
          </div>
          <div style={{ fontSize: 12, color: POA.textMuted }}>Association oversight at a glance.</div>
        </div>
      </div>

      {/* Health strip */}
      <div style={{ background: "linear-gradient(135deg, rgba(219,165,37,.08), rgba(219,165,37,.02))", border: "0.5px solid rgba(219,165,37,.2)", borderRadius: 13, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 18, boxShadow: "0 0 24px rgba(219,165,37,.05), inset 0 1px 0 rgba(219,165,37,.08)" }}>
        <div style={{ position: "relative", width: 54, height: 54, flexShrink: 0 }}>
          <svg width="54" height="54" viewBox="0 0 54 54" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="27" cy="27" r="21" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="5" />
            <circle cx="27" cy="27" r="21" fill="none" stroke="url(#gold-grad-dash)" strokeWidth="5"
              strokeDasharray={`${(standingPct / 100) * 132} 132`} strokeLinecap="round" />
            <defs>
              <linearGradient id="gold-grad-dash" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F0C84A" />
                <stop offset="100%" stopColor="#DBA525" />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: POA.textPrimary }}>{standingPct}%</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accent, marginBottom: 4 }}>Association Health</div>
          <div style={{ fontSize: 13, color: POA.textSecondary, lineHeight: 1.55 }}>
            {goodStanding.length} of {activeMembers.length} in good standing · {minutesFiled} minutes filed · {activeCauses.length} active cause{activeCauses.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 16 }}>
        {[
          { n: activeMembers.length, label: "Active members",    color: POA.accent },
          { n: `${standingPct}%`,    label: "Good standing",     color: POA.green },
          { n: openActions.length,   label: "Open action items", color: POA.amber },
          { n: activeCauses.length,  label: "Active causes",     color: POA.accentBright },
        ].map(s => (
          <div key={s.label} style={{ background: "linear-gradient(160deg, #101828 0%, #0A1020 100%)", border: "0.5px solid rgba(255,255,255,.10)", borderRadius: 11, padding: "13px 14px", boxShadow: "0 2px 12px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)" }}>
            <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 26, color: s.color, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 10, color: POA.textMuted, marginTop: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* On-call strip */}
      {onCall.length > 0 && (
        <div style={{ background: "rgba(239,106,100,.06)", border: "0.5px solid rgba(239,106,100,.2)", borderRadius: 12, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.red, flexShrink: 0 }}>On Call</div>
          {onCall.map((oc, i) => (
            <div key={oc.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 12, color: POA.textSecondary }}>
                <span style={{ fontSize: 10, color: POA.textMuted, marginRight: 4 }}>{i === 0 ? "PRIMARY" : "BACKUP"}</span>
                <strong style={{ color: POA.textPrimary }}>{oc.name}</strong>
                {oc.phone && <span style={{ color: POA.textMuted }}> · {oc.phone}</span>}
              </div>
            </div>
          ))}
          <button style={{ ...PS.btn, fontSize: 11, padding: "4px 10px", marginLeft: "auto" }} onClick={() => setView("b_members")}>
            Update
          </button>
        </div>
      )}

      {/* Operations */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 8 }}>Your operations</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 18 }}>
        {[
          { id: "b_attendance",    label: "Meetings & Events", Icon: CalendarCheck, status: nextMeeting ? `Next: ${fmtShort(nextMeeting.scheduled_at)}` : "Nothing scheduled" },
          { id: "b_causes",        label: "Causes",            Icon: Heart,         status: activeCauses.length ? `${activeCauses.length} active` : "No active causes" },
          { id: "b_correspondence",label: "Correspondence",    Icon: Mail,          status: announcements.length ? `${announcements.length} sent` : "No announcements" },
          { id: "b_fundraising",   label: "Fundraising",       Icon: DollarSign,    status: "Plan your next event" },
        ].map(({ id, label, Icon, status }) => (
          <div key={id} style={{ background: "linear-gradient(160deg, #0E1830 0%, #080F20 100%)", border: "0.5px solid rgba(255,255,255,.07)", borderTop: `1.5px solid ${POA.accent}`, borderRadius: "0 0 11px 11px", padding: "12px 13px", cursor: "pointer", boxShadow: "0 0 20px rgba(0,0,0,.4)" }}
            onClick={() => setView(id)}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <Icon size={14} color={POA.accent} />
              <div style={{ fontWeight: 700, fontSize: 13, color: POA.textPrimary }}>{label}</div>
            </div>
            <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 9 }}>{status}</div>
            <div style={{ fontSize: 11, border: `0.5px solid rgba(255,255,255,.1)`, background: "rgba(255,255,255,.04)", color: "rgba(192,184,168,.8)", borderRadius: 6, padding: "3px 9px", display: "inline-flex", alignItems: "center", gap: 4 }}>
              Open <ChevronRight size={10} />
            </div>
          </div>
        ))}
      </div>

      {/* Feed + Calendar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 12, marginBottom: 16 }}>
        {/* Feed */}
        <div style={{ background: "linear-gradient(135deg, #0E1630 0%, #0A1020 100%)", border: "0.5px solid rgba(255,255,255,.10)", borderRadius: 13, padding: "14px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accent, marginBottom: 10 }}>Feed</div>
          {announcements.length === 0 ? (
            <div style={{ fontSize: 13, color: POA.textMuted }}>No announcements yet.</div>
          ) : announcements.slice(0, 3).map((a, i) => (
            <div key={a.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < 2 && i < announcements.length - 1 ? `0.5px solid ${POA.hairline}` : "none" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: POA.textPrimary, marginBottom: 2 }}>{a.subject}</div>
              <div style={{ fontSize: 11.5, color: POA.textSecondary, lineHeight: 1.5, marginBottom: 3 }}>{a.body?.slice(0,80)}{a.body?.length > 80 ? "…" : ""}</div>
              <div style={{ fontSize: 10, color: POA.textMuted }}>{fmtDate(a.created_at)}</div>
            </div>
          ))}
          <button style={{ ...PS.btn, fontSize: 11, width: "100%", justifyContent: "center", marginTop: 4 }}
            onClick={() => setView("b_correspondence")}>
            <Plus size={11} /> New announcement
          </button>
        </div>

        {/* Mini calendar */}
        <div style={{ background: "linear-gradient(135deg, #0E1630 0%, #0A1020 100%)", border: "0.5px solid rgba(255,255,255,.10)", borderRadius: 13, padding: "14px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accent }}>Calendar</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button style={{ ...PS.btn, padding: "2px 7px", fontSize: 11 }} onClick={() => setCalCur(c => c.m === 0 ? { y: c.y-1, m: 11 } : { ...c, m: c.m-1 })}>‹</button>
              <span style={{ fontSize: 11, color: POA.textMuted, minWidth: 70, textAlign: "center" }}>{MONTHS[calCur.m].slice(0,3)} {calCur.y}</span>
              <button style={{ ...PS.btn, padding: "2px 7px", fontSize: 11 }} onClick={() => setCalCur(c => c.m === 11 ? { y: c.y+1, m: 0 } : { ...c, m: c.m+1 })}>›</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 4 }}>
            {DOW.map(d => <div key={d} style={{ fontSize: 8, textAlign: "center", color: POA.textMuted, fontWeight: 700, padding: "2px 0" }}>{d}</div>)}
          </div>
          {Array.from({ length: cells.length / 7 }, (_, w) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, marginBottom: 1 }}>
              {cells.slice(w*7, w*7+7).map((d, i) => {
                const dayEvents = d ? (byDay[d] || []) : [];
                return (
                  <div key={i} style={{ minHeight: 28, borderRadius: 5, background: isToday(d) ? "linear-gradient(135deg, rgba(219,165,37,.2), rgba(219,165,37,.08))" : "transparent", border: `0.5px solid ${isToday(d) ? "rgba(219,165,37,.3)" : "transparent"}`, padding: "2px 3px" }}>
                    {d && (
                      <>
                        <div style={{ fontSize: 9, color: isToday(d) ? POA.accent : POA.textMuted, fontWeight: isToday(d) ? 700 : 400 }}>{d}</div>
                        {dayEvents.slice(0,1).map(e => (
                          <div key={e.id} style={{ height: 3, borderRadius: 2, background: KIND_COLOR[e.kind] || POA.accent, marginTop: 1, boxShadow: `0 0 4px ${KIND_COLOR[e.kind] || POA.accent}60` }} />
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <button style={{ ...PS.btn, fontSize: 11, width: "100%", justifyContent: "center", marginTop: 10 }}
            onClick={() => setView("b_attendance")}>
            View all events →
          </button>
        </div>
      </div>

      {/* Needs attention */}
      <div style={{ background: (overdueActions.length > 0 || overdueContacts.length > 0) ? "rgba(239,106,100,.06)" : "rgba(70,199,147,.05)", border: `0.5px solid ${(overdueActions.length > 0 || overdueContacts.length > 0) ? "rgba(239,106,100,.2)" : "rgba(70,199,147,.15)"}`, borderLeft: `2.5px solid ${(overdueActions.length > 0 || overdueContacts.length > 0) ? POA.red : POA.green}`, borderRadius: "0 13px 13px 0", padding: "12px 16px" }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: (overdueActions.length > 0 || overdueContacts.length > 0) ? POA.red : POA.green, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          {(overdueActions.length > 0 || overdueContacts.length > 0) ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
          Needs your attention ({overdueActions.length + overdueContacts.length})
        </div>
        {(overdueActions.length === 0 && overdueContacts.length === 0) ? (
          <div style={{ fontSize: 13, color: POA.textMuted }}>All caught up — no overdue action items.</div>
        ) : overdueActions.map(a => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `0.5px solid ${POA.hairline}` }}>
            <AlertTriangle size={13} color={POA.red} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13, color: POA.textPrimary }}>{a.title}</div>
            <div style={{ fontSize: 11, color: POA.red, flexShrink: 0 }}>Due {fmtShort(a.due_date)}</div>
          </div>
        ))}
        {overdueContacts.length > 0 && (
          <div style={{ marginTop: overdueActions.length > 0 ? 8 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: POA.amber, marginBottom: 4, letterSpacing: '.08em', textTransform: 'uppercase' }}>Cause contacts needing follow-up</div>
            {overdueContacts.slice(0, 3).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: `0.5px solid ${POA.hairline}` }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: POA.amber, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: POA.textPrimary }}>{c.name}{c.organization ? ` · ${c.organization}` : ''}</div>
                <div style={{ fontSize: 11, color: POA.amber, flexShrink: 0 }}>{c.causes?.name}</div>
              </div>
            ))}
            {overdueContacts.length > 3 && (
              <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4 }}>+{overdueContacts.length - 3} more needing follow-up</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AgendaMinutes({ me, org }) {
  const today = new Date();
  const [tab, setTab]           = useState("agenda");
  const [members, setMembers]   = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [causes, setCauses]     = useState([]);
  const [actions, setActions]   = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Agenda builder state
  const [agTitle, setAgTitle]   = useState("General Membership Meeting");
  const [agDate, setAgDate]     = useState("");
  const [agTopics, setAgTopics] = useState("");
  const [agLoading, setAgLoading] = useState(false);
  const [agOut, setAgOut]       = useState("");
  const [agErr, setAgErr]       = useState("");
  const [agSaveTitle, setAgSaveTitle] = useState("");
  const [agSaving, setAgSaving] = useState(false);
  const [agDrafts, setAgDrafts] = useState([]);
  const [agOpen, setAgOpen]     = useState(null);
  const [agEditing, setAgEditing] = useState(false);
  const [agEditBuf, setAgEditBuf] = useState("");

  // Minutes drafter state
  const [mnMeeting, setMnMeeting] = useState("");
  const [mnDate, setMnDate]       = useState("");
  const [mnNotes, setMnNotes]     = useState("");
  const [mnLoading, setMnLoading] = useState(false);
  const [mnOut, setMnOut]         = useState("");
  const [mnErr, setMnErr]         = useState("");
  const [mnSaveTitle, setMnSaveTitle] = useState("");
  const [mnSaving, setMnSaving]   = useState(false);
  const [mnDrafts, setMnDrafts]   = useState([]);
  const [mnOpen, setMnOpen]       = useState(null);
  const [mnEditing, setMnEditing] = useState(false);
  const [mnEditBuf, setMnEditBuf] = useState("");

  // Import minutes state
  const [importTitle, setImportTitle] = useState("");
  const [importText, setImportText]   = useState("");
  const [importing, setImporting]     = useState(false);

  // Action items state
  const [allActions, setAllActions] = useState([]);
  const [addingAction, setAddingAction] = useState(false);
  const [newAction, setNewAction] = useState({ title: "", member_id: "", due_date: "" });
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      listMembers(),
      listMeetings(),
      listCauses(),
      myActionItems(me.id),
      listAnnouncements(),
    ]).then(([mem, mtg, cau, act, ann]) => {
      setMembers(mem);
      setMeetings(mtg);
      setCauses(cau);
      setActions(act);
      setAnnouncements(ann);
    }).catch(() => null);
    loadAgDrafts();
    loadMnDrafts();
    loadAllActions();
  }, [me.id]);

  async function loadAgDrafts() {
    const { data } = await supabase.from("ai_outputs")
      .select("*").eq("feature", "agenda").is("deleted_at", null)
      .order("created_at", { ascending: false });
    setAgDrafts(data || []);
  }

  async function loadMnDrafts() {
    const { data } = await supabase.from("ai_outputs")
      .select("*").eq("feature", "minutes").is("deleted_at", null)
      .order("created_at", { ascending: false });
    setMnDrafts(data || []);
  }

  async function loadAllActions() {
    const { data } = await supabase.from("action_items")
      .select("*, members!action_items_owner_member_id_fkey(full_name)")
      .eq("department_id", me.department_id)
      .order("created_at", { ascending: false });
    setAllActions(data || []);
  }

  // ── AGENDA BUILDER ──
  async function generateAgenda() {
    setAgLoading(true); setAgErr(""); setAgOut("");
    try {
      const upcomingMeetings = meetings.filter(m => m.status === "open").slice(0, 3)
        .map(m => `${m.title} on ${fmtDate(m.scheduled_at)}`).join("; ") || "none";
      const activeCauses = causes.filter(c => c.status === "active").slice(0, 4)
        .map(c => c.name).join("; ") || "none";
      const openActions = actions.filter(a => a.status === "open").slice(0, 5)
        .map(a => `${a.title}${a.due_date ? ` (due ${fmtShort(a.due_date)})` : ""}`).join("; ") || "none";
      const recentAnn = announcements.slice(0, 3)
        .map(a => a.subject).join("; ") || "none";

      const sys = `You draft professional meeting agendas for a police officers' association. Produce a clear, structured agenda the president or secretary can run the meeting from. Use standard POA meeting structure: Call to Order, Roll Call/Attendance, Approval of Previous Minutes, Officer Reports, Committee Reports, Old Business, New Business, Good of the Order, Adjournment. Slot the provided real association data into the most appropriate sections. Name specifics — the cause, the action item, the topic — so it reads like this association's real meeting. NEVER invent details not provided. If a topic is listed, include it as-is without adding fabricated details. Under 450 words. Professional and concise.`;

      const prompt = `Association: ${org?.name || "Police Officers Association"}
Meeting: ${agTitle}${agDate ? ` on ${agDate}` : ""}
Additional topics from president: ${agTopics.trim() || "none"}

REAL ASSOCIATION CONTEXT — use only these facts:
Upcoming scheduled meetings: ${upcomingMeetings}
Active causes/fundraisers: ${activeCauses}
Open action items: ${openActions}
Recent announcements: ${recentAnn}

Draft a professional meeting agenda using this real data.`;

      const text = await callClaudeAI(sys, prompt);
      setAgOut(text);
      setAgSaveTitle(agTitle.slice(0, 60) || `Agenda · ${fmtShort(today.toISOString())}`);
    } catch(e) { setAgErr("Couldn't draft the agenda. Check ANTHROPIC_API_KEY."); }
    finally { setAgLoading(false); }
  }

  async function saveAgenda() {
    if (!agOut || !agSaveTitle.trim()) return;
    setAgSaving(true);
    try {
      await supabase.from("ai_outputs").insert({
        department_id: me.department_id,
        feature: "agenda",
        title: agSaveTitle.trim(),
        ai_text: agOut,
        created_by: me.id,
      });
      await loadAgDrafts();
    } catch(e) { setAgErr(e.message); }
    finally { setAgSaving(false); }
  }

  async function saveAgEdit() {
    if (!agEditBuf.trim()) return;
    try {
      await supabase.from("ai_outputs")
        .update({ current_text: agEditBuf, edited_by: me.id, edited_at: new Date().toISOString() })
        .eq("id", agOpen.id);
      const updated = { ...agOpen, current_text: agEditBuf };
      setAgOpen(updated);
      setAgEditing(false);
      await loadAgDrafts();
    } catch(e) { setAgErr(e.message); }
  }

  async function deleteAgDraft(id) {
    if (!confirm("Delete this agenda?")) return;
    await supabase.from("ai_outputs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await loadAgDrafts();
    if (agOpen?.id === id) setAgOpen(null);
  }

  // ── MINUTES DRAFTER ──
  async function generateMinutes() {
    setMnLoading(true); setMnErr(""); setMnOut("");
    try {
      const sys = `You draft professional meeting minutes for a police officers' association. Turn rough notes into clean, formal minutes. Format with: Meeting called to order, Attendance (leave blank for secretary to fill), then one section per agenda item or topic discussed, Action Items summary, and Adjournment. Use [brackets] for items that need real details the secretary must fill in. Professional, factual, under 500 words. End with Secretary signature line.`;
      const prompt = `Association: ${org?.name || "Police Officers Association"}
Meeting: ${mnMeeting || "General Membership Meeting"}${mnDate ? ` — ${mnDate}` : ""}

Rough notes from the meeting:
${mnNotes.trim() || "No notes provided — create a template with all sections using [brackets] for the secretary to fill in."}

Draft professional minutes from these notes.`;

      const text = await callClaudeAI(sys, prompt);
      setMnOut(text);
      setMnSaveTitle((mnMeeting || "Minutes").slice(0, 60) + (mnDate ? ` · ${mnDate}` : ""));
    } catch(e) { setMnErr("Couldn't draft minutes. Check ANTHROPIC_API_KEY."); }
    finally { setMnLoading(false); }
  }

  async function saveMinutes() {
    if (!mnOut || !mnSaveTitle.trim()) return;
    setMnSaving(true);
    try {
      await supabase.from("ai_outputs").insert({
        department_id: me.department_id,
        feature: "minutes",
        title: mnSaveTitle.trim(),
        ai_text: mnOut,
        created_by: me.id,
      });
      await loadMnDrafts();
    } catch(e) { setMnErr(e.message); }
    finally { setMnSaving(false); }
  }

  async function saveImportedMinutes() {
    if (!importText.trim() || !importTitle.trim()) return;
    setImporting(true);
    try {
      await supabase.from("ai_outputs").insert({
        department_id: me.department_id,
        feature: "minutes",
        title: importTitle.trim(),
        ai_text: importText.trim(),
        created_by: me.id,
      });
      setImportTitle(""); setImportText("");
      await loadMnDrafts();
    } catch(e) { setMnErr(e.message); }
    finally { setImporting(false); }
  }

  async function saveMnEdit() {
    if (!mnEditBuf.trim()) return;
    try {
      await supabase.from("ai_outputs")
        .update({ current_text: mnEditBuf, edited_by: me.id, edited_at: new Date().toISOString() })
        .eq("id", mnOpen.id);
      setMnOpen({ ...mnOpen, current_text: mnEditBuf });
      setMnEditing(false);
      await loadMnDrafts();
    } catch(e) { setMnErr(e.message); }
  }

  async function deleteMnDraft(id) {
    if (!confirm("Delete these minutes?")) return;
    await supabase.from("ai_outputs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await loadMnDrafts();
    if (mnOpen?.id === id) setMnOpen(null);
  }

  // ── ACTION ITEMS ──
  async function toggleActionItem(item) {
    await supabase.from("action_items")
      .update({ status: item.status === "done" ? "open" : "done" })
      .eq("id", item.id);
    await loadAllActions();
  }

  async function doAddAction() {
    if (!newAction.title.trim()) return;
    setActionBusy(true);
    try {
      await supabase.from("action_items").insert({
        department_id: me.department_id,
        title: newAction.title.trim(),
        owner_member_id: newAction.member_id || null,
        due_date: newAction.due_date || null,
        status: "open",
      });
      setNewAction({ title: "", member_id: "", due_date: "" });
      setAddingAction(false);
      await loadAllActions();
    } catch(e) { setMnErr(e.message); }
    finally { setActionBusy(false); }
  }

  const openActions2  = allActions.filter(a => a.status === "open");
  const doneActions   = allActions.filter(a => a.status === "done");

  // ── RENDER ──
  const TABS = [
    { id: "agenda",   label: "Agenda" },
    { id: "minutes",  label: "Minutes" },
    { id: "actions",  label: `Action Items${openActions2.length ? ` (${openActions2.length})` : ""}` },
  ];

  return (
    <div>
      <p style={{ ...PS.kicker, marginBottom: 4 }}>Agenda & Minutes</p>
      <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: "0 0 4px" }}>
        Meetings
      </h1>
      <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 20 }}>
        Draft agendas before the meeting · file minutes after · track action items.
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#06090A" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}`, fontWeight: tab === t.id ? 700 : 500 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── AGENDA TAB ── */}
      {tab === "agenda" && (
        <div>
          {/* AI Agenda Builder */}
          <div style={{ background: "linear-gradient(135deg, rgba(219,165,37,.08), rgba(219,165,37,.02))", border: `0.5px solid rgba(219,165,37,.25)`, borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 13px 13px 0", padding: "18px 20px", marginBottom: 20, boxShadow: "0 0 20px rgba(219,165,37,.05)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accent, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={12} /> AI AGENDA BUILDER
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: POA.textPrimary, marginBottom: 4 }}>Draft an agenda from your real association data</div>
            <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
              Pulled live from your association — references only what's real, nothing invented.
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Meeting</div>
                <input value={agTitle} onChange={e => setAgTitle(e.target.value)} style={PS.input} />
              </div>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
                <input value={agDate} onChange={e => setAgDate(e.target.value)} placeholder="e.g. Jul 12, 2026" style={PS.input} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>
                Additional topics <span style={{ color: POA.textMuted, fontWeight: 400 }}>— optional, your own items to add</span>
              </div>
              <textarea value={agTopics} onChange={e => setAgTopics(e.target.value)}
                style={{ ...PS.textarea, minHeight: 60 }}
                placeholder="e.g. CBA ratification vote, scholarship applications, officer recognition" />
            </div>

            {/* Context panel */}
            <div style={{ background: "rgba(0,0,0,.25)", border: `0.5px solid ${POA.hairline}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 8 }}>Context we'll use</div>
              {[
                { label: `Meetings — ${meetings.filter(m => m.status === "open").length} upcoming`, items: meetings.filter(m => m.status === "open").slice(0,3).map(m => m.title + " · " + fmtDate(m.scheduled_at)) },
                { label: `Active causes — ${causes.filter(c => c.status === "active").length}`, items: causes.filter(c => c.status === "active").slice(0,3).map(c => c.name) },
                { label: `Open action items — ${actions.filter(a => a.status === "open").length}`, items: actions.filter(a => a.status === "open").slice(0,3).map(a => a.title) },
                { label: `Recent announcements — ${announcements.length}`, items: announcements.slice(0,2).map(a => a.subject) },
              ].map(({ label, items }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: POA.accent, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                  {items.length === 0
                    ? <div style={{ fontSize: 12, color: POA.textMuted }}>None.</div>
                    : items.map((item, i) => <div key={i} style={{ fontSize: 12, color: POA.textSecondary, padding: "1px 0" }}>· {item}</div>)
                  }
                </div>
              ))}
            </div>

            <button style={{ ...PS.btnPrimary, opacity: agLoading ? 0.7 : 1 }} disabled={agLoading} onClick={generateAgenda}>
              {agLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Drafting…</> : <><Sparkles size={14} /> Generate agenda</>}
            </button>
            {agErr && <ErrBox msg={agErr} />}

            {agOut && (
              <>
                <div style={{ background: "rgba(0,0,0,.3)", border: `0.5px solid ${POA.hairline}`, borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
                  <FundraisingPlanDisplay text={agOut} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Save as</div>
                    <input value={agSaveTitle} onChange={e => setAgSaveTitle(e.target.value)} style={PS.input} placeholder="Agenda title" />
                  </div>
                  <button style={{ ...PS.btn, opacity: (agSaving || !agSaveTitle.trim()) ? 0.6 : 1 }} disabled={agSaving || !agSaveTitle.trim()} onClick={saveAgenda}>
                    {agSaving ? "Saving…" : <><FileText size={13} /> Save agenda</>}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Saved agendas */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={12} /> Saved agendas
          </div>
          <Card>
            {agDrafts.length === 0
              ? <div style={{ fontSize: 13, color: POA.textMuted, padding: "8px 0" }}>No saved agendas yet.</div>
              : agDrafts.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `0.5px solid ${POA.hairline}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: POA.textPrimary }}>{d.title || "Untitled agenda"}</div>
                    <div style={{ fontSize: 11.5, color: POA.textMuted }}>{fmtDate(d.edited_at || d.created_at)}{d.edited_by ? " · edited" : ""}</div>
                  </div>
                  <button style={{ ...PS.btn, padding: "5px 9px", fontSize: 11.5 }} onClick={() => { setAgOpen(d); setAgEditing(false); }}>Open</button>
                  {canAdmin(me.access) && (
                    <button style={{ ...PS.btn, padding: "5px 8px", fontSize: 11.5, color: POA.red }} onClick={() => deleteAgDraft(d.id)}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))
            }
          </Card>

          {/* Agenda modal */}
          {agOpen && (
            <div onClick={() => { setAgOpen(null); setAgEditing(false); }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "linear-gradient(135deg, #0E1630, #0A1020)", border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 720, width: "100%", padding: "20px 22px", boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent }}>{agOpen.title || "Agenda"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!agEditing && <button style={{ ...PS.btn, padding: "5px 10px" }} onClick={() => { setAgEditBuf(agOpen.current_text || agOpen.ai_text || ""); setAgEditing(true); }}><Pencil size={13} /> Edit</button>}
                    <button style={{ ...PS.btn, padding: "5px 10px" }} onClick={() => { setAgOpen(null); setAgEditing(false); }}><X size={13} /></button>
                  </div>
                </div>
                {agEditing ? (
                  <>
                    <textarea value={agEditBuf} onChange={e => setAgEditBuf(e.target.value)}
                      style={{ ...PS.textarea, minHeight: 300, width: "100%", fontFamily: "inherit" }} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                      <button style={PS.btn} onClick={() => setAgEditing(false)}>Cancel</button>
                      <button style={PS.btnPrimary} onClick={saveAgEdit}><FileText size={13} /> Save changes</button>
                    </div>
                  </>
                ) : (
                  <FundraisingPlanDisplay text={agOpen.current_text || agOpen.ai_text} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MINUTES TAB ── */}
      {tab === "minutes" && (
        <div>
          {/* AI Minutes Drafter */}
          <div style={{ background: "linear-gradient(135deg, rgba(219,165,37,.08), rgba(219,165,37,.02))", border: `0.5px solid rgba(219,165,37,.25)`, borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 13px 13px 0", padding: "18px 20px", marginBottom: 16, boxShadow: "0 0 20px rgba(219,165,37,.05)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accent, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={12} /> AI MINUTES DRAFTER
            </div>
            <div style={{ fontWeight: 700, fontSize: 17, color: POA.textPrimary, marginBottom: 4 }}>Turn rough notes into clean minutes</div>
            <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
              Jot down what happened — AI drafts professional minutes. A human always reviews and files.
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Meeting</div>
                <input value={mnMeeting} onChange={e => setMnMeeting(e.target.value)} placeholder="e.g. General Membership Meeting" style={PS.input} />
              </div>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
                <input value={mnDate} onChange={e => setMnDate(e.target.value)} placeholder="e.g. Jul 12, 2026" style={PS.input} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Rough notes from the meeting</div>
              <textarea value={mnNotes} onChange={e => setMnNotes(e.target.value)}
                style={{ ...PS.textarea, minHeight: 100 }}
                placeholder="Who was there, what came up, what was decided, what people agreed to do..." />
            </div>

            <button style={{ ...PS.btnPrimary, opacity: mnLoading ? 0.7 : 1 }} disabled={mnLoading} onClick={generateMinutes}>
              {mnLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Drafting…</> : <><Sparkles size={14} /> Draft the minutes</>}
            </button>
            {mnErr && <ErrBox msg={mnErr} />}

            {mnOut && (
              <>
                <div style={{ background: "rgba(0,0,0,.3)", border: `0.5px solid ${POA.hairline}`, borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
                  <FundraisingPlanDisplay text={mnOut} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Save as</div>
                    <input value={mnSaveTitle} onChange={e => setMnSaveTitle(e.target.value)} style={PS.input} placeholder="Minutes title" />
                  </div>
                  <button style={{ ...PS.btn, opacity: (mnSaving || !mnSaveTitle.trim()) ? 0.6 : 1 }} disabled={mnSaving || !mnSaveTitle.trim()} onClick={saveMinutes}>
                    {mnSaving ? "Saving…" : <><FileText size={13} /> Save minutes</>}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Import minutes */}
          <div style={{ ...PS.card, padding: "16px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={12} /> Import minutes — written outside B4C
            </div>
            <div style={{ fontSize: 12.5, color: POA.textMuted, marginBottom: 12, lineHeight: 1.55 }}>
              Bring in minutes from Word, Google Docs, or typed elsewhere. Saved as <strong style={{ color: POA.textSecondary }}>Imported — not AI-generated</strong>.
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Title</div>
              <input value={importTitle} onChange={e => setImportTitle(e.target.value)}
                style={PS.input} placeholder="e.g. General Meeting — Jul 12, 2026" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Minutes text</div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)}
                style={{ ...PS.textarea, minHeight: 100 }} placeholder="Paste the full minutes here..." />
            </div>
            <button style={{ ...PS.btnPrimary, opacity: (importing || !importTitle.trim() || !importText.trim()) ? 0.6 : 1 }}
              disabled={importing || !importTitle.trim() || !importText.trim()} onClick={saveImportedMinutes}>
              {importing ? "Saving…" : <><FileText size={13} /> Save imported minutes</>}
            </button>
          </div>

          {/* Saved minutes */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={12} /> Saved minutes
          </div>
          <Card>
            {mnDrafts.length === 0
              ? <div style={{ fontSize: 13, color: POA.textMuted, padding: "8px 0" }}>No saved minutes yet.</div>
              : mnDrafts.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `0.5px solid ${POA.hairline}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: POA.textPrimary }}>{d.title || "Untitled minutes"}</div>
                    <div style={{ fontSize: 11.5, color: POA.textMuted }}>{fmtDate(d.edited_at || d.created_at)}{d.edited_by ? " · edited" : ""}</div>
                  </div>
                  <button style={{ ...PS.btn, padding: "5px 9px", fontSize: 11.5 }} onClick={() => { setMnOpen(d); setMnEditing(false); }}>Open</button>
                  {canAdmin(me.access) && (
                    <button style={{ ...PS.btn, padding: "5px 8px", fontSize: 11.5, color: POA.red }} onClick={() => deleteMnDraft(d.id)}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))
            }
          </Card>

          {/* Minutes modal */}
          {mnOpen && (
            <div onClick={() => { setMnOpen(null); setMnEditing(false); }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
              <div onClick={e => e.stopPropagation()}
                style={{ background: "linear-gradient(135deg, #0E1630, #0A1020)", border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 720, width: "100%", padding: "20px 22px", boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent }}>{mnOpen.title || "Minutes"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {!mnEditing && <button style={{ ...PS.btn, padding: "5px 10px" }} onClick={() => { setMnEditBuf(mnOpen.current_text || mnOpen.ai_text || ""); setMnEditing(true); }}><Pencil size={13} /> Edit</button>}
                    <button style={{ ...PS.btn, padding: "5px 10px" }} onClick={() => { setMnOpen(null); setMnEditing(false); }}><X size={13} /></button>
                  </div>
                </div>
                {mnEditing ? (
                  <>
                    <textarea value={mnEditBuf} onChange={e => setMnEditBuf(e.target.value)}
                      style={{ ...PS.textarea, minHeight: 300, width: "100%", fontFamily: "inherit" }} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                      <button style={PS.btn} onClick={() => setMnEditing(false)}>Cancel</button>
                      <button style={PS.btnPrimary} onClick={saveMnEdit}><FileText size={13} /> Save changes</button>
                    </div>
                  </>
                ) : (
                  <FundraisingPlanDisplay text={mnOpen.current_text || mnOpen.ai_text} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTION ITEMS TAB ── */}
      {tab === "actions" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: POA.textMuted }}>{openActions2.length} open · {doneActions.length} completed</div>
            <button style={PS.btn} onClick={() => setAddingAction(v => !v)}>
              <Plus size={13} /> Add action item
            </button>
          </div>

          {addingAction && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>New action item</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Action item</div>
                  <input value={newAction.title} onChange={e => setNewAction(x => ({ ...x, title: e.target.value }))}
                    style={PS.input} placeholder="e.g. President to follow up on contract negotiation" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Assign to</div>
                  <select value={newAction.member_id} onChange={e => setNewAction(x => ({ ...x, member_id: e.target.value }))} style={PS.input}>
                    <option value="">— Unassigned —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Due date</div>
                  <input type="date" value={newAction.due_date} onChange={e => setNewAction(x => ({ ...x, due_date: e.target.value }))} style={PS.input} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={actionBusy || !newAction.title.trim()} onClick={doAddAction}>Add</button>
                <button style={PS.btn} onClick={() => setAddingAction(false)}>Cancel</button>
              </div>
            </Card>
          )}

          {allActions.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No action items yet. Add one above or extract from minutes.</div></Card>
          ) : (
            <>
              {openActions2.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.amber, marginBottom: 8 }}>Open</div>
                  {openActions2.map(a => {
                    const over = a.due_date && new Date(a.due_date) < today && a.status !== "done";
                    return (
                      <div key={a.id} style={{ ...PS.card, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <button onClick={() => toggleActionItem(a)}
                          style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${POA.accentDim}`, background: "transparent", flexShrink: 0, marginTop: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: POA.textPrimary }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 3 }}>
                            {a.members?.full_name || "Unassigned"}{a.due_date ? ` · due ${fmtShort(a.due_date)}` : ""}
                          </div>
                        </div>
                        {over && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(240,180,74,.14)", color: POA.amber, flexShrink: 0 }}>Overdue</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {doneActions.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.green, marginBottom: 8 }}>Completed</div>
                  {doneActions.map(a => (
                    <div key={a.id} style={{ ...PS.card, padding: "11px 14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10, opacity: .65 }}>
                      <button onClick={() => toggleActionItem(a)}
                        style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${POA.green}`, background: POA.green, flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={12} color="#052b1e" />
                      </button>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: POA.textMuted, textDecoration: "line-through" }}>{a.title}</div>
                        <div style={{ fontSize: 11, color: POA.textMuted }}>{a.members?.full_name || "Unassigned"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CauseDetail({ cause, me, onBack, onRefresh }) {
  const [tab, setTab]               = useState('overview');
  const [contacts, setContacts]     = useState([]);
  const [events, setEvents]         = useState([]);
  const [members, setMembers]       = useState([]);
  const [entries, setEntries]       = useState(cause.cause_entries || []);
  const [err, setErr]               = useState('');
  const manage                      = canManage(me.access);

  // Contact form
  const blankC = { name: '', organization: '', role: 'Sponsor', phone: '', email: '', amount_committed: '', amount_received: '', last_contact_date: '', relationship_notes: '' };
  const [addingContact, setAddingContact]   = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [cf, setCf]                         = useState(blankC);
  const [cBusy, setCBusy]                   = useState(false);

  // Event form
  const blankE = { title: '', event_date: '', location: '', amount_raised: '', notes: '', status: 'upcoming' };
  const [addingEvent, setAddingEvent]   = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [ef, setEf]                     = useState(blankE);
  const [eBusy, setEBusy]               = useState(false);

  // Activity entry form
  const blankA = { kind: 'update', label: '', amount: '', occurred_on: '', note: '' };
  const [addingEntry, setAddingEntry] = useState(false);
  const [af, setAf]                   = useState(blankA);
  const [aBusy, setABusy]             = useState(false);

  // Cause overview edit
  const [editingOverview, setEditingOverview] = useState(false);
  const [of, setOf] = useState({
    goal_amount: cause.goal_amount || '',
    description: cause.description || '',
    external_url: cause.external_url || '',
    point_person_id: cause.point_person_id || '',
    main_contact_id: cause.main_contact_id || '',
  });
  const [oBusy, setOBusy] = useState(false);

  async function load() {
    const [c, e, mem] = await Promise.all([
      supabase.from('cause_contacts').select('*').eq('cause_id', cause.id).eq('active', true).order('sort').then(({ data }) => data || []),
      supabase.from('cause_events').select('*').eq('cause_id', cause.id).order('event_date', { ascending: false }).then(({ data }) => data || []),
      listMembers().then(m => m).catch(() => []),
    ]);
    setContacts(c);
    setEvents(e);
    setMembers(mem);
    const { data: ents } = await supabase.from('cause_entries').select('*').eq('cause_id', cause.id).order('occurred_on', { ascending: false });
    setEntries(ents || []);
  }

  useEffect(() => { load(); }, [cause.id]);

  // Financial summary
  const contribFromEntries = entries.filter(e => e.kind === 'contribution' && e.amount).reduce((s, e) => s + Number(e.amount), 0);
  const contribFromContacts = contacts.reduce((s, c) => s + (Number(c.amount_received) || 0), 0);
  const contribFromEvents = events.filter(e => e.status === 'completed').reduce((s, e) => s + (Number(e.amount_raised) || 0), 0);
  const totalRaised = contribFromEntries + contribFromContacts + contribFromEvents;
  const goalPct = cause.goal_amount ? Math.min(100, Math.round((totalRaised / cause.goal_amount) * 100)) : null;
  const upcomingEvents = events.filter(e => e.status === 'upcoming').sort((a, b) => a.event_date > b.event_date ? 1 : -1);
  const nextEvent = upcomingEvents[0];

  // Save overview
  async function saveOverview() {
    setOBusy(true); setErr('');
    try {
      await supabase.from('causes').update({
        goal_amount: of.goal_amount ? Number(of.goal_amount) : null,
        description: of.description || null,
        external_url: of.external_url || null,
        point_person_id: of.point_person_id || null,
        main_contact_id: of.main_contact_id || null,
      }).eq('id', cause.id);
      setEditingOverview(false);
      onRefresh();
    } catch(e) { setErr(e.message); }
    finally { setOBusy(false); }
  }

  // Contact CRUD
  async function saveContact() {
    setCBusy(true); setErr('');
    try {
      const row = {
        cause_id: cause.id,
        department_id: me.department_id,
        name: cf.name.trim(),
        organization: cf.organization.trim() || null,
        role: cf.role || 'Sponsor',
        phone: cf.phone.trim() || null,
        email: cf.email.trim() || null,
        amount_committed: cf.amount_committed ? Number(cf.amount_committed) : null,
        amount_received: cf.amount_received ? Number(cf.amount_received) : null,
        last_contact_date: cf.last_contact_date || null,
        relationship_notes: cf.relationship_notes.trim() || null,
      };
      if (editingContact) {
        await supabase.from('cause_contacts').update(row).eq('id', editingContact.id);
      } else {
        await supabase.from('cause_contacts').insert(row);
      }
      setCf(blankC); setAddingContact(false); setEditingContact(null);
      await load();
    } catch(e) { setErr(e.message); }
    finally { setCBusy(false); }
  }

  async function removeContact(id) {
    if (!confirm('Remove this contact?')) return;
    await supabase.from('cause_contacts').update({ active: false }).eq('id', id);
    await load();
  }

  // Event CRUD
  async function saveEvent() {
    setEBusy(true); setErr('');
    try {
      const row = {
        cause_id: cause.id,
        department_id: me.department_id,
        title: ef.title.trim(),
        event_date: ef.event_date || null,
        location: ef.location.trim() || null,
        amount_raised: ef.amount_raised ? Number(ef.amount_raised) : null,
        notes: ef.notes.trim() || null,
        status: ef.status,
      };
      if (editingEvent) {
        await supabase.from('cause_events').update(row).eq('id', editingEvent.id);
        // Update funding_events if linked
        if (editingEvent.funding_event_id) {
          await supabase.from('funding_events').update({
            title: ef.title.trim(),
            date: ef.event_date || null,
            description: `${cause.name}: ${ef.notes.trim() || ''}`,
          }).eq('id', editingEvent.funding_event_id);
        }
      } else {
        const { data: newEvent } = await supabase.from('cause_events').insert(row).select().single();
        // Auto-add to fundraising calendar for upcoming events
        if (ef.status === 'upcoming' && ef.event_date && newEvent) {
          const { data: fe } = await supabase.from('funding_events').insert({
            department_id: me.department_id,
            title: ef.title.trim(),
            date: ef.event_date,
            description: `${cause.name}: ${ef.notes.trim() || ''}`,
            link_url: cause.external_url || null,
          }).select().single();
          // Link them so we can update later
          if (fe) {
            await supabase.from('cause_events').update({ funding_event_id: fe.id }).eq('id', newEvent.id);
          }
        }
      }
      setEf(blankE); setAddingEvent(false); setEditingEvent(null);
      await load();
    } catch(e) { setErr(e.message); }
    finally { setEBusy(false); }
  }

  // Activity entry
  async function saveEntry() {
    setABusy(true); setErr('');
    try {
      await supabase.from('cause_entries').insert({
        cause_id: cause.id,
        department_id: me.department_id,
        kind: af.kind,
        label: af.label.trim(),
        amount: af.amount ? Number(af.amount) : null,
        occurred_on: af.occurred_on || new Date().toISOString().split('T')[0],
        note: af.note.trim() || null,
      });
      setAf(blankA); setAddingEntry(false);
      await load();
    } catch(e) { setErr(e.message); }
    finally { setABusy(false); }
  }

  const TABS = ['overview', 'contacts', 'events', 'activity'];
  const TAB_LABELS = { overview: 'Overview', contacts: `Contacts (${contacts.length})`, events: `Events (${events.length})`, activity: `Activity (${entries.length})` };

  return (
    <div>
      {/* Back + header */}
      <button onClick={onBack} style={{ ...PS.btn, marginBottom: 16 }}>
        <ArrowLeft size={13} /> Causes
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Cause</p>
          <h1 style={{ fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: '0 0 4px' }}>{cause.name}</h1>
          {cause.tagline && <div style={{ fontSize: 13.5, color: POA.textMuted }}>{cause.tagline}</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: cause.status === 'active' ? 'rgba(70,199,147,.14)' : POA.accentSoft, color: cause.status === 'active' ? POA.green : POA.textMuted, flexShrink: 0 }}>
          {cause.status}
        </span>
      </div>

      {/* Financial summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total raised', value: money(totalRaised), color: POA.green },
          { label: 'From events', value: money(contribFromEvents), color: POA.accent },
          { label: 'From sponsors', value: money(contribFromContacts), color: POA.accent },
          { label: 'Goal', value: cause.goal_amount ? money(cause.goal_amount) : '—', color: POA.textMuted },
        ].map(s => (
          <div key={s.label} style={{ background: 'linear-gradient(160deg, #101828 0%, #0A1020 100%)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 11, padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: 22, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: POA.textMuted, marginTop: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {goalPct !== null && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>
            <span>Progress toward goal</span>
            <span style={{ color: POA.accent, fontWeight: 700 }}>{goalPct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${goalPct}%`, background: `linear-gradient(90deg, ${POA.accent}, #F0C84A)`, borderRadius: 999, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* Next event banner */}
      {nextEvent && (
        <div style={{ background: 'rgba(219,165,37,.08)', border: `0.5px solid rgba(219,165,37,.25)`, borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 20 }}>📅</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.accent, marginBottom: 2 }}>Next event</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{nextEvent.title}</div>
            <div style={{ fontSize: 12, color: POA.textMuted }}>{nextEvent.event_date ? new Date(nextEvent.event_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }) : 'Date TBD'}{nextEvent.location ? ` · ${nextEvent.location}` : ''}</div>
          </div>
        </div>
      )}

      <ErrBox msg={err} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 999, border: `0.5px solid ${tab === t ? POA.accent : POA.hairline2}`, background: tab === t ? POA.accentSoft : 'transparent', color: tab === t ? POA.accent : POA.textMuted, cursor: 'pointer', fontWeight: tab === t ? 700 : 400 }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div>
          {editingOverview ? (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>Edit overview</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Description</div>
                  <textarea value={of.description} onChange={e => setOf(x => ({ ...x, description: e.target.value }))}
                    style={{ ...PS.textarea, minHeight: 80 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Point person (board member responsible)</div>
                  <select value={of.point_person_id} onChange={e => setOf(x => ({ ...x, point_person_id: e.target.value }))} style={PS.input}>
                    <option value=''>— No point person set —</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Secondary contact</div>
                  <select value={of.main_contact_id} onChange={e => setOf(x => ({ ...x, main_contact_id: e.target.value }))} style={PS.input}>
                    <option value=''>— No main contact set —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.organization ? ` · ${c.organization}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Goal amount</div>
                  <input value={of.goal_amount} onChange={e => setOf(x => ({ ...x, goal_amount: e.target.value }))}
                    style={PS.input} placeholder='e.g. 10000' inputMode='numeric' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>External link</div>
                  <input value={of.external_url} onChange={e => setOf(x => ({ ...x, external_url: e.target.value }))}
                    style={PS.input} placeholder='https://...' />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={PS.btnPrimary} disabled={oBusy} onClick={saveOverview}>{oBusy ? 'Saving…' : 'Save'}</button>
                <button style={PS.btn} onClick={() => setEditingOverview(false)}>Cancel</button>
              </div>
            </Card>
          ) : (
            <Card style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: cause.description ? 10 : 0 }}>
                <SectionTitle>About this cause</SectionTitle>
                {manage && <button style={{ ...PS.btn, fontSize: 11 }} onClick={() => setEditingOverview(true)}><Pencil size={11} /> Edit</button>}
              </div>
              {cause.description && <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7, marginBottom: 10 }}>{cause.description}</div>}
              {(cause.point_person_id || cause.main_contact_id) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {cause.point_person_id && (() => {
                    const pp = members.find(m => m.id === cause.point_person_id);
                    return pp ? (
                      <div style={{ background: 'rgba(219,165,37,.06)', border: `0.5px solid rgba(219,165,37,.2)`, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.accent, marginBottom: 4 }}>Point person</div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: POA.textPrimary }}>{pp.full_name}</div>
                        {pp.phone && <a href={`tel:${pp.phone.replace(/\D/g,'')}`} style={{ fontSize: 12, color: POA.textMuted, textDecoration: 'none', display: 'block', marginTop: 2 }}>{pp.phone}</a>}
                      </div>
                    ) : null;
                  })()}
                  {cause.main_contact_id && (() => {
                    const mc = contacts.find(c => c.id === cause.main_contact_id);
                    return mc ? (
                      <div style={{ background: 'rgba(70,199,147,.06)', border: `0.5px solid rgba(70,199,147,.2)`, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.green, marginBottom: 4 }}>Secondary contact</div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: POA.textPrimary }}>{mc.name}</div>
                        {mc.organization && <div style={{ fontSize: 12, color: POA.textMuted }}>{mc.organization}</div>}
                        {mc.phone && <a href={`tel:${mc.phone.replace(/\D/g,'')}`} style={{ fontSize: 12, color: POA.accent, textDecoration: 'none', display: 'block', marginTop: 2 }}>{mc.phone}</a>}
                        {mc.email && <a href={`mailto:${mc.email}`} style={{ fontSize: 12, color: POA.textMuted, textDecoration: 'none', display: 'block' }}>{mc.email}</a>}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
              {cause.external_url && (
                <a href={cause.external_url} target='_blank' rel='noreferrer'
                  style={{ ...PS.btnPrimary, textDecoration: 'none', display: 'inline-flex', fontSize: 12, marginTop: 12 }}>
                  Learn more ↗
                </a>
              )}
            </Card>
          )}

          {!editingOverview && manage && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `0.5px solid ${POA.hairline}` }}>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 8, fontStyle: 'italic' }}>
                Danger zone — these actions affect the entire cause.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {cause.status !== 'archived' && (
                  <button style={{ ...PS.btn, color: POA.amber, fontSize: 12 }}
                    onClick={async () => {
                      if (!confirm('Archive this cause? It will be hidden from the active list but data is preserved.')) return;
                      await supabase.from('causes').update({ status: 'archived' }).eq('id', cause.id);
                      onBack();
                    }}>
                    Archive cause
                  </button>
                )}
                {canAdmin(me.access) && (
                  <button style={{ ...PS.btn, color: POA.red, fontSize: 12 }}
                    onClick={async () => {
                      if (!confirm('Permanently delete this cause and all its data? This cannot be undone.')) return;
                      await supabase.from('causes').delete().eq('id', cause.id);
                      onBack();
                    }}>
                    Delete cause
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTACTS TAB */}
      {tab === 'contacts' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: POA.textMuted }}>Sponsors, partners, and key contacts for this cause.</div>
            {manage && <button style={PS.btn} onClick={() => { setAddingContact(true); setEditingContact(null); setCf(blankC); }}><Plus size={13} /> Add contact</button>}
          </div>

          {(addingContact || editingContact) && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>{editingContact ? 'Edit contact' : 'New contact'}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Name</div>
                  <input value={cf.name} onChange={e => setCf(x => ({ ...x, name: e.target.value }))} style={PS.input} placeholder='Full name' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Organization</div>
                  <input value={cf.organization} onChange={e => setCf(x => ({ ...x, organization: e.target.value }))} style={PS.input} placeholder='Company or org' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Role</div>
                  <select value={cf.role} onChange={e => setCf(x => ({ ...x, role: e.target.value }))} style={PS.input}>
                    {['Sponsor','Individual Donor','Community Partner','City Contact','Vendor','Volunteer Lead','Media Contact','Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Phone</div>
                  <input value={cf.phone} onChange={e => setCf(x => ({ ...x, phone: e.target.value }))} style={PS.input} placeholder='(817) 555-0100' type='tel' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Email</div>
                  <input value={cf.email} onChange={e => setCf(x => ({ ...x, email: e.target.value }))} style={PS.input} type='email' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Last contact date</div>
                  <input type='date' value={cf.last_contact_date} onChange={e => setCf(x => ({ ...x, last_contact_date: e.target.value }))} style={PS.input} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Amount committed</div>
                  <input value={cf.amount_committed} onChange={e => setCf(x => ({ ...x, amount_committed: e.target.value }))} style={PS.input} placeholder='e.g. 500' inputMode='numeric' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Amount received</div>
                  <input value={cf.amount_received} onChange={e => setCf(x => ({ ...x, amount_received: e.target.value }))} style={PS.input} placeholder='e.g. 250' inputMode='numeric' />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Relationship notes</div>
                  <textarea value={cf.relationship_notes} onChange={e => setCf(x => ({ ...x, relationship_notes: e.target.value }))}
                    style={{ ...PS.textarea, minHeight: 80 }}
                    placeholder='How did we connect? What did we discuss? What are the next steps? Who do we follow up with?' />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={PS.btnPrimary} disabled={cBusy || !cf.name.trim()} onClick={saveContact}>{cBusy ? 'Saving…' : editingContact ? 'Save changes' : 'Add contact'}</button>
                <button style={PS.btn} onClick={() => { setAddingContact(false); setEditingContact(null); }}>Cancel</button>
                {editingContact && <button style={{ ...PS.btn, color: POA.red, marginLeft: 'auto' }} onClick={() => { removeContact(editingContact.id); setEditingContact(null); }}>Remove</button>}
              </div>
            </Card>
          )}

          {contacts.length === 0 && !addingContact ? (
            <Card>
              <div style={{ color: POA.textMuted, fontSize: 13.5, textAlign: 'center', padding: '16px 0' }}>
                No contacts yet. Add sponsors, partners, and key contacts so this knowledge doesn't live in one person's head.
              </div>
            </Card>
          ) : contacts.map(c => (
            <Card key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>{c.name}</div>
                  {c.organization && <div style={{ fontSize: 12.5, color: POA.textMuted }}>{c.organization}</div>}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: POA.accentSoft, color: POA.accent, display: 'inline-block', marginTop: 4 }}>{c.role}</span>
                  {(() => {
                    if (!c.last_contact_date) return (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(240,180,74,.12)', color: POA.amber, marginLeft: 6 }}>Never contacted</span>
                    );
                    const days = Math.floor((new Date() - new Date(c.last_contact_date)) / (1000 * 60 * 60 * 24));
                    if (days > 60) return (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(240,180,74,.12)', color: POA.amber, marginLeft: 6 }}>{days}d since contact</span>
                    );
                    if (days > 30) return (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(219,165,37,.08)', color: POA.accent, marginLeft: 6 }}>Follow up soon</span>
                    );
                    return null;
                  })()}
                </div>
                {manage && (
                  <button style={{ ...PS.btn, fontSize: 11, padding: '4px 8px' }} onClick={() => { setEditingContact(c); setCf({ name: c.name, organization: c.organization || '', role: c.role, phone: c.phone || '', email: c.email || '', amount_committed: c.amount_committed || '', amount_received: c.amount_received || '', last_contact_date: c.last_contact_date || '', relationship_notes: c.relationship_notes || '' }); setAddingContact(false); }}>
                    <Pencil size={11} />
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: c.relationship_notes ? 10 : 0 }}>
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/\D/g,'')}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: POA.textSecondary, textDecoration: 'none' }}>
                    <Phone size={13} color={POA.accent} /> {c.phone}
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: POA.textSecondary, textDecoration: 'none' }}>
                    <Mail size={13} color={POA.accent} /> {c.email}
                  </a>
                )}
                {c.last_contact_date && (
                  <div style={{ fontSize: 12, color: POA.textMuted }}>Last contact: {fmtShort(c.last_contact_date)}</div>
                )}
                {(c.amount_committed || c.amount_received) && (
                  <div style={{ fontSize: 12, color: POA.green }}>
                    {c.amount_received ? `Received: ${money(c.amount_received)}` : ''}
                    {c.amount_committed ? ` / Committed: ${money(c.amount_committed)}` : ''}
                  </div>
                )}
              </div>

              {c.relationship_notes && (
                <div style={{ fontSize: 12.5, color: POA.textSecondary, lineHeight: 1.65, padding: '10px 12px', background: 'rgba(0,0,0,.2)', borderRadius: 8, borderLeft: `2px solid ${POA.accentDim}` }}>
                  {c.relationship_notes}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* EVENTS TAB */}
      {tab === 'events' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: POA.textMuted }}>Events tied to this cause — upcoming and past.</div>
            {manage && <button style={PS.btn} onClick={() => { setAddingEvent(true); setEditingEvent(null); setEf(blankE); }}><Plus size={13} /> Add event</button>}
          </div>

          {(addingEvent || editingEvent) && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>{editingEvent ? 'Edit event' : 'New event'}</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Event title</div>
                  <input value={ef.title} onChange={e => setEf(x => ({ ...x, title: e.target.value }))} style={PS.input} placeholder='e.g. Annual Toy Drive' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
                  <input type='date' value={ef.event_date} onChange={e => setEf(x => ({ ...x, event_date: e.target.value }))} style={PS.input} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Location</div>
                  <input value={ef.location} onChange={e => setEf(x => ({ ...x, location: e.target.value }))} style={PS.input} placeholder='Address or venue' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Status</div>
                  <select value={ef.status} onChange={e => setEf(x => ({ ...x, status: e.target.value }))} style={PS.input}>
                    <option value='upcoming'>Upcoming</option>
                    <option value='completed'>Completed</option>
                    <option value='cancelled'>Cancelled</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Amount raised</div>
                  <input value={ef.amount_raised} onChange={e => setEf(x => ({ ...x, amount_raised: e.target.value }))} style={PS.input} placeholder='e.g. 2500' inputMode='numeric' />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Notes</div>
                  <textarea value={ef.notes} onChange={e => setEf(x => ({ ...x, notes: e.target.value }))}
                    style={{ ...PS.textarea, minHeight: 70 }} placeholder='What happened? Who attended? Key takeaways?' />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={PS.btnPrimary} disabled={eBusy || !ef.title.trim()} onClick={saveEvent}>{eBusy ? 'Saving…' : editingEvent ? 'Save changes' : 'Add event'}</button>
                <button style={PS.btn} onClick={() => { setAddingEvent(false); setEditingEvent(null); }}>Cancel</button>
              </div>
            </Card>
          )}

          {events.length === 0 && !addingEvent ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5, textAlign: 'center', padding: '16px 0' }}>No events yet. Add upcoming and past events to track progress.</div></Card>
          ) : (
            <>
              {upcomingEvents.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent, marginBottom: 8 }}>Upcoming</div>
                  {upcomingEvents.map(e => (
                    <Card key={e.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{e.title}</div>
                          <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                            {e.event_date ? new Date(e.event_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }) : 'Date TBD'}
                            {e.location ? ` · ${e.location}` : ''}
                          </div>
                          {e.notes && <div style={{ fontSize: 12, color: POA.textSecondary, marginTop: 6, lineHeight: 1.55 }}>{e.notes}</div>}
                        </div>
                        {manage && (
                          <button style={{ ...PS.btn, fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
                            onClick={() => { setEditingEvent(e); setEf({ title: e.title, event_date: e.event_date || '', location: e.location || '', amount_raised: e.amount_raised || '', notes: e.notes || '', status: e.status }); setAddingEvent(false); }}>
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {events.filter(e => e.status !== 'upcoming').length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 8 }}>Past events</div>
                  {events.filter(e => e.status !== 'upcoming').map(e => (
                    <Card key={e.id} style={{ marginBottom: 8, opacity: e.status === 'cancelled' ? .5 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{e.title}</div>
                          <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                            {e.event_date ? new Date(e.event_date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unknown'}
                            {e.location ? ` · ${e.location}` : ''}
                          </div>
                          {e.amount_raised && <div style={{ fontSize: 13, color: POA.green, fontWeight: 700, marginTop: 4 }}>Raised {money(e.amount_raised)}</div>}
                          {e.notes && <div style={{ fontSize: 12, color: POA.textSecondary, marginTop: 6, lineHeight: 1.55 }}>{e.notes}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: e.status === 'completed' ? 'rgba(70,199,147,.14)' : 'rgba(239,106,100,.14)', color: e.status === 'completed' ? POA.green : POA.red }}>
                            {e.status}
                          </span>
                          {manage && (
                            <button style={{ ...PS.btn, fontSize: 11, padding: '4px 8px' }}
                              onClick={() => { setEditingEvent(e); setEf({ title: e.title, event_date: e.event_date || '', location: e.location || '', amount_raised: e.amount_raised || '', notes: e.notes || '', status: e.status }); setAddingEvent(false); }}>
                              <Pencil size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ACTIVITY TAB */}
      {tab === 'activity' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: POA.textMuted }}>Log of everything that's happened with this cause.</div>
            {manage && <button style={PS.btn} onClick={() => setAddingEntry(v => !v)}><Plus size={13} /> Log activity</button>}
          </div>

          {addingEntry && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>Log activity</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Type</div>
                  <select value={af.kind} onChange={e => setAf(x => ({ ...x, kind: e.target.value }))} style={PS.input}>
                    {['contribution','participation','outcome','update','meeting','phone_call','email','other'].map(k => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
                  <input type='date' value={af.occurred_on} onChange={e => setAf(x => ({ ...x, occurred_on: e.target.value }))} style={PS.input} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>What happened</div>
                  <input value={af.label} onChange={e => setAf(x => ({ ...x, label: e.target.value }))} style={PS.input}
                    placeholder='e.g. Called John at HEB, confirmed $500 sponsorship for toy drive' />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Amount (if any)</div>
                  <input value={af.amount} onChange={e => setAf(x => ({ ...x, amount: e.target.value }))} style={PS.input} placeholder='e.g. 500' inputMode='numeric' />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Additional notes</div>
                  <textarea value={af.note} onChange={e => setAf(x => ({ ...x, note: e.target.value }))}
                    style={{ ...PS.textarea, minHeight: 60 }} placeholder='Follow-up needed? Next steps? Who to contact?' />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={PS.btnPrimary} disabled={aBusy || !af.label.trim()} onClick={saveEntry}>{aBusy ? 'Saving…' : 'Log it'}</button>
                <button style={PS.btn} onClick={() => setAddingEntry(false)}>Cancel</button>
              </div>
            </Card>
          )}

          {entries.length === 0 && !addingEntry ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5, textAlign: 'center', padding: '16px 0' }}>No activity logged yet. Start building the record.</div></Card>
          ) : entries.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.kind === 'contribution' ? POA.green : e.kind === 'outcome' ? POA.accent : POA.hairline2, flexShrink: 0, marginTop: 4 }} />
                {i < entries.length - 1 && <div style={{ width: 1, flex: 1, background: POA.hairline, minHeight: 20 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{e.kind.replace('_', ' ')}</span>
                  <span style={{ fontSize: 11, color: POA.textMuted }}>{e.occurred_on ? fmtShort(e.occurred_on) : ''}</span>
                  {e.amount && <span style={{ fontSize: 12, fontWeight: 700, color: POA.green, marginLeft: 'auto' }}>{money(e.amount)}</span>}
                </div>
                <div style={{ fontSize: 13.5, color: POA.textPrimary, fontWeight: 600, marginBottom: e.note ? 4 : 0 }}>{e.label}</div>
                {e.note && <div style={{ fontSize: 12.5, color: POA.textSecondary, lineHeight: 1.6 }}>{e.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CausesBoard({ me }) {
  const [rows, setRows]       = useState(null);
  const [selectedCause, setSelectedCause] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [err, setErr]         = useState("");
  const [f, setF]             = useState({ name: "", tagline: "", external_url: "", goal_amount: "", description: "", status: "active" });

  async function load() { setRows(await listCauses()); }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr("");
    const { data, error } = await supabase.from("causes").insert({ department_id: me.department_id, name: f.name.trim(), tagline: f.tagline || null, external_url: f.external_url || null, goal_amount: f.goal_amount ? Number(f.goal_amount) : null, description: f.description || null }).select().single();
    if (error) { setErr(error.message); return; }
    setAdding(false); setF({ name: "", tagline: "", external_url: "", goal_amount: "", description: "", status: "active" }); await load();
  }
  if (!rows) return <Spinner />;

  if (selectedCause) {
    return <CauseDetail
      cause={selectedCause}
      me={me}
      onBack={() => { setSelectedCause(null); load(); }}
      onRefresh={async () => {
        await load();
        const updated = rows?.find(r => r.id === selectedCause.id);
        if (updated) setSelectedCause(updated);
      }}
    />;
  }


  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Causes</p>
          <h1 style={{ fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            Association Causes
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            C4K, ATO, and every cause your association stands behind.
          </div>
        </div>
        <button style={PS.btn} onClick={() => setAdding(!adding)}><Plus size={13} /> Add cause</button>
      </div>
      <ErrBox msg={err} />
      {adding && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Cause name</div>
              <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} style={PS.input} placeholder='e.g. Cops 4 Kids' />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Tagline (optional)</div>
              <input value={f.tagline} onChange={e => setF({ ...f, tagline: e.target.value })} style={PS.input} placeholder='e.g. Supporting kids in our community' />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Description (optional)</div>
              <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} style={{ ...PS.textarea, minHeight: 70 }} placeholder='What is this cause about? How can members help?' />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Goal amount (optional)</div>
              <input value={f.goal_amount} onChange={e => setF({ ...f, goal_amount: e.target.value })} style={PS.input} placeholder='e.g. 10000' inputMode='numeric' />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>External link (optional)</div>
              <input value={f.external_url} onChange={e => setF({ ...f, external_url: e.target.value })} style={PS.input} placeholder='https://...' type='url' />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} onClick={create}>Save</button>
            <button style={PS.btn} onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>Causes are data — every association adds their own. Nothing is hardcoded.</div>
        </Card>
      )}
      {rows.length === 0 && !adding && <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No causes yet. Add your association's first initiative.</div></Card>}
      {rows.filter(c => c.status !== 'archived').map(c => {
        const raised = (c.cause_entries || []).filter(e => e.kind === 'contribution' && e.amount).reduce((s, e) => s + Number(e.amount), 0);
        const goalPct = c.goal_amount ? Math.min(100, Math.round((raised / c.goal_amount) * 100)) : null;
        const lastEntry = (c.cause_entries || []).sort((a, b) => b.occurred_on > a.occurred_on ? 1 : -1)[0];
        const allContacts = c.cause_contacts || [];
        const overdueContacts = allContacts.filter(contact => {
          if (!contact.active) return false;
          if (!contact.last_contact_date) return true; // never contacted
          const daysSince = Math.floor((new Date() - new Date(contact.last_contact_date)) / (1000 * 60 * 60 * 24));
          return daysSince > 60;
        });
        return (
          <div key={c.id} style={{ background: 'linear-gradient(160deg, #101828 0%, #0A1020 100%)', border: `0.5px solid ${POA.hairline2}`, borderLeft: `3px solid ${c.status === 'active' ? POA.accent : POA.amber}`, borderRadius: '0 13px 13px 0', padding: '16px 18px', marginBottom: 10, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,.4)' }}
            onClick={() => setSelectedCause(c)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary, marginBottom: 2 }}>{c.name}</div>
                {c.tagline && <div style={{ fontSize: 12.5, color: POA.textMuted }}>{c.tagline}</div>}
                {c.point_person && (
                  <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: POA.accentSoft, color: POA.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                      {c.point_person.full_name.split(' ').map(w => w[0]).join('').slice(0,2)}
                    </div>
                    <span style={{ color: POA.accent }}>{c.point_person.full_name}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: c.status === 'active' ? 'rgba(70,199,147,.14)' : POA.accentSoft, color: c.status === 'active' ? POA.green : POA.textMuted, flexShrink: 0 }}>
                {c.status}
              </span>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: goalPct !== null ? 10 : 0 }}>
              <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: POA.green }}>{money(raised)}</div>
                <div style={{ fontSize: 10, color: POA.textMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Raised</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: POA.accent }}>{c.goal_amount ? money(c.goal_amount) : '—'}</div>
                <div style={{ fontSize: 10, color: POA.textMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Goal</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: POA.textPrimary }}>{allContacts.filter(x => x.active).length}</div>
                <div style={{ fontSize: 10, color: POA.textMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Contacts</div>
              </div>
              <div style={{ background: overdueContacts.length > 0 ? 'rgba(240,180,74,.1)' : 'rgba(0,0,0,.2)', border: overdueContacts.length > 0 ? '0.5px solid rgba(240,180,74,.3)' : 'none', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: overdueContacts.length > 0 ? POA.amber : POA.textMuted }}>{overdueContacts.length}</div>
                <div style={{ fontSize: 10, color: overdueContacts.length > 0 ? POA.amber : POA.textMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Follow-up due</div>
              </div>
            </div>

            {/* Progress bar */}
            {goalPct !== null && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${goalPct}%`, background: `linear-gradient(90deg, ${POA.accent}, #F0C84A)`, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 10, color: POA.textMuted, marginTop: 3 }}>{goalPct}% of goal</div>
              </div>
            )}

            {/* Last activity + chevron */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: POA.textMuted }}>
                {lastEntry ? `Last activity: ${fmtShort(lastEntry.occurred_on)}` : 'No activity logged yet'}
              </div>
              <ChevronRight size={15} color={POA.textMuted} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MembersBoard({ me }) {
  const [members, setMembers] = useState(null);
  const [q, setQ]             = useState("");
  const [filterRank, setFilterRank]       = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterStanding, setFilterStanding] = useState('');
  const [filterStatus, setFilterStatus]   = useState('active');
  const [showFilters, setShowFilters]     = useState(false);
  const [copied, setCopied]               = useState(false);
  const [onCallData, setOnCallData]   = useState([]);
  const [showOnCall, setShowOnCall]   = useState(false);
  const [ocForm, setOcForm]           = useState([
    { priority: 1, name: "", phone: "", member_id: "", notes: "", active_until: "" },
    { priority: 2, name: "", phone: "", member_id: "", notes: "", active_until: "" },
  ]);
  const [ocBusy, setOcBusy]           = useState(false);
  const [ocErr, setOcErr]             = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing]   = useState(false);
  const [ef, setEf]             = useState({});
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr]   = useState('');
  const [inviting, setInviting]   = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteErr, setInviteErr] = useState('');
  const [adding, setAdding]     = useState(false);
  const [af, setAf]             = useState({ full_name: '', email: '', badge: '', district: '', rank: '', phone: '', access: ['Member'], standing: 'Good', status: 'active' });

  useEffect(() => { listMembers().then(setMembers); }, []);

  useEffect(() => {
    getOnCall().then(d => {
      setOnCallData(d);
      setOcForm(prev => prev.map(f => {
        const existing = d.find(x => x.priority === f.priority);
        return existing ? {
          priority: f.priority,
          name: existing.name,
          phone: existing.phone,
          member_id: existing.member_id || "",
          notes: existing.notes || "",
          active_until: existing.active_until ? existing.active_until.split("T")[0] : "",
        } : f;
      }));
    }).catch(() => null);
  }, []);

  async function saveOnCall() {
    setOcBusy(true); setOcErr("");
    try {
      for (const f of ocForm) {
        if (f.name.trim() && f.phone.trim()) {
          await setOnCall(me.department_id, f.priority, f.name.trim(), f.phone.trim(),
            f.member_id || null, f.notes.trim() || null,
            f.active_until ? new Date(f.active_until + "T23:59:59").toISOString() : null,
            me.id);
        } else {
          await clearOnCall(me.department_id, f.priority).catch(() => null);
        }
      }
      const updated = await getOnCall();
      setOnCallData(updated);
      setShowOnCall(false);
    } catch(e) { setOcErr(e.message); }
    finally { setOcBusy(false); }
  }

  async function saveEdit() {
    setEditBusy(true); setEditErr('');
    try {
      await supabase.from('members').update({
        full_name: ef.full_name,
        badge: ef.badge || null,
        district: ef.district || null,
        rank: ef.rank || null,
        phone: ef.phone || null,
        standing: ef.standing,
        status: ef.status,
        dues_paid_through: ef.dues_paid_through || null,
        member_since: ef.member_since || null,
        preferred_contact: ef.preferred_contact || null,
        access: ef.access || ['Member'],
      }).eq('id', selected.id);
      await listMembers().then(setMembers);
      setSelected(prev => ({ ...prev, ...ef }));
      setEditing(false);
    } catch(e) { setEditErr(e.message); }
    finally { setEditBusy(false); }
  }

  async function doInvite() {
    setInviting(true); setInviteErr(''); setInviteSent(false);
    try {
      const res = await fetch('/api/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selected.email, full_name: selected.full_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 5000);
    } catch(e) { setInviteErr(e.message); }
    finally { setInviting(false); }
  }

  async function doAddMember() {
    setEditBusy(true); setEditErr('');
    try {
      await supabase.from('members').insert({
        department_id: me.department_id,
        full_name: af.full_name.trim(),
        email: af.email.trim(),
        badge: af.badge || null,
        district: af.district || null,
        rank: af.rank || null,
        phone: af.phone || null,
        standing: af.standing,
        status: af.status,
        access: af.access,
      });
      await listMembers().then(setMembers);
      setAdding(false);
      setAf({ full_name: '', email: '', badge: '', district: '', rank: '', phone: '', access: ['Member'], standing: 'Good', status: 'active' });
    } catch(e) { setEditErr(e.message); }
    finally { setEditBusy(false); }
  }

  if (!members) return <Spinner />;

  if (selected) {
    return (
      <div>
        <button onClick={() => { setSelected(null); setEditing(false); }} style={{ ...PS.btn, marginBottom: 16 }}>
          <ArrowLeft size={13} /> Members
        </button>
        {editErr && <ErrBox msg={editErr} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: POA.accentSoft, color: POA.accent, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{initials(selected.full_name)}</div>
          <div>
            <h2 style={{ fontFamily: 'inherit', fontSize: 22, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>{selected.full_name}</h2>
            <div style={{ fontSize: 13, color: POA.textMuted }}>{selected.email}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {!editing && (
                <button style={{ ...PS.btn }} onClick={() => { setEf({ full_name: selected.full_name, badge: selected.badge || '', district: selected.district || '', rank: selected.rank || '', phone: selected.phone || '', standing: selected.standing || 'Good', status: selected.status || 'active', dues_paid_through: selected.dues_paid_through || '', member_since: selected.member_since || '', availability_note: selected.availability_note || '', preferred_contact: selected.preferred_contact || '', access: selected.access || ['Member'] }); setEditing(true); }}>
                  <Pencil size={12} /> Edit
                </button>
              )}
              {canAdmin(me.access) && !editing && (
                <button style={{ ...PS.btnPrimary, fontSize: 12 }} disabled={inviting || !selected.email}
                  onClick={doInvite}>
                  {inviting ? 'Sending…' : <><Mail size={12} /> Send invite</>}
                </button>
              )}
            </div>
            {inviteSent && <div style={{ fontSize: 11, color: POA.green }}>✓ Invite sent to {selected.email}</div>}
            {inviteErr && <div style={{ fontSize: 11, color: POA.red }}>{inviteErr}</div>}
          </div>
        </div>

        {editing ? (
          <Card>
            <SectionTitle>Edit member</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Full name</div>
                <input value={ef.full_name} onChange={e => setEf(x => ({ ...x, full_name: e.target.value }))} style={PS.input} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Badge #</div>
                <input value={ef.badge} onChange={e => setEf(x => ({ ...x, badge: e.target.value }))} style={PS.input} placeholder='e.g. 4471' />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>District</div>
                <input value={ef.district} onChange={e => setEf(x => ({ ...x, district: e.target.value }))} style={PS.input} placeholder='e.g. 4' />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Rank</div>
                <input value={ef.rank || ''} onChange={e => setEf(x => ({ ...x, rank: e.target.value }))}
                  style={PS.input} placeholder='e.g. Patrol, Sergeant, Lieutenant, Detective' />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Phone</div>
                <input value={ef.phone} onChange={e => setEf(x => ({ ...x, phone: e.target.value }))} style={PS.input} placeholder='(817) 555-0100' type='tel' />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Standing</div>
                <select value={ef.standing} onChange={e => setEf(x => ({ ...x, standing: e.target.value }))} style={PS.input}>
                  <option>Good</option>
                  <option>Probationary</option>
                  <option>Suspended</option>
                  <option>Lapsed</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Status</div>
                <select value={ef.status} onChange={e => setEf(x => ({ ...x, status: e.target.value }))} style={PS.input}>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                  <option value='retired'>Retired</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Roles</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Member','Board','DeptAdmin','Officer','Secretary','Treasurer'].map(role => {
                    const selected = (ef.access || []).includes(role);
                    return (
                      <button key={role} type='button'
                        onClick={() => {
                          const cur = ef.access || [];
                          const updated = selected && role !== 'Member'
                            ? cur.filter(r => r !== role)
                            : cur.includes(role) ? cur : [...cur, role];
                          setEf(x => ({ ...x, access: updated.length ? updated : ['Member'] }));
                        }}
                        style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999, border: `0.5px solid ${selected ? POA.accent : POA.hairline2}`, background: selected ? POA.accentSoft : 'transparent', color: selected ? POA.accent : POA.textMuted, cursor: 'pointer', fontWeight: selected ? 700 : 400 }}>
                        {role}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4 }}>Member is always included. Select additional roles as needed.</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Dues paid through</div>
                <input type='date' value={ef.dues_paid_through} onChange={e => setEf(x => ({ ...x, dues_paid_through: e.target.value }))} style={PS.input} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Member since</div>
                <input type='date' value={ef.member_since} onChange={e => setEf(x => ({ ...x, member_since: e.target.value }))} style={PS.input} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Availability</div>
                <div style={{ ...PS.input, background: 'rgba(255,255,255,.03)', color: POA.textMuted, fontSize: 12, fontStyle: 'italic', cursor: 'default' }}>
                  {(() => {
                    if (!selected?.availability_note) return 'Not set — officer manages this in My Profile';
                    try {
                      const avail = JSON.parse(selected.availability_note);
                      const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                      const fmt = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr-12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`; };
                      const parts = DAYS.filter(d => avail.schedule?.[d]?.enabled)
                        .map(d => {
                          const slots = avail.schedule[d].slots || [{ start: avail.schedule[d].start, end: avail.schedule[d].end }];
                          return `${d} ${slots.map(s => `${fmt(s.start)}–${fmt(s.end)}`).join(', ')}`;
                        });
                      return parts.length > 0 ? parts.join(' · ') : 'No schedule set';
                    } catch { return selected.availability_note || 'Not set'; }
                  })()}
                </div>
                <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                  Officers set their own availability in My Profile.
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Preferred contact</div>
                <select value={ef.preferred_contact} onChange={e => setEf(x => ({ ...x, preferred_contact: e.target.value }))} style={PS.input}>
                  <option value=''>— No preference —</option>
                  <option value='phone'>Phone</option>
                  <option value='text'>Text</option>
                  <option value='email'>Email</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={PS.btnPrimary} disabled={editBusy} onClick={saveEdit}>{editBusy ? 'Saving…' : 'Save changes'}</button>
              <button style={PS.btn} onClick={() => setEditing(false)}>Cancel</button>
              <button style={{ ...PS.btn, color: POA.red, marginLeft: 'auto' }}
                disabled={editBusy}
                onClick={async () => {
                  if (!confirm(selected.status === 'active' ? 'Deactivate this member?' : 'Reactivate this member?')) return;
                  setEditBusy(true);
                  try {
                    await supabase.from('members').update({ status: selected.status === 'active' ? 'inactive' : 'active' }).eq('id', selected.id);
                    await listMembers().then(setMembers);
                    setSelected(prev => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }));
                    setEditing(false);
                  } catch(e) { setEditErr(e.message); }
                  finally { setEditBusy(false); }
                }}>
                {selected.status === 'active' ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Badge', value: selected.badge || '—' },
              { label: 'District', value: selected.district || '—' },
              { label: 'Rank', value: selected.rank || '—' },
              { label: 'Phone', value: selected.phone || '—' },
              { label: 'Standing', value: selected.standing || 'Good' },
              { label: 'Status', value: selected.status || 'active' },
              { label: 'Dues paid through', value: selected.dues_paid_through ? new Date(selected.dues_paid_through).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—' },
              { label: 'Member since', value: selected.member_since ? new Date(selected.member_since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—' },
              { label: 'Preferred contact', value: selected.preferred_contact || '—' },
            ].map(({ label, value }) => (
              <Card key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: POA.textPrimary }}>{value}</div>
              </Card>
            ))}
            {selected.availability_note && (
              <Card style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 4 }}>Availability</div>
                <div style={{ fontSize: 13.5, color: POA.textSecondary }}>{selected.availability_note}</div>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }

  const filtered = members.filter(m => {
    if (q && !m.full_name?.toLowerCase().includes(q.toLowerCase()) && !m.email?.toLowerCase().includes(q.toLowerCase())) return false;
    if (filterRank && m.rank !== filterRank) return false;
    if (filterDistrict && m.district !== filterDistrict) return false;
    if (filterStanding && m.standing !== filterStanding) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    return true;
  });
  const ranks = [...new Set(members.filter(m => m.rank).map(m => m.rank))].sort();
  const districts = [...new Set(members.filter(m => m.district).map(m => m.district))].sort();
  const standings = [...new Set(members.filter(m => m.standing).map(m => m.standing))].sort();

  function copyEmails() {
    const emails = filtered.filter(m => m.email).map(m => m.email).join(', ');
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Badge', 'Rank', 'District', 'Phone', 'Standing', 'Status'],
      ...filtered.map(m => [m.full_name || '', m.email || '', m.badge || '', m.rank || '', m.district || '', m.phone || '', m.standing || '', m.status || ''])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'members.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageTitle sub={isDeptAdmin(me.access) ? "Full roster — you can add and edit members" : "Your association's full roster"}>Members</PageTitle>

      {canAdmin(me.access) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <button style={PS.btn} onClick={() => setAdding(v => !v)}><Plus size={13} /> Add member</button>
        </div>
      )}
      {adding && canAdmin(me.access) && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>Add member</SectionTitle>
          {editErr && <ErrBox msg={editErr} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Full name</div>
              <input value={af.full_name} onChange={e => setAf(x => ({ ...x, full_name: e.target.value }))} style={PS.input} placeholder='Officer full name' />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Email</div>
              <input type='email' value={af.email} onChange={e => setAf(x => ({ ...x, email: e.target.value }))} style={PS.input} placeholder='officer@fwpd.gov' />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Badge #</div>
              <input value={af.badge} onChange={e => setAf(x => ({ ...x, badge: e.target.value }))} style={PS.input} placeholder='e.g. 4471' />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>District</div>
              <input value={af.district} onChange={e => setAf(x => ({ ...x, district: e.target.value }))} style={PS.input} placeholder='e.g. 4' />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Rank</div>
              <input value={af.rank || ''} onChange={e => setAf(x => ({ ...x, rank: e.target.value }))}
                style={PS.input} placeholder='e.g. Patrol, Sergeant, Lieutenant, Detective' />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Phone</div>
              <input value={af.phone || ''} onChange={e => setAf(x => ({ ...x, phone: e.target.value }))}
                style={PS.input} placeholder='(817) 555-0100' type='tel' />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Roles</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Member','Board','DeptAdmin','Officer','Secretary','Treasurer'].map(role => {
                  const selected = (af.access || ['Member']).includes(role);
                  return (
                    <button key={role} type='button'
                      onClick={() => {
                        const cur = af.access || ['Member'];
                        const updated = selected && role !== 'Member'
                          ? cur.filter(r => r !== role)
                          : cur.includes(role) ? cur : [...cur, role];
                        setAf(x => ({ ...x, access: updated.length ? updated : ['Member'] }));
                      }}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999, border: `0.5px solid ${selected ? POA.accent : POA.hairline2}`, background: selected ? POA.accentSoft : 'transparent', color: selected ? POA.accent : POA.textMuted, cursor: 'pointer', fontWeight: selected ? 700 : 400 }}>
                      {role}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4 }}>Member is always included. Select additional roles as needed.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={PS.btnPrimary} disabled={editBusy || !af.full_name.trim() || !af.email.trim()} onClick={doAddMember}>
              {editBusy ? 'Adding…' : 'Add member'}
            </button>
            <button style={PS.btn} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </Card>
      )}

      {/* On-call management card */}
      <Card style={{ marginBottom: 18, borderLeft: `3px solid ${POA.red}`, borderRadius: "0 14px 14px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: onCallData.length > 0 ? 10 : 0 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.red, marginBottom: 2 }}>On-Call Officer</div>
            {onCallData.length === 0
              ? <div style={{ fontSize: 13, color: POA.textMuted }}>No one set — members' SOS button will show Who to Call.</div>
              : onCallData.map((oc, i) => (
                <div key={oc.id} style={{ fontSize: 13, color: POA.textPrimary, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: POA.textMuted, marginRight: 6 }}>{i === 0 ? "PRIMARY" : "BACKUP"}</span>
                  <strong>{oc.name}</strong> · {oc.phone}
                  {oc.notes && <span style={{ color: POA.textMuted }}> · {oc.notes}</span>}
                </div>
              ))
            }
          </div>
          {canManage(me.access) && (
            <button style={PS.btn} onClick={() => setShowOnCall(v => !v)}>
              {showOnCall ? "Cancel" : onCallData.length > 0 ? "Update" : "Set on-call"}
            </button>
          )}
        </div>
        {showOnCall && (
          <div style={{ borderTop: `0.5px solid ${POA.hairline}`, paddingTop: 14, marginTop: 4 }}>
            {ocForm.map((f, idx) => (
              <div key={f.priority} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: idx === 0 ? POA.red : POA.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".1em" }}>
                  {idx === 0 ? "Primary on-call" : "Backup on-call"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Name</div>
                    <input value={f.name} onChange={e => setOcForm(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                      style={PS.input} placeholder="Officer name" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Phone</div>
                    <input value={f.phone} onChange={e => setOcForm(prev => prev.map((x, i) => i === idx ? { ...x, phone: e.target.value } : x))}
                      style={PS.input} placeholder="(817) 555-0100" type="tel" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Or pick from roster</div>
                    <select value={f.member_id} onChange={e => {
                      const m = members.find(x => x.id === e.target.value);
                      setOcForm(prev => prev.map((x, i) => i === idx ? { ...x, member_id: e.target.value, name: m ? m.full_name : x.name } : x));
                    }} style={PS.input}>
                      <option value="">— Type name above —</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.badge ? ` · ${m.badge}` : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>On-call until (optional)</div>
                    <input type="date" value={f.active_until} onChange={e => setOcForm(prev => prev.map((x, i) => i === idx ? { ...x, active_until: e.target.value } : x))}
                      style={PS.input} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Notes (role, shift, etc.)</div>
                  <input value={f.notes} onChange={e => setOcForm(prev => prev.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))}
                    style={PS.input} placeholder="e.g. District 4 rep, available after 6pm" />
                </div>
              </div>
            ))}
            {ocErr && <div style={{ fontSize: 12, color: POA.red, marginBottom: 8 }}>{ocErr}</div>}
            <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={ocBusy} onClick={saveOnCall}>
              {ocBusy ? "Saving…" : "Save on-call officers"}
            </button>
            <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
              Primary is who members call first. Backup shows if primary doesn't answer. SOS button dials primary directly.
            </div>
          </div>
        )}
      </Card>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <button style={{ ...PS.btn, fontSize: 12 }} onClick={() => setShowFilters(v => !v)}>
          <Filter size={13} /> Filters {(filterRank || filterDistrict || filterStanding || filterStatus !== 'active') ? '●' : ''}
        </button>
        <div style={{ fontSize: 12, color: POA.textMuted, flex: 1 }}>
          {filtered.length} member{filtered.length !== 1 ? 's' : ''} match
        </div>
        <button style={{ ...PS.btn, fontSize: 12 }} onClick={copyEmails} disabled={filtered.length === 0}>
          {copied ? '✓ Copied!' : <><Mail size={12} /> Copy emails</>}
        </button>
        <button style={{ ...PS.btn, fontSize: 12 }} onClick={exportCSV} disabled={filtered.length === 0}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      {showFilters && (
        <div style={{ background: 'rgba(255,255,255,.03)', border: `0.5px solid ${POA.hairline}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Rank</div>
              <select value={filterRank} onChange={e => setFilterRank(e.target.value)} style={PS.input}>
                <option value=''>All ranks</option>
                {ranks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>District</div>
              <select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} style={PS.input}>
                <option value=''>All districts</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Standing</div>
              <select value={filterStanding} onChange={e => setFilterStanding(e.target.value)} style={PS.input}>
                <option value=''>All standings</option>
                {standings.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Status</div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={PS.input}>
                <option value=''>All statuses</option>
                <option value='active'>Active</option>
                <option value='inactive'>Inactive</option>
                <option value='retired'>Retired</option>
              </select>
            </div>
          </div>
          <button style={{ ...PS.btn, fontSize: 11, marginTop: 10 }}
            onClick={() => { setFilterRank(''); setFilterDistrict(''); setFilterStanding(''); setFilterStatus('active'); }}>
            Reset filters
          </button>
        </div>
      )}

      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email…" style={{ ...PS.input, marginBottom: 14 }} />
      {filtered.map(m => (
        <Card key={m.id} style={{ cursor: 'pointer', marginBottom: 8 }} onClick={() => { setSelected(m); setEditing(false); }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: POA.accentSoft, color: POA.accent, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{initials(m.full_name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{m.full_name}</div>
              <div style={{ fontSize: 12, color: POA.textMuted }}>{m.email}{m.badge ? ` · Badge ${m.badge}` : ""}{m.phone ? ` · ${m.phone}` : ""}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: POA.accent }}>{(m.access || []).filter(r => r !== "Member").join(", ") || "Member"}</div>
              <div style={{ fontSize: 11, color: m.standing === "Good" ? POA.greenText : POA.amberText, marginTop: 2 }}>{m.standing}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// =====================================================================
// PASTE THIS INTO App.jsx
// 1. Add to imports at top:
//    import { QRCodeCanvas } from "qrcode.react";
// 2. Add to package.json deps (Claude Code: npm install qrcode.react):
//    "qrcode.react": "^3.1.0"
// 3. Replace <ComingSoon label="Meeting Attendance" /> in renderScreen()
//    with: <MeetingAttendance me={me} />
// 4. Run attendance.sql in Supabase SQL Editor first.
// =====================================================================

// ---- Data helpers (add alongside other async functions in App.jsx) ----

async function listEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*, event_attendance(member_id, checked_in_at), event_assignments(member_id)")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getEventAssignments(eventId) {
  const { data, error } = await supabase
    .from("event_assignments")
    .select("member_id")
    .eq("event_id", eventId);
  if (error) throw error;
  return (data || []).map(r => r.member_id);
}

async function updateEventAssignments(eventId, assignAll, memberIds) {
  const { error } = await supabase.rpc("update_event_assignments", {
    p_event: eventId,
    p_assign_all: assignAll,
    p_member_ids: memberIds,
  });
  if (error) throw error;
}

async function createEvent(row) {
  const { data, error } = await supabase.from("events").insert(row).select().single();
  if (error) throw error;
  return data;
}

async function openSignin(eventId) {
  const { data, error } = await supabase.rpc("open_signin", { p_event: eventId });
  if (error) throw error;
  return data; // the 6-char token
}

async function closeSignin(eventId) {
  const { error } = await supabase.rpc("close_signin", { p_event: eventId });
  if (error) throw error;
}

async function memberCheckIn(eventId, token) {
  const { data, error } = await supabase.rpc("member_check_in", {
    p_event: eventId,
    p_token: token,
  });
  if (error) throw error;
  return data; // { ok, already, reason, member_id }
}

async function completeEvent(eventId) {
  const { data, error } = await supabase.rpc("complete_event", { p_event: eventId });
  if (error) throw error;
  return data;
}

async function toggleManualAttend(eventId, memberId, deptId, present) {
  if (present) {
    const { error } = await supabase
      .from("event_attendance")
      .delete()
      .eq("event_id", eventId)
      .eq("member_id", memberId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("event_attendance").insert({
      department_id: deptId,
      event_id: eventId,
      member_id: memberId,
      checked_in_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

// ---- Calendar helpers ----
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DOW    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const KIND_COLOR = {
  meeting:   "#9B6BE6",
  board:     "#5a3f8c",
  training:  "#46C793",
  community: "#F0B44A",
  general:   "#57B6E0",
  other:     "#7A7296",
};

// =====================================================================
// MEETING ATTENDANCE SCREEN
// =====================================================================
function MeetingAttendance({ me }) {
  const today      = new Date();
  const [cur, setCur]             = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [events, setEvents]       = useState(null);
  const [members, setMembers]     = useState([]);
  const [detail, setDetail]       = useState(null);   // selected event
  const [adding, setAdding]       = useState(false);
  const [signinTokens, setSigninTokens] = useState({}); // eventId -> live token
  const [err, setErr]             = useState("");
  const [busy, setBusy]           = useState(false);
  const [eventHistory, setEventHistory]   = useState([]);
  const [showHistory, setShowHistory]     = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [newEvt, setNewEvt]       = useState({
    title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all", attendance_mode: "qr", assign_all: true, assigned_ids: [],
  });

  async function load() {
    const [evts, mems] = await Promise.all([listEvents(), listMembers()]);
    setEvents(evts);
    setMembers(mems);
    // re-sync detail if open
    if (detail) setDetail(evts.find(e => e.id === detail.id) || null);
  }
  useEffect(() => { load(); }, []);

  async function loadHistory() {
    const { data, error } = await supabase
      .from('events')
      .select('*, event_attendance(member_id)')
      .eq('department_id', me.department_id)
      .eq('done', true)
      .neq('status', 'archived')
      .order('event_date', { ascending: false });
    if (!error) setEventHistory(data || []);
  }

  async function doArchiveEvent(id) {
    if (!confirm('Archive this event? It will be hidden from history but the data is preserved.')) return;
    const { error } = await supabase
      .from('events')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('department_id', me.department_id);
    if (!error) loadHistory();
  }

  // ---- QR check-in capture on URL params (mirrors fire) ----
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const eid = p.get("checkin");
    const tok = p.get("t");
    if (!eid || !tok) return;
    // strip params from URL without reload
    window.history.replaceState({}, "", window.location.pathname);
    memberCheckIn(eid, tok).then(res => {
      if (res.ok) {
        setErr(res.already ? "✓ Already checked in." : "✓ Checked in!");
      } else {
        setErr("Check-in failed: " + (res.reason || "unknown error"));
      }
      load();
    }).catch(e => setErr("Check-in error: " + e.message));
  }, []);

  const checkinURL = (eventId, token) =>
    `${window.location.origin}${window.location.pathname}?checkin=${eventId}&t=${token}`;

  async function doOpenSignin(evt) {
    setErr("");
    try {
      const tok = await openSignin(evt.id);
      setSigninTokens(t => ({ ...t, [evt.id]: tok }));
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function doCloseSignin(evt) {
    setErr("");
    try {
      await closeSignin(evt.id);
      setSigninTokens(t => { const n = { ...t }; delete n[evt.id]; return n; });
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function doComplete(evt) {
    if (!confirm(`Mark "${evt.title}" as done? This locks attendance.`)) return;
    setBusy(true); setErr("");
    try { await completeEvent(evt.id); await load(); setDetail(null); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doToggle(evt, memberId) {
    const present = (evt.event_attendance || []).some(a => a.member_id === memberId);
    try {
      await toggleManualAttend(evt.id, memberId, me.department_id, present);
      await load();
    } catch (e) { setErr(e.message); }
  }

  async function doCreate() {
    if (!newEvt.title.trim() || !newEvt.event_date) { setErr("Title and date are required."); return; }
    setBusy(true); setErr("");
    try {
      const created = await createEvent({
        department_id: me.department_id,
        title: newEvt.title.trim(),
        kind: newEvt.kind,
        event_date: newEvt.event_date,
        event_time: newEvt.event_time || null,
        location: newEvt.location.trim() || null,
        notes: newEvt.notes.trim() || null,
        visibility: newEvt.visibility,
        attendance_mode: newEvt.attendance_mode,
        assign_all: newEvt.assign_all,
        created_by: me.id,
      });
      if (!newEvt.assign_all && newEvt.assigned_ids.length > 0) {
        await updateEventAssignments(created.id, false, newEvt.assigned_ids);
      }
      setAdding(false);
      setNewEvt({ title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all", attendance_mode: "qr", assign_all: true, assigned_ids: [] });
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (!events) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
      <Loader2 size={22} color={POA.accent} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  // ---- build calendar grid ----
  const dim      = new Date(cur.y, cur.m + 1, 0).getDate();
  const startDow = new Date(cur.y, cur.m, 1).getDay();
  const cells    = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const eventsThisMonth = events.filter(e => {
    const d = new Date(e.event_date + "T12:00:00");
    return d.getFullYear() === cur.y && d.getMonth() === cur.m;
  });
  const byDay = {};
  eventsThisMonth.forEach(e => {
    const d = new Date(e.event_date + "T12:00:00").getDate();
    (byDay[d] = byDay[d] || []).push(e);
  });

  const isToday = d => d && cur.y === today.getFullYear() && cur.m === today.getMonth() && d === today.getDate();

  // ---- detail panel ----
  if (detail) {
    const att       = detail.event_attendance || [];
    const liveToken = signinTokens[detail.id];
    const manage    = canManage(me.access);

    return (
      <div>
        <button onClick={() => { setDetail(null); setErr(""); }}
          style={{ ...PS.btn, marginBottom: 16 }}>
          <ArrowLeft size={13} /> Calendar
        </button>

        {err && <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", color: POA.greenText, borderRadius: 10, padding: "11px 14px", fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: KIND_COLOR[detail.kind] || POA.accent, marginTop: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ ...PS.kicker, marginBottom: 4 }}>{detail.kind}</p>
            <h2 style={{ fontFamily: "inherit", fontSize: 22, fontWeight: 700, color: POA.textPrimary, margin: "0 0 4px" }}>{detail.title}</h2>
            <div style={{ fontSize: 13, color: POA.textMuted }}>
              {new Date(detail.event_date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {detail.event_time ? ` · ${detail.event_time.slice(0,5)}` : ""}
              {detail.location ? ` · ${detail.location}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: detail.done ? "rgba(70,199,147,.14)" : POA.accentSoft, color: detail.done ? POA.green : POA.accent }}>
              {detail.done ? "Done" : "Open"}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: POA.track, color: POA.textMuted }}>
              {detail.attendance_mode === "qr" ? "QR sign-in" : detail.attendance_mode === "manual" ? "Manual sign-in" : "No sign-in"}
            </span>
          </div>
        </div>

        {detail.notes && (
          <div style={{ ...PS.card, padding: "12px 15px", marginBottom: 14, fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65 }}>
            {detail.notes}
          </div>
        )}

        {/* ---- QR sign-in panel (board only, event not done) ---- */}
        {manage && !detail.done && (detail.attendance_mode === 'qr' || !detail.attendance_mode) && (
          <div style={{ ...PS.card, padding: "16px 18px", marginBottom: 16 }}>
            <p style={{ ...PS.kicker, marginBottom: 10 }}>QR sign-in</p>
            {!liveToken ? (
              <div>
                <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 10, lineHeight: 1.55 }}>
                  {detail.signin_open
                    ? <>A sign-in is live for <b style={{ color: POA.textPrimary }}>{detail.title}</b>. Show the code to display the QR (generates a fresh one).</>
                    : <>Open a QR sign-in. Members scan on their own phone — the code records <em>their</em> attendance, not whoever shows the screen.</>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={PS.btnPrimary} onClick={() => doOpenSignin(detail)}>
                    <QrCode size={15} /> {detail.signin_open ? "Show / refresh code" : "Open sign-in"}
                  </button>
                  {detail.signin_open && (
                    <button style={PS.btn} onClick={() => doCloseSignin(detail)}>
                      <X size={13} color={POA.red} /> Close
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
                {/* QR code */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ background: "#fff", padding: 10, borderRadius: 12, display: "inline-block" }}>
                    <QRCodeCanvas value={checkinURL(detail.id, liveToken)} size={180} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: POA.textMuted }}>
                    Code: <b style={{ letterSpacing: 3, color: POA.textPrimary, fontFamily: "monospace" }}>{liveToken}</b>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
                    <button style={PS.btn} onClick={() => doOpenSignin(detail)}>
                      <RefreshCw size={13} /> Rotate
                    </button>
                    <button style={PS.btn} onClick={() => doCloseSignin(detail)}>
                      <X size={13} color={POA.red} /> Close
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 8, maxWidth: 200, lineHeight: 1.5 }}>
                    Each event gets its own code. Rotate if it leaks. Scanning records the member's own check-in.
                  </div>
                </div>

                {/* Live signed-in list */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: POA.textMuted, letterSpacing: ".08em", marginBottom: 8 }}>
                    SIGNED IN ({att.length})
                  </div>
                  {att.length === 0
                    ? <div style={{ fontSize: 13, color: POA.textMuted }}>No one's scanned in yet.</div>
                    : att.map(a => {
                      const m = members.find(x => x.id === a.member_id);
                      const t = a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
                      return (
                        <div key={a.member_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `0.5px solid ${POA.hairline}`, fontSize: 13 }}>
                          <CheckCircle2 size={15} color={POA.green} style={{ flexShrink: 0 }} />
                          <span style={{ flex: 1, color: POA.textPrimary }}>{m?.full_name || "Member"}{a.member_id === me.id ? " (you)" : ""}</span>
                          <span style={{ fontSize: 11, color: POA.textMuted }}>{t}</span>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- Roster / manual toggle ---- */}
        <div style={{ ...PS.card, padding: "16px 18px", marginBottom: 14 }}>
          {(() => {
            const roster = detail.assign_all ? members : members.filter(m => (detail.event_assignments || []).some(a => a.member_id === m.id));
            return <p style={{ ...PS.kicker, marginBottom: 10 }}>Sign-in sheet ({att.length} / {roster.length}){detail.assign_all ? "" : " · assigned only"}</p>;
          })()}
          <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 10 }}>
            {manage && !detail.done ? "Tap a name to mark them signed in, or use the QR code for self-serve." : "Sign-in record."}
          </div>
          {(detail.assign_all
            ? members
            : members.filter(m => (detail.event_assignments || []).some(a => a.member_id === m.id))
          ).map(m => {
            const present = att.some(a => a.member_id === m.id);
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `0.5px solid ${POA.hairline}` }}>
                {manage && !detail.done
                  ? <button onClick={() => doToggle(detail, m.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "inline-flex" }}>
                      {present
                        ? <CheckCircle2 size={18} color={POA.green} />
                        : <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${POA.accentDim}`, display: "inline-block" }} />}
                    </button>
                  : (present ? <CheckCircle2 size={18} color={POA.green} /> : <X size={16} color={POA.red} />)
                }
                <span style={{ flex: 1, fontSize: 13.5, color: present ? POA.textPrimary : POA.textMuted }}>
                  {m.full_name}{m.id === me.id ? " (you)" : ""}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: present ? POA.greenText : POA.redText }}>
                  {present ? "SIGNED IN" : "NOT SIGNED IN"}
                </span>
              </div>
            );
          })}
        </div>

        {manage && !detail.done && (
          <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={busy} onClick={() => doComplete(detail)}>
            <CalendarCheck size={15} /> Close sign-in sheet
          </button>
        )}
      </div>
    );
  }

  // ---- calendar view ----
  return (
    <div>
      {err && (
        <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", color: POA.greenText, borderRadius: 10, padding: "11px 14px", fontSize: 13, marginBottom: 14 }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Meetings & Events</p>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            {MONTHS[cur.m]} {cur.y}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {canManage(me.access) && (
            <button style={PS.btn} onClick={() => setAdding(!adding)}>
              <Plus size={13} /> Add event
            </button>
          )}
          <button style={PS.btn} onClick={() => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 })}>‹</button>
          <button style={PS.btn} onClick={() => setCur({ y: today.getFullYear(), m: today.getMonth() })}>Today</button>
          <button style={PS.btn} onClick={() => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 })}>›</button>
        </div>
      </div>

      {/* Add event form */}
      {adding && (
        <div style={{ ...PS.card, padding: "18px 20px", marginBottom: 18 }}>
          <p style={{ ...PS.kicker, marginBottom: 12 }}>New event</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Title</div>
              <input value={newEvt.title} onChange={e => setNewEvt({ ...newEvt, title: e.target.value })} style={PS.input} placeholder="e.g. General Membership Meeting" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Type</div>
              <select value={newEvt.kind} onChange={e => setNewEvt({ ...newEvt, kind: e.target.value })} style={PS.input}>
                {["meeting","board","training","community","general","other"].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Who sees this</div>
              <select value={newEvt.visibility} onChange={e => setNewEvt({ ...newEvt, visibility: e.target.value })} style={PS.input}>
                <option value="all">All members</option>
                <option value="board">Board only</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Attendance tracking</div>
              <select value={newEvt.attendance_mode} onChange={e => setNewEvt({ ...newEvt, attendance_mode: e.target.value })} style={PS.input}>
                <option value="qr">QR sign-in (member scans)</option>
                <option value="manual">Manual sign-in (board marks)</option>
                <option value="none">No sign-in needed</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Who's invited</div>
              <select value={newEvt.assign_all ? "all" : "specific"} onChange={e => setNewEvt({ ...newEvt, assign_all: e.target.value === "all", assigned_ids: [] })} style={{ ...PS.input, marginBottom: newEvt.assign_all ? 0 : 10 }}>
                <option value="all">All members</option>
                <option value="specific">Specific members</option>
              </select>
              {!newEvt.assign_all && (
                <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", border: `0.5px solid ${POA.inputBorder}`, borderRadius: 8 }}>
                  {members.map(m => {
                    const selected = newEvt.assigned_ids.includes(m.id);
                    return (
                      <div key={m.id}
                        onClick={() => setNewEvt(prev => ({
                          ...prev,
                          assigned_ids: selected
                            ? prev.assigned_ids.filter(id => id !== m.id)
                            : [...prev.assigned_ids, m.id]
                        }))}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: `0.5px solid ${POA.hairline}`, background: selected ? POA.accentSoft : "transparent" }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${selected ? POA.accent : POA.accentDim}`, background: selected ? POA.accent : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {selected && <CheckCircle2 size={11} color="#fff" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: POA.textPrimary }}>{m.full_name}</div>
                          <div style={{ fontSize: 11, color: POA.textMuted }}>
                            {m.badge ? `Badge ${m.badge}` : "No badge"}{m.district ? ` · District ${m.district}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ padding: "7px 12px", fontSize: 11, color: POA.textMuted }}>
                    {newEvt.assigned_ids.length} selected
                  </div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
              <input type="date" value={newEvt.event_date} onChange={e => setNewEvt({ ...newEvt, event_date: e.target.value })} style={PS.input} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Time (optional)</div>
              <input type="time" value={newEvt.event_time} onChange={e => setNewEvt({ ...newEvt, event_time: e.target.value })} style={PS.input} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Location (optional)</div>
              <input value={newEvt.location} onChange={e => setNewEvt({ ...newEvt, location: e.target.value })} style={PS.input} placeholder="Union Hall" />
            </div>
          </div>
          <ErrBox msg={err} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doCreate}>{busy ? "Saving…" : "Save event"}</button>
            <button style={PS.btn} onClick={() => { setAdding(false); setErr(""); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ ...PS.card, padding: "16px 18px", marginBottom: 20 }}>
        {/* Day-of-week header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 8 }}>
          {DOW.map(d => (
            <div key={d} style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".06em", padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        {/* Weeks */}
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
            {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
              const evts = d ? (byDay[d] || []) : [];
              return (
                <div key={i} style={{ minHeight: 72, background: isToday(d) ? "rgba(155,107,230,.12)" : "transparent", border: `0.5px solid ${isToday(d) ? POA.accent : POA.hairline}`, borderRadius: 8, padding: "5px 6px" }}>
                  {d && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: isToday(d) ? 700 : 400, color: isToday(d) ? POA.accent : POA.textMuted, marginBottom: 4 }}>{d}</div>
                      {evts.map(e => (
                        <button key={e.id} onClick={() => { setDetail(e); setErr(""); }}
                          style={{ display: "block", width: "100%", textAlign: "left", background: KIND_COLOR[e.kind] || POA.accent, border: "none", borderRadius: 4, padding: "3px 5px", fontSize: 10.5, fontWeight: 600, color: "#fff", marginBottom: 2, cursor: "pointer", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: e.done ? 0.5 : 1 }}>
                          {e.event_time ? e.event_time.slice(0,5) + " " : ""}{e.title}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Upcoming list below calendar */}
      <p style={{ ...PS.kicker, marginBottom: 10 }}>Upcoming events</p>
      {events.filter(e => !e.done && new Date(e.event_date + "T23:59:59") >= today).length === 0
        ? <div style={{ ...PS.card, padding: "14px 16px", color: POA.textMuted, fontSize: 13.5 }}>No upcoming events scheduled.</div>
        : events
            .filter(e => !e.done && new Date(e.event_date + "T23:59:59") >= today)
            .slice(0, 8)
            .map(e => (
              <div key={e.id} style={{ ...PS.card, padding: "13px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
                onClick={() => { setDetail(e); setErr(""); }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: KIND_COLOR[e.kind] || POA.accent, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                    {new Date(e.event_date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {e.event_time ? ` · ${e.event_time.slice(0,5)}` : ""}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: POA.textMuted }}>
                  {(e.event_attendance || []).length} / {e.assign_all ? members.length : (e.event_assignments || []).length}
                </div>
                {e.signin_open && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(70,199,147,.14)", color: POA.green }}>LIVE</span>
                )}
                <ChevronRight size={15} color={POA.textMuted} />
              </div>
            ))
      }

      {canAdmin(me.access) && (
        <div style={{ marginTop: 24 }}>
          <div onClick={() => { setShowHistory(v => !v); if (!showHistory) loadHistory(); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: showHistory ? 14 : 0 }}>
            <p style={{ ...PS.kicker, margin: 0 }}>Event history</p>
            {showHistory ? <ChevronUp size={15} color={POA.textMuted} /> : <ChevronDown size={15} color={POA.textMuted} />}
          </div>
          {showHistory && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <input value={historySearch} onChange={e => setHistorySearch(e.target.value)}
                  placeholder='Search events…' style={{ ...PS.input, flex: 1, minWidth: 180 }} />
                <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} style={{ ...PS.input, width: 140 }}>
                  <option value='all'>All types</option>
                  <option value='meeting'>Meetings</option>
                  <option value='community'>Community</option>
                  <option value='training'>Training</option>
                  <option value='board'>Board</option>
                  <option value='other'>Other</option>
                </select>
              </div>
              {eventHistory
                .filter(e => historyFilter === 'all' || e.kind === historyFilter)
                .filter(e => !historySearch || e.title.toLowerCase().includes(historySearch.toLowerCase()))
                .map(e => (
                  <div key={e.id} style={{ ...PS.card, padding: '11px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, opacity: .8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: KIND_COLOR[e.kind] || POA.accent, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: POA.textPrimary }}>{e.title}</div>
                      <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 1 }}>
                        {new Date(e.event_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        {e.location ? ` · ${e.location}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: POA.textMuted }}>{(e.event_attendance || []).length} signed in</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{e.kind}</span>
                      <button style={{ ...PS.btn, fontSize: 11, padding: '3px 8px', color: POA.red }}
                        onClick={() => doArchiveEvent(e.id)}>
                        Archive
                      </button>
                    </div>
                  </div>
                ))
              }
              {eventHistory.filter(e => historyFilter === 'all' || e.kind === historyFilter).filter(e => !historySearch || e.title.toLowerCase().includes(historySearch.toLowerCase())).length === 0 && (
                <div style={{ ...PS.card, padding: '14px', color: POA.textMuted, fontSize: 13.5 }}>No past events match your filters.</div>
              )}
              <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: 'italic' }}>
                Event history is visible to Department Admins only. Past events are kept permanently for records.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TrustedPartners() {
  const partners = [
    { name: "Legal Defense Fund", cat: "Legal", desc: "Retained counsel for officer representation in administrative and criminal matters." },
    { name: "Member Assistance Program", cat: "Wellness", desc: "Confidential counseling, financial coaching, and crisis support for members and families." },
    { name: "Credit Union", cat: "Financial", desc: "Preferred banking, auto loans, and home mortgages for sworn members." },
    { name: "Association Health Plan", cat: "Benefits", desc: "Supplemental coverage options negotiated by the association." },
    { name: "Fraternal Order Discounts", cat: "Perks", desc: "Retail, travel, and service discounts available to all active members." },
  ];
  return (
    <div>
      <PageTitle sub="Vetted resources your association stands behind">Trusted Partners</PageTitle>
      <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
        These partners are endorsed by your association — not advertisers. Your board manages this list.
      </div>
      {partners.map(p => (
        <Card key={p.name}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent, marginBottom: 4 }}>{p.cat}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: POA.textMuted, lineHeight: 1.55 }}>{p.desc}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={PS.btn}><Phone size={13} /> Contact</button>
            <button style={PS.btn}><ChevronRight size={13} /> Learn more</button>
          </div>
        </Card>
      ))}
      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
        Partner details are managed by your board in the Members section.
      </div>
    </div>
  );
}

function MyValue({ me }) {
  const [items, setItems]       = useState(null);
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState(null);
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);
  const [f, setF]               = useState({ label: "", value: "", icon: "" });
  const manage                  = canManage(me.access);

  async function load() {
    try { setItems(await listValueItems()); }
    catch(e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(item) {
    setF({ label: item.label, value: item.value, icon: item.icon || "" });
    setEditing(item); setAdding(false); setErr("");
  }
  function resetForm() {
    setEditing(null); setAdding(false); setErr("");
    setF({ label: "", value: "", icon: "" });
  }

  async function doSave() {
    if (!f.label.trim() || !f.value.trim()) { setErr("Label and value are required."); return; }
    setBusy(true); setErr("");
    try {
      const row = {
        department_id: me.department_id,
        label: f.label.trim(),
        value: f.value.trim(),
        icon: f.icon.trim() || null,
        sort: editing ? editing.sort : (items?.length || 0) + 1,
      };
      if (editing) await updateValueItem(editing.id, row);
      else await createValueItem(row);
      resetForm(); await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doRemove(id) {
    if (!confirm("Remove this value item?")) return;
    try { await deactivateValueItem(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  return (
    <div>
      <PageTitle sub="Your dues at work — defined by your board, honest and countable">My Value</PageTitle>
      <Card style={{ marginBottom: 18, borderColor: POA.accentDim }}>
        <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65 }}>
          What your membership delivers. These numbers come from your association's own records and are set by your board — never fabricated.
        </div>
      </Card>
      <ErrBox msg={err} />

      {!items ? <Spinner /> : (
        <>
          {items.length === 0 && !adding && (
            <Card>
              <div style={{ color: POA.textMuted, fontSize: 13.5 }}>
                {manage
                  ? "No value items yet. Add what this association delivers for members."
                  : "Your board hasn't added value items yet. Check back soon."}
              </div>
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {items.map(item => (
              <div key={item.id} style={{ ...PS.card, padding: "16px 16px", position: "relative" }}>
                {item.icon && (
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                )}
                <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 20, color: POA.accent, lineHeight: 1.1, marginBottom: 6 }}>
                  {item.value}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: POA.textPrimary, marginBottom: 2 }}>
                  {item.label}
                </div>
                {manage && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button style={{ ...PS.btn, padding: "4px 8px", fontSize: 11 }}
                      onClick={() => startEdit(item)}>
                      <Pencil size={10} /> Edit
                    </button>
                    <button style={{ ...PS.btn, padding: "4px 8px", fontSize: 11, color: POA.red }}
                      onClick={() => doRemove(item.id)}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {(adding || editing) && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>{editing ? "Edit item" : "New value item"}</SectionTitle>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Icon (emoji, optional)</div>
                <input value={f.icon} onChange={e => setF({ ...f, icon: e.target.value })}
                  style={{ ...PS.input, maxWidth: 80 }} placeholder="⚖️" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>
                  Value — the number or stat
                </div>
                <input value={f.value} onChange={e => setF({ ...f, value: e.target.value })}
                  style={PS.input} placeholder="e.g. $500K · 3 cases · +$1,850/yr" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>
                  Label — what it means
                </div>
                <input value={f.label} onChange={e => setF({ ...f, label: e.target.value })}
                  style={PS.input} placeholder="e.g. Legal defense coverage" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={busy} onClick={doSave}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Add item"}
                </button>
                <button style={PS.btn} onClick={resetForm}>Cancel</button>
              </div>
              <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
                Only put what's true and verifiable. Proof, not promises.
              </div>
            </Card>
          )}

          {manage && !adding && !editing && (
            <button style={{ ...PS.btn, width: "100%", justifyContent: "center" }}
              onClick={() => { setAdding(true); setEditing(null); }}>
              <Plus size={13} /> Add value item
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Benefits({ me, setView }) {
  const [benefits, setBenefits]   = useState(null);
  const [contacts, setContacts]   = useState([]);
  const [benCategories, setBenCategories] = useState([]);
  const [editing, setEditing]     = useState(null);
  const [adding, setAdding]       = useState(false);
  const [err, setErr]             = useState("");
  const [busy, setBusy]           = useState(false);
  const [showBenCatMgr, setShowBenCatMgr] = useState(false);
  const [benCatForm, setBenCatForm] = useState({ label: "" });
  const [benCatBusy, setBenCatBusy] = useState(false);
  const manage                    = canManage(me?.access);

  const blank = { title: "", description: "", status: "Active", category: "Core", contact_role: "", sort: 0 };
  const [f, setF] = useState(blank);

  async function load() {
    try {
      const [b, c, cats] = await Promise.all([listBenefits(), listContacts(), listBenefitCategories()]);
      setBenefits(b); setContacts(c); setBenCategories(cats);
    } catch(e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function doSaveBenCat() {
    if (!benCatForm.label.trim()) return;
    setBenCatBusy(true);
    try {
      await createBenefitCategory({
        department_id: me.department_id,
        label: benCatForm.label.trim(),
        sort: benCategories.length + 1,
      });
      setBenCatForm({ label: "" });
      await load();
    } catch(e) { setErr(e.message); }
    finally { setBenCatBusy(false); }
  }
  async function doDeleteBenCat(id) {
    if (!confirm('Remove this category?')) return;
    try { await deleteBenefitCategory(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  function startEdit(b) {
    setF({ title: b.title, description: b.description || "", status: b.status, category: b.category, contact_role: b.contact_role || "", sort: b.sort || 0 });
    setEditing(b); setAdding(false); setErr("");
  }
  function resetForm() { setEditing(null); setAdding(false); setErr(""); setF(blank); }

  async function doSave() {
    if (!f.title.trim()) { setErr("Title is required."); return; }
    setBusy(true); setErr("");
    try {
      const row = {
        department_id: me.department_id,
        title: f.title.trim(),
        description: f.description.trim() || null,
        status: f.status,
        category: f.category.trim() || "Core",
        contact_role: f.contact_role.trim() || null,
        sort: Number(f.sort) || 0,
      };
      if (editing) await updateBenefit(editing.id, row);
      else await createBenefit(row);
      resetForm(); await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doRemove(id) {
    if (!confirm("Remove this benefit?")) return;
    try { await deactivateBenefit(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  const STATUS_COLOR = {
    "Active":      { bg: "rgba(70,199,147,.14)", color: POA.green },
    "Coming Soon": { bg: "rgba(219,165,37,.14)", color: POA.accent },
    "Inactive":    { bg: "rgba(255,255,255,.06)", color: POA.textMuted },
  };

  // Group by category
  const grouped = {};
  (benefits || []).forEach(b => {
    (grouped[b.category] = grouped[b.category] || []).push(b);
  });

  // Find contact for "Get help"
  function getHelpContact(contactRole) {
    return contacts.find(c => c.role === contactRole);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Benefits</p>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            What your membership covers
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            Every benefit your dues deliver — managed by your board.
          </div>
        </div>
        {manage && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={PS.btn} onClick={() => setShowBenCatMgr(v => !v)}>
              <Settings size={13} /> Categories
            </button>
            <button style={PS.btn} onClick={() => { setAdding(!adding); setEditing(null); }}>
              <Plus size={13} /> Add benefit
            </button>
          </div>
        )}
      </div>

      <ErrBox msg={err} />

      {showBenCatMgr && manage && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>Manage benefit categories</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {benCategories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: POA.accentSoft, border: `1px solid ${POA.accentDim}`, borderRadius: 8, padding: '5px 10px' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: POA.accent }}>{cat.label}</span>
                <button onClick={() => doDeleteBenCat(cat.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: POA.textMuted, fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>New category name</div>
              <input value={benCatForm.label} onChange={e => setBenCatForm({ label: e.target.value })}
                style={PS.input} placeholder='e.g. Housing, Transport, Chaplain Services' />
            </div>
            <button style={PS.btnPrimary} disabled={benCatBusy || !benCatForm.label.trim()} onClick={doSaveBenCat}>
              <Plus size={13} /> Add
            </button>
          </div>
        </Card>
      )}

      {/* Add/Edit form */}
      {(adding || editing) && manage && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>{editing ? `Edit — ${editing.title}` : "New benefit"}</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Benefit title</div>
              <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })}
                style={PS.input} placeholder="e.g. Legal Defense Fund" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Description</div>
              <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })}
                style={{ ...PS.textarea, minHeight: 80 }} placeholder="What does this benefit cover and how do members use it?" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Category</div>
              <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} style={PS.input}>
                {benCategories.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Status</div>
              <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} style={PS.input}>
                <option>Active</option>
                <option>Coming Soon</option>
                <option>Inactive</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Who to contact for help (optional)</div>
              <select value={f.contact_role} onChange={e => setF({ ...f, contact_role: e.target.value })} style={PS.input}>
                <option value="">— No specific contact —</option>
                {contacts.map(c => <option key={c.id} value={c.role}>{c.role}{c.name ? ` — ${c.name}` : ""}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doSave}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add benefit"}
            </button>
            <button style={PS.btn} onClick={resetForm}>Cancel</button>
            {editing && (
              <button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }}
                onClick={() => { doRemove(editing.id); resetForm(); }}>
                Remove
              </button>
            )}
          </div>
        </Card>
      )}

      {!benefits ? <Spinner /> : benefits.length === 0 ? (
        <Card>
          <div style={{ color: POA.textMuted, fontSize: 13.5, textAlign: "center", padding: "16px 0" }}>
            {manage ? "No benefits yet — add your first one above." : "No benefits have been added yet. Check back soon."}
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, catBenefits]) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ height: 1, width: 16, background: POA.accent, opacity: .4 }} />
              {cat}
              <div style={{ height: 1, flex: 1, background: POA.hairline }} />
            </div>
            {catBenefits.map(b => {
              const helpContact = b.contact_role ? getHelpContact(b.contact_role) : null;
              const statusStyle = STATUS_COLOR[b.status] || STATUS_COLOR["Inactive"];
              return (
                <Card key={b.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: b.description ? 8 : 0 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>{b.title}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: statusStyle.bg, color: statusStyle.color }}>
                        {b.status}
                      </span>
                      {manage && (
                        <button style={{ ...PS.btn, padding: "4px 8px", fontSize: 11 }} onClick={() => startEdit(b)}>
                          <Pencil size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                  {b.description && (
                    <div style={{ fontSize: 13, color: POA.textMuted, lineHeight: 1.65, marginBottom: 12 }}>
                      {b.description}
                    </div>
                  )}
                  {helpContact ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {helpContact.phone && (
                        <a href={`tel:${helpContact.phone.replace(/\D/g,"")}`}
                          style={{ ...PS.btnPrimary, fontSize: 12, padding: "6px 12px", textDecoration: "none" }}>
                          <Phone size={12} /> Call {helpContact.name || b.contact_role}
                        </a>
                      )}
                      {helpContact.email && (
                        <a href={`mailto:${helpContact.email}`}
                          style={{ ...PS.btn, fontSize: 12, padding: "6px 12px", textDecoration: "none" }}>
                          <Mail size={12} /> Email
                        </a>
                      )}
                      {!helpContact.phone && !helpContact.email && (
                        <button style={{ ...PS.btn, fontSize: 12 }} onClick={() => setView('m_call')}>
                          <Phone size={12} /> Contact {b.contact_role}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button style={{ ...PS.btn, fontSize: 12 }}
                      onClick={() => setView('m_call')}>
                      <Phone size={12} /> Get help with this
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        ))
      )}

      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 4, fontStyle: "italic", textAlign: "center" }}>
        Benefits are managed by your board. Contact your rep if something looks wrong.
      </div>
    </div>
  );
}

function VoteLink({ me, org, setView }) {
  const [voteSettings, setVoteSettings] = useState(null);
  const manage = canManage(me?.access);
  const isAdmin = canAdmin(me?.access);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ title: "", description: "", link_url: "", open_date: "", close_date: "", active: true });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const { data } = await supabase
      .from("org_settings")
      .select("*")
      .eq("department_id", me.department_id)
      .in("key", ["vote_title","vote_description","vote_link_url","vote_open_date","vote_close_date","vote_active"]);
    const map = {};
    (data || []).forEach(r => { map[r.key] = r.value; });
    setVoteSettings(map);
    setF({
      title: map.vote_title || "",
      description: map.vote_description || "",
      link_url: map.vote_link_url || "",
      open_date: map.vote_open_date || "",
      close_date: map.vote_close_date || "",
      active: map.vote_active !== "false",
    });
  }

  useEffect(() => { load(); }, [me.department_id]);

  async function doSave() {
    setBusy(true); setErr(""); setSaved(false);
    try {
      const entries = [
        ["vote_title", f.title],
        ["vote_description", f.description],
        ["vote_link_url", f.link_url],
        ["vote_open_date", f.open_date],
        ["vote_close_date", f.close_date],
        ["vote_active", String(f.active)],
      ];
      await Promise.all(entries.map(([key, value]) =>
        supabase.from("org_settings").upsert(
          { department_id: me.department_id, key, value },
          { onConflict: "department_id,key" }
        )
      ));
      await load();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await logActivity(me.department_id, "vote", `🗳️ Vote ${f.active ? "opened" : "updated"}: ${f.title}`, "m_vote");
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const hasVote = voteSettings?.vote_link_url;
  const isActive = voteSettings?.vote_active !== "false";
  const now = new Date();
  const openDate = voteSettings?.vote_open_date ? new Date(voteSettings.vote_open_date) : null;
  const closeDate = voteSettings?.vote_close_date ? new Date(voteSettings.vote_close_date + "T23:59:59") : null;
  const voteOpen = hasVote && isActive && (!openDate || openDate <= now) && (!closeDate || closeDate >= now);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>VoteLink</p>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            Association Vote
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            Official votes and ballots from your board.
          </div>
        </div>
        {canAdmin(me?.access) && (
          <button style={PS.btn} onClick={() => setEditing(v => !v)}>
            <Settings size={13} /> {editing ? "Cancel" : "Set vote link"}
          </button>
        )}
      </div>

      <ErrBox msg={err} />

      {/* Board edit form */}
      {editing && canAdmin(me?.access) && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>Configure vote</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Vote title</div>
              <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })}
                style={PS.input} placeholder="e.g. CBA Ratification Vote 2026" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Description</div>
              <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })}
                style={{ ...PS.textarea, minHeight: 70 }} placeholder="What are members voting on? Any instructions?" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Voting link (secure external URL)</div>
              <input type="url" value={f.link_url} onChange={e => setF({ ...f, link_url: e.target.value })}
                style={PS.input} placeholder="https://www.electionrunner.com/..." />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Opens (optional)</div>
              <input type="date" value={f.open_date} onChange={e => setF({ ...f, open_date: e.target.value })}
                style={PS.input} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Closes (optional)</div>
              <input type="date" value={f.close_date} onChange={e => setF({ ...f, close_date: e.target.value })}
                style={PS.input} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }}
            onClick={() => setF(x => ({ ...x, active: !x.active }))}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${f.active ? POA.accent : POA.hairline2}`, background: f.active ? POA.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: ".15s" }}>
              {f.active && <CheckCircle2 size={12} color="#06090A" />}
            </div>
            <div style={{ fontSize: 13.5, color: f.active ? POA.accent : POA.textMuted, fontWeight: f.active ? 600 : 400 }}>
              Vote is active — members can see and access it
            </div>
          </div>
          {saved && (
            <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: POA.greenText, marginBottom: 10 }}>
              ✓ Vote settings saved.
            </div>
          )}
          <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={busy || !f.link_url.trim()} onClick={doSave}>
            {busy ? "Saving…" : "Save vote settings"}
          </button>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
            The voting link opens in a new tab. Use a trusted external voting platform — never collect votes through B4C.
          </div>
        </Card>
      )}

      {/* Member view */}
      {!voteSettings ? <Spinner /> : !hasVote || !isActive ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗳️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary, marginBottom: 6 }}>No active vote</div>
            <div style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.65 }}>
              Your board will post a link here when a vote opens. Check back soon.
            </div>
          </div>
        </Card>
      ) : (
        <div>
          {/* Vote status banner */}
          <div style={{ background: voteOpen ? "rgba(70,199,147,.08)" : "rgba(219,165,37,.08)", border: `0.5px solid ${voteOpen ? "rgba(70,199,147,.25)" : "rgba(219,165,37,.25)"}`, borderRadius: 12, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: voteOpen ? POA.green : POA.accent, flexShrink: 0, animation: voteOpen ? "sos-pulse 2s infinite" : "none" }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: voteOpen ? POA.green : POA.accent }}>
              {voteOpen ? "Vote is open" : closeDate && closeDate < now ? "Vote has closed" : "Vote opens soon"}
            </div>
            {openDate && <div style={{ fontSize: 11, color: POA.textMuted, marginLeft: "auto" }}>Opens {openDate.toLocaleDateString()}</div>}
            {closeDate && <div style={{ fontSize: 11, color: POA.textMuted, marginLeft: openDate ? 0 : "auto" }}>Closes {closeDate.toLocaleDateString()}</div>}
          </div>

          {/* Vote card */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent, marginBottom: 8 }}>Active vote</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: POA.textPrimary, marginBottom: 10 }}>
              {voteSettings.vote_title || "Association Vote"}
            </div>
            {voteSettings.vote_description && (
              <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7, marginBottom: 16 }}>
                {voteSettings.vote_description}
              </div>
            )}
            {voteOpen ? (
              <a href={voteSettings.vote_link_url} target="_blank" rel="noreferrer"
                style={{ ...PS.btnPrimary, textDecoration: "none", display: "inline-flex", fontSize: 15, padding: "12px 24px", width: "100%", justifyContent: "center", boxShadow: "0 0 20px rgba(219,165,37,.25)" }}>
                🗳️ Go vote now →
              </a>
            ) : (
              <button style={{ ...PS.btn, width: "100%", justifyContent: "center", opacity: .5 }} disabled>
                {closeDate && closeDate < now ? "Voting has closed" : "Voting not yet open"}
              </button>
            )}
          </Card>

          <div style={{ fontSize: 11.5, color: POA.textMuted, textAlign: "center", fontStyle: "italic" }}>
            You'll be taken to a secure external voting site. Your vote is private.
          </div>
        </div>
      )}
    </div>
  );
}

function Store({ me }) {
  const [items, setItems]     = useState(null);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding]   = useState(false);
  const [err, setErr]         = useState("");
  const [busy, setBusy]       = useState(false);
  const manage                = canManage(me?.access);

  const blank = { name: "", description: "", price: "", category: "General", image_url: "", order_url: "", is_raffle: false, sort: 0 };
  const [f, setF] = useState(blank);

  async function load() {
    try { setItems(await listStoreItems()); }
    catch(e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(item) {
    setF({ name: item.name, description: item.description || "", price: item.price || "", category: item.category, image_url: item.image_url || "", order_url: item.order_url || "", is_raffle: item.is_raffle || false, sort: item.sort || 0 });
    setEditing(item); setAdding(false); setErr("");
  }
  function resetForm() { setEditing(null); setAdding(false); setErr(""); setF(blank); }

  async function doSave() {
    if (!f.name.trim()) { setErr("Item name is required."); return; }
    setBusy(true); setErr("");
    try {
      const row = {
        department_id: me.department_id,
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: f.price.trim() || null,
        category: f.category.trim() || "General",
        image_url: f.image_url.trim() || null,
        order_url: f.order_url.trim() || null,
        is_raffle: f.is_raffle,
        sort: Number(f.sort) || 0,
      };
      if (editing) await updateStoreItem(editing.id, row);
      else await createStoreItem(row);
      resetForm(); await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doRemove(id) {
    if (!confirm("Remove this item?")) return;
    try { await deactivateStoreItem(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  const raffleItems  = (items || []).filter(i => i.is_raffle);
  const regularItems = (items || []).filter(i => !i.is_raffle);

  // Group regular items by category
  const grouped = {};
  regularItems.forEach(i => { (grouped[i.category] = grouped[i.category] || []).push(i); });

  function ItemCard({ item }) {
    return (
      <div style={{ background: "linear-gradient(160deg, #101828 0%, #0A1020 100%)", border: `0.5px solid ${POA.hairline2}`, borderRadius: 12, padding: "14px 14px", boxShadow: "0 2px 12px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.03)", display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
        {item.image_url && (
          <div style={{ width: "100%", height: 120, borderRadius: 8, overflow: "hidden", marginBottom: 4, background: "rgba(0,0,0,.3)" }}>
            <img src={item.image_url} alt={item.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => { e.target.parentElement.style.display = "none"; }} />
          </div>
        )}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.accent }}>{item.category}</div>
        <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{item.name}</div>
        {item.description && <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.5, flex: 1 }}>{item.description}</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          {item.price && <div style={{ fontWeight: 700, fontSize: 15, color: POA.accent }}>{item.price}</div>}
          <div style={{ display: "flex", gap: 6, marginLeft: item.price ? 0 : "auto" }}>
            {item.order_url ? (
              <a href={item.order_url} target="_blank" rel="noreferrer"
                style={{ ...PS.btnPrimary, fontSize: 11, padding: "5px 12px", textDecoration: "none" }}>
                Order ↗
              </a>
            ) : (
              <span style={{ fontSize: 11, color: POA.textMuted, fontStyle: "italic" }}>Link coming soon</span>
            )}
            {manage && (
              <button style={{ ...PS.btn, fontSize: 11, padding: "4px 8px" }} onClick={() => startEdit(item)}>
                <Pencil size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Store</p>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            Association Gear
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            Official merchandise — proceeds support your association.
          </div>
        </div>
        {manage && (
          <button style={PS.btn} onClick={() => { setAdding(!adding); setEditing(null); }}>
            <Plus size={13} /> Add item
          </button>
        )}
      </div>

      <ErrBox msg={err} />

      {/* Add/Edit form */}
      {(adding || editing) && manage && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>{editing ? `Edit — ${editing.name}` : "New store item"}</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Item name</div>
              <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
                style={PS.input} placeholder="e.g. Association Polo" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Description</div>
              <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })}
                style={{ ...PS.textarea, minHeight: 70 }} placeholder="What is it? Sizes, materials, details." />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Price</div>
              <input value={f.price} onChange={e => setF({ ...f, price: e.target.value })}
                style={PS.input} placeholder="e.g. $42" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Category</div>
              <input value={f.category} onChange={e => setF({ ...f, category: e.target.value })}
                style={PS.input} placeholder="e.g. Apparel, Gear, Collectibles" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Order link (external URL)</div>
              <input type="url" value={f.order_url} onChange={e => setF({ ...f, order_url: e.target.value })}
                style={PS.input} placeholder="https://yourstore.com/item" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Image URL (optional)</div>
              <input type="url" value={f.image_url} onChange={e => setF({ ...f, image_url: e.target.value })}
                style={PS.input} placeholder="https://..." />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                onClick={() => setF(x => ({ ...x, is_raffle: !x.is_raffle }))}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${f.is_raffle ? POA.accent : POA.hairline2}`, background: f.is_raffle ? POA.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: ".15s" }}>
                  {f.is_raffle && <CheckCircle2 size={12} color="#06090A" />}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: f.is_raffle ? POA.accent : POA.textPrimary }}>Raffle prize</div>
                  <div style={{ fontSize: 11, color: POA.textMuted }}>Shows in the raffle prizes section — members earn entries through attendance</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doSave}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add item"}
            </button>
            <button style={PS.btn} onClick={resetForm}>Cancel</button>
            {editing && (
              <button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }}
                onClick={() => { doRemove(editing.id); resetForm(); }}>
                Remove
              </button>
            )}
          </div>
        </Card>
      )}

      {!items ? <Spinner /> : items.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🛍️</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 4 }}>Store coming soon</div>
            <div style={{ fontSize: 13, color: POA.textMuted }}>Your board will add merchandise here. Check back soon.</div>
          </div>
        </Card>
      ) : (
        <>
          {/* Raffle prizes section */}
          {raffleItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ background: "linear-gradient(135deg, rgba(219,165,37,.1), rgba(219,165,37,.03))", border: "0.5px solid rgba(219,165,37,.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 22 }}>🎟️</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.accent }}>Raffle prizes</div>
                  <div style={{ fontSize: 12, color: POA.textMuted }}>Attend 4 meetings this quarter to earn a raffle entry for these prizes.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
                {raffleItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            </div>
          )}

          {/* Regular store items by category */}
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ height: 1, width: 16, background: POA.accent, opacity: .4 }} />
                {cat}
                <div style={{ height: 1, flex: 1, background: POA.hairline }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 }}>
                {catItems.map(item => <ItemCard key={item.id} item={item} />)}
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic", textAlign: "center" }}>
        Orders go through the association's external store. B4C never handles payment.
      </div>
    </div>
  );
}

function PlanEditor({ position, plan, activityLog, onSave, onGenerate, onClose, busy, saving, err }) {
  const SECTIONS = [
    'Role Overview',
    'Key Responsibilities',
    'Critical Contacts',
    'Access & Credentials',
    'Active Projects',
    'Institutional Knowledge',
    'First 30 Days',
  ];

  function parseSections(text) {
    const result = {};
    SECTIONS.forEach(key => { result[key] = ''; });
    if (!text) return result;
    SECTIONS.forEach(key => {
      const regex = new RegExp(`##\\s*${key}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i');
      const match = text.match(regex);
      if (match) result[key] = match[1].trim();
    });
    return result;
  }

  const [sections, setSections] = useState(() => parseSections(plan?.current_text || plan?.ai_text));
  const [activeSection, setActiveSection] = useState(SECTIONS[0]);

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(135deg, #0E1630, #060911)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 800, width: '100%', padding: '20px 22px', boxShadow: '0 20px 60px rgba(0,0,0,.7)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent, marginBottom: 4 }}>Continuity Plan</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: POA.textPrimary }}>{position.title}</div>
            {plan?.edited_at && <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 2 }}>Last updated {fmtDate(plan.edited_at)}</div>}
          </div>
          <button style={{ ...PS.btn, padding: '5px 10px' }} onClick={onClose}><X size={13} /></button>
        </div>

        {/* Activity pulled from app */}
        {activityLog.length > 0 && (
          <div style={{ background: 'rgba(219,165,37,.06)', border: `0.5px solid rgba(219,165,37,.2)`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, maxHeight: 220, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.accent, marginBottom: 6 }}>Recent activity pulled from app (last 90 days)</div>
            {activityLog.map((entry, i) => (
              <div key={i} style={{ fontSize: 12, color: POA.textSecondary, marginBottom: 2 }}>{entry}</div>
            ))}
          </div>
        )}

        {err && <ErrBox msg={err} />}

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 999, border: `0.5px solid ${activeSection === s ? POA.accent : POA.hairline2}`, background: activeSection === s ? POA.accentSoft : 'transparent', color: activeSection === s ? POA.accent : POA.textMuted, cursor: 'pointer', fontWeight: activeSection === s ? 700 : 400 }}>
              {s}
              {sections[s]?.trim() && <span style={{ marginLeft: 4, color: POA.green, fontSize: 10 }}>✓</span>}
            </button>
          ))}
        </div>

        {/* Active section editor */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: POA.textPrimary, marginBottom: 6 }}>{activeSection}</div>
          <textarea
            value={sections[activeSection] || ''}
            onChange={e => setSections(x => ({ ...x, [activeSection]: e.target.value }))}
            style={{ ...PS.textarea, minHeight: 180, fontFamily: 'inherit' }}
            placeholder={
              activeSection === 'Role Overview' ? 'What does this position do? Who do they work with?' :
              activeSection === 'Key Responsibilities' ? 'Monthly: ...\nQuarterly: ...\nAnnual: ...' :
              activeSection === 'Critical Contacts' ? 'Name, role, phone/email, what they handle...' :
              activeSection === 'Access & Credentials' ? 'What systems need access? (Do not store passwords here)' :
              activeSection === 'Active Projects' ? 'What is currently in progress that the incoming officer needs to know?' :
              activeSection === 'Institutional Knowledge' ? 'The stuff that\'s not written down anywhere — how things actually work here...' :
              'What should the incoming officer do in their first 30 days?'
            }
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={PS.btnPrimary} disabled={saving} onClick={() => onSave(sections)}>
            {saving ? 'Saving…' : <><FileText size={13} /> Save plan</>}
          </button>
          <button style={PS.btn} disabled={busy} onClick={async () => {
            const updated = await onGenerate(sections);
            if (updated) setSections(updated);
          }}>
            {busy ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Drafting…</> : <><Sparkles size={13} /> Fill with AI</>}
          </button>
          <div style={{ marginLeft: 'auto', fontSize: 11.5, color: POA.textMuted, alignSelf: 'center', fontStyle: 'italic' }}>
            AI drafts, you own the plan.
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardContinuity({ me, org }) {
  const [positions, setPositions] = useState(null);
  const [members, setMembers]     = useState([]);
  const [editing, setEditing]     = useState(null);
  const [adding, setAdding]       = useState(false);
  const [err, setErr]             = useState("");
  const [busy, setBusy]           = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [generating, setGenerating]   = useState(null); // position being packaged
  const [packageOut, setPackageOut]   = useState('');
  const [packageBusy, setPackageBusy] = useState(false);
  const [packageErr, setPackageErr]   = useState('');
  const [savingPkg, setSavingPkg]     = useState(false);
  const [savedPkgs, setSavedPkgs]     = useState([]);
  const [openPkg, setOpenPkg]         = useState(null);
  const [planPosition, setPlanPosition] = useState(null);
  const [plan, setPlan]                 = useState(null);
  const [planBusy, setPlanBusy]         = useState(false);
  const [planSaving, setPlanSaving]     = useState(false);
  const [planErr, setPlanErr]           = useState('');
  const [planDraft, setPlanDraft]       = useState(false);
  const [activityLog, setActivityLog]   = useState([]);

  const blank = { title: "", holder_member_id: "", holder_name: "", term_start: "", term_end: "", status: "active", succession_notes: "", sort: 0 };
  const [f, setF] = useState(blank);

  const manage  = canManage(me.access);
  const isAdmin = canAdmin(me.access);

  async function load() {
    const [pos, mem, pkgs] = await Promise.all([
      listBoardPositions(),
      listMembers(),
      supabase.from('ai_outputs')
        .select('*')
        .eq('department_id', me.department_id)
        .eq('feature', 'continuity')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .then(({ data }) => data || []),
    ]);
    setPositions(pos); setMembers(mem); setSavedPkgs(pkgs);
  }
  useEffect(() => { load(); }, []);

  function startEdit(p) {
    setF({
      title: p.title,
      holder_member_id: p.holder_member_id || "",
      holder_name: p.holder_name || "",
      term_start: p.term_start || "",
      term_end: p.term_end || "",
      status: p.status,
      succession_notes: p.succession_notes || "",
      sort: p.sort || 0,
    });
    setEditing(p); setAdding(false); setErr("");
  }

  function startAdd() {
    setF({ ...blank, sort: (positions?.length || 0) + 1 });
    setAdding(true); setEditing(null); setErr("");
  }

  function resetForm() {
    setEditing(null); setAdding(false); setErr(""); setF(blank);
  }

  async function doSave() {
    if (!f.title.trim()) { setErr("Position title is required."); return; }
    setBusy(true); setErr("");
    try {
      const row = {
        department_id: me.department_id,
        title: f.title.trim(),
        holder_member_id: f.holder_member_id || null,
        holder_name: f.holder_member_id ? null : (f.holder_name.trim() || null),
        term_start: f.term_start || null,
        term_end: f.term_end || null,
        status: f.status,
        succession_notes: f.succession_notes.trim() || null,
        sort: Number(f.sort) || 0,
      };
      if (editing) {
        await updateBoardPosition(editing.id, row);
      } else {
        await createBoardPosition(row);
      }
      resetForm(); await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doArchive(id) {
    if (!confirm("Archive this position? It won't show on the board roster but stays in history.")) return;
    try { await archiveBoardPosition(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  async function generatePackage(position) {
    setPackageBusy(true); setPackageErr(''); setPackageOut('');
    try {
      const holder = position.holder_member_id
        ? members.find(m => m.id === position.holder_member_id)
        : null;
      const sys = `You write professional board member onboarding packages for a police officers' association. Write a clear, practical handoff document for an incoming officer taking over a board position. Format with sections: Role Overview, Key Responsibilities, Ongoing Commitments, Important Contacts, Succession Notes (from outgoing officer), and First 30 Days. Professional tone, actionable, under 600 words.`;
      const prompt = `Association: ${me.department_id}
Position: ${position.title}
${holder ? `Outgoing officer: ${holder.full_name}` : ''}
Term: ${position.term_start ? `Started ${fmtShort(position.term_start)}` : 'Unknown start'}${position.term_end ? `, ending ${fmtShort(position.term_end)}` : ''}
Status: ${position.status}

Succession notes from outgoing officer:
${position.succession_notes || 'No succession notes recorded. Use general best practices for this role.'}

Write a comprehensive onboarding package for the incoming ${position.title}.`;
      const text = await callClaudeAI(sys, prompt);
      setPackageOut(text);
    } catch(e) { setPackageErr('Could not generate package. Check ANTHROPIC_API_KEY.'); }
    finally { setPackageBusy(false); }
  }

  async function savePackage(position) {
    if (!packageOut) return;
    setSavingPkg(true);
    try {
      await supabase.from('ai_outputs').insert({
        department_id: me.department_id,
        feature: 'continuity',
        title: `${position.title} — Onboarding Package`,
        ai_text: packageOut,
        created_by: me.id,
      });
      setGenerating(null); setPackageOut('');
      await load();
    } catch(e) { setPackageErr(e.message); }
    finally { setSavingPkg(false); }
  }

  async function openPlan(position) {
    setPlanPosition(position);
    setPlanErr('');
    setPlanDraft(false);
    // Load existing plan
    const { data } = await supabase.from('ai_outputs')
      .select('*')
      .eq('department_id', me.department_id)
      .eq('feature', 'continuity_plan')
      .eq('title', position.title)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    let activityLog = [];
    if (position.holder_member_id) {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString();
      const sinceDateStr = since.toISOString().split('T')[0];

      const [
        completedActions,
        openActions,
        filedMinutes,
        savedAgendas,
        announcements,
        causeEntries,
        meetingRequests,
        communityPosts,
        documents,
      ] = await Promise.all([
        // Completed action items
        supabase.from('action_items')
          .select('title, updated_at')
          .eq('department_id', me.department_id)
          .eq('owner_member_id', position.holder_member_id)
          .eq('status', 'done')
          .gte('updated_at', sinceStr)
          .order('updated_at', { ascending: false })
          .limit(10)
          .then(({ data }) => (data || []).map(a => `✓ Completed action item: ${a.title}`)),

        // Still open action items
        supabase.from('action_items')
          .select('title, due_date')
          .eq('department_id', me.department_id)
          .eq('owner_member_id', position.holder_member_id)
          .eq('status', 'open')
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(10)
          .then(({ data }) => (data || []).map(a => `⏳ Open action item: ${a.title}${a.due_date ? ` (due ${fmtShort(a.due_date)})` : ''}`)),

        // Minutes filed
        supabase.from('ai_outputs')
          .select('title, created_at')
          .eq('department_id', me.department_id)
          .eq('feature', 'minutes')
          .eq('created_by', position.holder_member_id)
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(8)
          .then(({ data }) => (data || []).map(m => `📋 Filed minutes: ${m.title}`)),

        // Agendas created
        supabase.from('ai_outputs')
          .select('title, created_at')
          .eq('department_id', me.department_id)
          .eq('feature', 'agenda')
          .eq('created_by', position.holder_member_id)
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => (data || []).map(a => `📅 Created agenda: ${a.title}`)),

        // Announcements posted
        supabase.from('correspondence')
          .select('subject, created_at')
          .eq('department_id', me.department_id)
          .eq('kind', 'announcement')
          .eq('member_id', position.holder_member_id)
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(8)
          .then(({ data }) => (data || []).map(a => `📢 Posted announcement: ${a.subject}`)),

        // Cause entries (contributions, updates, outcomes)
        supabase.from('cause_entries')
          .select('label, kind, amount, occurred_on, causes(name)')
          .eq('department_id', me.department_id)
          .gte('occurred_on', sinceDateStr)
          .order('occurred_on', { ascending: false })
          .limit(10)
          .then(({ data }) => (data || []).map(e => `❤️ Cause activity (${e.causes?.name || 'cause'}): ${e.label}${e.amount ? ` — $${e.amount}` : ''}`)),

        // Meeting requests handled
        supabase.from('correspondence')
          .select('subject, status, created_at')
          .eq('department_id', me.department_id)
          .eq('kind', 'meeting_request')
          .eq('assigned_to', position.holder_member_id)
          .in('status', ['confirmed', 'proposed', 'declined'])
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(8)
          .then(({ data }) => (data || []).map(r => `🤝 Meeting request ${r.status}: ${r.subject}`)),

        // Community posts approved
        supabase.from('community_posts')
          .select('kind, created_at')
          .eq('department_id', me.department_id)
          .eq('created_by', position.holder_member_id)
          .eq('status', 'active')
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(8)
          .then(({ data }) => (data || []).map(p => `🌟 Posted community ${p.kind}`)),

        // Documents uploaded
        supabase.from('documents')
          .select('name, created_at')
          .eq('department_id', me.department_id)
          .eq('uploaded_by', position.holder_member_id)
          .gte('created_at', sinceStr)
          .order('created_at', { ascending: false })
          .limit(8)
          .then(({ data }) => (data || []).map(d => `📄 Uploaded document: ${d.name}`)),
      ]);

      activityLog = [
        ...openActions,
        ...completedActions,
        ...causeEntries,
        ...filedMinutes,
        ...savedAgendas,
        ...announcements,
        ...meetingRequests,
        ...communityPosts,
        ...documents,
      ];
    }
    setActivityLog(activityLog);
    if (data?.[0]) {
      setPlan(data[0]);
    } else {
      setPlan(null);
    }
  }

  async function savePlan(sections) {
    if (!planPosition) return;
    setPlanSaving(true); setPlanErr('');
    try {
      const text = Object.entries(sections)
        .map(([k, v]) => v.trim() ? `## ${k}\n${v.trim()}` : '')
        .filter(Boolean)
        .join('\n\n');
      if (plan) {
        await supabase.from('ai_outputs').update({
          current_text: text,
          edited_by: me.id,
          edited_at: new Date().toISOString(),
        }).eq('id', plan.id);
      } else {
        const { data } = await supabase.from('ai_outputs').insert({
          department_id: me.department_id,
          feature: 'continuity_plan',
          title: planPosition.title,
          ai_text: text,
          current_text: text,
          created_by: me.id,
        }).select().single();
        setPlan(data);
      }
      await load();
    } catch(e) { setPlanErr(e.message); }
    finally { setPlanSaving(false); }
  }

  async function generatePlanDraft(sections) {
    setPlanBusy(true); setPlanErr('');
    try {
      const holder = planPosition.holder_member_id
        ? members.find(m => m.id === planPosition.holder_member_id)
        : null;
      const existing = Object.entries(sections)
        .map(([k, v]) => v.trim() ? `${k}: ${v.trim()}` : `${k}: (not filled in yet)`)
        .join('\n');
      const sys = `You help police officers' association board members write succession plans. Fill in missing sections based on the role and what's been provided. Keep it practical and actionable. Format each section with ## heading. Under 500 words total.`;
      const prompt = `Position: ${planPosition.title}
Association: ${org?.name || 'Association'}
${holder ? `Current holder: ${holder.full_name}` : ''}
Term: ${planPosition.term_start ? fmtShort(planPosition.term_start) : 'Unknown'}${planPosition.term_end ? ` – ${fmtShort(planPosition.term_end)}` : ''}

Recent activity for this role (last 90 days):
${activityLog.length > 0 ? activityLog.map(item => `- ${item}`).join('\n') : 'None'}

What the officer has filled in so far:
${existing}

Fill in any missing sections and improve what's there. Keep it practical for whoever takes over this role.`;
      const text = await callClaudeAI(sys, prompt);
      // Parse AI output back into sections
      const newSections = { ...sections };
      const sectionKeys = Object.keys(sections);
      sectionKeys.forEach(key => {
        const regex = new RegExp(`##\\s*${key}\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i');
        const match = text.match(regex);
        if (match && match[1].trim()) newSections[key] = match[1].trim();
      });
      return newSections;
    } catch(e) { setPlanErr('AI draft failed.'); return sections; }
    finally { setPlanBusy(false); }
  }

  const statusColor = { active: POA.accent, vacant: POA.amber, emeritus: POA.textMuted };
  const statusBg    = { active: POA.accentSoft, vacant: "rgba(240,180,74,.14)", emeritus: "rgba(122,114,150,.14)" };

  const active  = (positions || []).filter(p => p.status !== "archived");
  const filled  = active.filter(p => p.status === "active" && (p.holder_member_id || p.holder_name));
  const vacant  = active.filter(p => p.status === "vacant" || (!p.holder_member_id && !p.holder_name && p.status === "active"));

  return (
    <div>
      <PageTitle sub="Board positions, terms, and succession — institutional memory that survives turnover">
        Board Continuity
      </PageTitle>

      <Card style={{ marginBottom: 18, borderColor: POA.accentDim }}>
        <div style={{ fontSize: 13, color: POA.textSecondary, lineHeight: 1.65 }}>
          Every position, every term, every transition — recorded here so the association never loses institutional memory when leadership changes. Succession notes stay with the role, not the person.
        </div>
      </Card>

      <StatRow stats={[
        { n: active.length,  label: "Total positions", color: POA.accent },
        { n: filled.length,  label: "Filled",          color: POA.green },
        { n: vacant.length,  label: "Vacant",          color: POA.amber },
      ]} />

      <ErrBox msg={err} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 10px" }}>
        <p style={{ ...PS.kicker, margin: 0 }}>Current board</p>
        {manage && !adding && !editing && (
          <button style={PS.btn} onClick={startAdd}><Plus size={13} /> Add position</button>
        )}
      </div>

      {/* Add / Edit form */}
      {(adding || editing) && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>{editing ? `Edit — ${editing.title}` : "New position"}</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Position title</div>
              <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })}
                style={PS.input} placeholder="e.g. President, District 4 Rep" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Holder — pick from roster</div>
              <select value={f.holder_member_id}
                onChange={e => setF({ ...f, holder_member_id: e.target.value, holder_name: "" })}
                style={{ ...PS.input }}>
                <option value="">— Not on roster / type name below —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}{m.badge ? ` · Badge ${m.badge}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {!f.holder_member_id && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Or type a name</div>
                <input value={f.holder_name} onChange={e => setF({ ...f, holder_name: e.target.value })}
                  style={PS.input} placeholder="Free text — for people not on the roster yet" />
              </div>
            )}
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Term start</div>
              <input type="date" value={f.term_start}
                onChange={e => setF({ ...f, term_start: e.target.value })} style={PS.input} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Term end</div>
              <input type="date" value={f.term_end}
                onChange={e => setF({ ...f, term_end: e.target.value })} style={PS.input} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Status</div>
              <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}
                style={{ ...PS.input }}>
                <option value="active">Active</option>
                <option value="vacant">Vacant</option>
                <option value="emeritus">Emeritus</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Sort order</div>
              <input type="number" value={f.sort}
                onChange={e => setF({ ...f, sort: e.target.value })} style={PS.input} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>
                Succession notes — what the next person needs to know
              </div>
              <textarea value={f.succession_notes}
                onChange={e => setF({ ...f, succession_notes: e.target.value })}
                style={{ ...PS.textarea, minHeight: 100 }}
                placeholder="Key contacts, ongoing initiatives, where files live, what to watch out for…" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doSave}>
              {busy ? "Saving…" : editing ? "Save changes" : "Add position"}
            </button>
            <button style={PS.btn} onClick={resetForm}>Cancel</button>
            {editing && isAdmin && (
              <button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }}
                onClick={() => { doArchive(editing.id); resetForm(); }}>
                Archive
              </button>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
            Succession notes stay with the role — they survive leadership changes.
          </div>
        </Card>
      )}

      {!positions ? <Spinner /> : active.length === 0 ? (
        <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No positions yet. Add your first board position above.</div></Card>
      ) : active.map(p => {
        const holder = p.holder_member_id ? members.find(m => m.id === p.holder_member_id) : null;
        const holderName = holder?.full_name || p.holder_name || null;
        return (
          <div key={p.id} style={{ marginBottom: 10 }}>
            <div style={{ background: 'linear-gradient(160deg, #101828 0%, #0A1020 100%)', border: `0.5px solid ${POA.hairline2}`, borderLeft: `3px solid ${statusColor[p.status] || POA.accent}`, borderRadius: '0 13px 13px 0', padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.4)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary, marginBottom: 4 }}>{p.title}</div>
                  {holderName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: POA.accentSoft, color: POA.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {holderName.split(' ').map(w => w[0]).slice(0,2).join('')}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: POA.textPrimary }}>{holderName}</div>
                        {(p.term_start || p.term_end) && (
                          <div style={{ fontSize: 11, color: POA.textMuted }}>
                            {p.term_start ? fmtShort(p.term_start) : '?'} — {p.term_end ? fmtShort(p.term_end) : 'present'}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: POA.amber, fontStyle: 'italic' }}>Position vacant</div>
                  )}
                  {p.succession_notes && (
                    <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 8, padding: '6px 10px', background: 'rgba(255,255,255,.03)', borderRadius: 6, lineHeight: 1.5 }}>
                      {p.succession_notes.slice(0, 100)}{p.succession_notes.length > 100 ? '…' : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: statusBg[p.status] || POA.accentSoft, color: statusColor[p.status] || POA.accent, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {p.status}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {manage && (
                      <button style={{ ...PS.btn, fontSize: 11, padding: '4px 8px' }} onClick={() => startEdit(p)}>
                        <Pencil size={11} />
                      </button>
                    )}
                    <button style={{ ...PS.btn, fontSize: 11, padding: '4px 10px' }} onClick={() => openPlan(p)}>
                      <BookOpen size={11} /> Plan
                    </button>
                    {manage && (p.holder_member_id || p.holder_name) && generating !== p.id && (
                      <button style={{ ...PS.btn, fontSize: 11, padding: '4px 10px' }} onClick={() => { setGenerating(p.id); setPackageOut(''); setPackageErr(''); }}>
                        <Sparkles size={11} /> Package
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          {generating === p.id && (
            <Card style={{ marginBottom: 10, borderLeft: `3px solid ${POA.accent}`, borderRadius: '0 13px 13px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent, marginBottom: 2 }}>
                    <Sparkles size={11} style={{ verticalAlign: '-1px' }} /> Onboarding package
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: POA.textPrimary }}>{p.title}</div>
                </div>
                <button style={PS.btn} onClick={() => { setGenerating(null); setPackageOut(''); }}>
                  <X size={13} />
                </button>
              </div>
              {packageErr && <ErrBox msg={packageErr} />}
              {!packageOut ? (
                <div>
                  <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
                    AI will draft an onboarding package using the succession notes for this position. The incoming officer gets a practical guide to hit the ground running.
                  </div>
                  <button style={PS.btnPrimary} disabled={packageBusy} onClick={() => generatePackage(p)}>
                    {packageBusy ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Sparkles size={13} /> Generate package</>}
                  </button>
                  {!p.succession_notes && (
                    <div style={{ fontSize: 11.5, color: POA.amber, marginTop: 8, fontStyle: 'italic' }}>
                      Tip: Add succession notes to this position first for a more personalized package.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ background: 'rgba(0,0,0,.25)', border: `0.5px solid ${POA.hairline}`, borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                    <FundraisingPlanDisplay text={packageOut} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={PS.btnPrimary} disabled={savingPkg} onClick={() => savePackage(p)}>
                      {savingPkg ? 'Saving…' : <><FileText size={13} /> Save to Documents</>}
                    </button>
                    <button style={PS.btn} onClick={() => generatePackage(p)}>
                      <Sparkles size={13} /> Regenerate
                    </button>
                    <button style={{ ...PS.btn, marginLeft: 'auto' }} onClick={() => { setGenerating(null); setPackageOut(''); }}>
                      Discard
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: 'italic' }}>
                    Saved packages appear below in the Saved onboarding packages section.
                  </div>
                </div>
              )}
            </Card>
          )}
          </div>
        );
      })}

      {savedPkgs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ ...PS.kicker, marginBottom: 10 }}>Saved onboarding packages</p>
          <Card>
            {savedPkgs.map(pkg => (
              <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `0.5px solid ${POA.hairline}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: POA.textPrimary }}>{pkg.title}</div>
                  <div style={{ fontSize: 11.5, color: POA.textMuted }}>{fmtDate(pkg.created_at)}</div>
                </div>
                <button style={{ ...PS.btn, padding: '5px 9px', fontSize: 11.5 }}
                  onClick={() => setOpenPkg(pkg)}>Open</button>
                {isAdmin && (
                  <button style={{ ...PS.btn, padding: '5px 8px', fontSize: 11.5, color: POA.red }}
                    onClick={async () => {
                      if (!confirm('Delete this package?')) return;
                      await supabase.from('ai_outputs').update({ deleted_at: new Date().toISOString() }).eq('id', pkg.id);
                      load();
                    }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {openPkg && (
        <div onClick={() => setOpenPkg(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(135deg, #0E1630, #0A1020)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 720, width: '100%', padding: '20px 22px', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent }}>{openPkg.title}</div>
              <button style={{ ...PS.btn, padding: '5px 10px' }} onClick={() => setOpenPkg(null)}><X size={13} /></button>
            </div>
            <FundraisingPlanDisplay text={openPkg.current_text || openPkg.ai_text} />
          </div>
        </div>
      )}

      {planPosition && (
        <PlanEditor
          position={planPosition}
          plan={plan}
          activityLog={activityLog}
          onSave={async (sections) => { await savePlan(sections); setPlanPosition(null); }}
          onGenerate={generatePlanDraft}
          onClose={() => { setPlanPosition(null); setPlan(null); }}
          busy={planBusy}
          saving={planSaving}
          err={planErr}
        />
      )}
    </div>
  );
}

async function getOrgFeatures() {
  const { data, error } = await supabase.from("org_features").select("*");
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[r.feature_key] = r.enabled; });
  return map;
}
async function getOrgSettings() {
  const { data, error } = await supabase.from("org_settings").select("*");
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}
async function listAllDepts() {
  const { data, error } = await supabase.from("departments").select("*, members(count)");
  if (error) throw error;
  return data || [];
}
async function setOrgFeature(deptId, key, enabled) {
  const { error } = await supabase.rpc("set_org_feature", { p_dept: deptId, p_key: key, p_enabled: enabled });
  if (error) throw error;
}
async function setOrgSetting(deptId, key, value) {
  const { error } = await supabase.rpc("set_org_setting", { p_dept: deptId, p_key: key, p_value: value });
  if (error) throw error;
}
async function getActiveAlert() {
  const { data, error } = await supabase
    .from("correspondence")
    .select("*")
    .eq("kind", "alert")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}
async function getOnCall() {
  const { data, error } = await supabase
    .from("on_call")
    .select("*, members(full_name, badge)")
    .order("priority", { ascending: true });
  if (error) throw error;
  return data || [];
}
async function setOnCall(deptId, priority, name, phone, memberId, notes, activeUntil, setById) {
  const { data, error } = await supabase
    .from("on_call")
    .upsert({
      department_id: deptId,
      priority,
      name,
      phone,
      member_id: memberId || null,
      notes: notes || null,
      active_from: new Date().toISOString(),
      active_until: activeUntil || null,
      set_by: setById,
    }, { onConflict: "department_id,priority" })
    .select().single();
  if (error) throw error;
  return data;
}
async function clearOnCall(deptId, priority) {
  const { error } = await supabase
    .from("on_call")
    .delete()
    .eq("department_id", deptId)
    .eq("priority", priority);
  if (error) throw error;
}
async function listContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("active", true)
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data || [];
}
async function createContact(row) {
  const { data, error } = await supabase
    .from("contacts").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateContact(id, patch) {
  const { data, error } = await supabase
    .from("contacts").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function deactivateContact(id) {
  const { error } = await supabase
    .from("contacts").update({ active: false }).eq("id", id);
  if (error) throw error;
}
async function listBenefits() {
  const { data, error } = await supabase
    .from("benefits")
    .select("*")
    .eq("active", true)
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data || [];
}
async function createBenefit(row) {
  const { data, error } = await supabase
    .from("benefits").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateBenefit(id, patch) {
  const { data, error } = await supabase
    .from("benefits").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function deactivateBenefit(id) {
  const { error } = await supabase
    .from("benefits").update({ active: false }).eq("id", id);
  if (error) throw error;
}
async function listStoreItems() {
  const { data, error } = await supabase
    .from("store_items")
    .select("*")
    .eq("active", true)
    .order("is_raffle", { ascending: false })
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data || [];
}
async function createStoreItem(row) {
  const { data, error } = await supabase
    .from("store_items").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateStoreItem(id, patch) {
  const { data, error } = await supabase
    .from("store_items").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function deactivateStoreItem(id) {
  const { error } = await supabase
    .from("store_items").update({ active: false }).eq("id", id);
  if (error) throw error;
}
async function listBenefitCategories() {
  const { data, error } = await supabase
    .from("benefit_categories")
    .select("*")
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data || [];
}
async function createBenefitCategory(row) {
  const { data, error } = await supabase
    .from("benefit_categories").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function deleteBenefitCategory(id) {
  const { error } = await supabase
    .from("benefit_categories").delete().eq("id", id);
  if (error) throw error;
}
async function listContactCategories() {
  const { data, error } = await supabase
    .from("contact_categories")
    .select("*")
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data || [];
}
async function createContactCategory(row) {
  const { data, error } = await supabase
    .from("contact_categories").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateContactCategory(id, patch) {
  const { data, error } = await supabase
    .from("contact_categories").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function deleteContactCategory(id) {
  const { error } = await supabase
    .from("contact_categories").delete().eq("id", id);
  if (error) throw error;
}
async function listAnnouncements() {
  const { data, error } = await supabase
    .from("correspondence")
    .select("*, poster:members!correspondence_posted_by_fkey(full_name)")
    .eq("kind", "announcement")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function listMessages() {
  const { data, error } = await supabase
    .from("correspondence")
    .select("*, sender:members!correspondence_member_id_fkey(full_name)")
    .eq("kind", "message")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // fetch replies separately to avoid self-referencing join
  const ids = (data || []).map(m => m.id);
  if (ids.length === 0) return data || [];
  const { data: replies } = await supabase
    .from("correspondence")
    .select("*")
    .eq("kind", "reply")
    .in("thread_id", ids);
  return (data || []).map(m => ({
    ...m,
    replies: (replies || []).filter(r => r.thread_id === m.id),
  }));
}
async function postAlert(subject, body) {
  const { data, error } = await supabase
    .rpc("post_alert", { p_subject: subject, p_body: body });
  if (error) throw error;
  return data;
}
async function clearAlert() {
  const { error } = await supabase.rpc("clear_alert");
  if (error) throw error;
}
async function postAnnouncement(subject, body, audience, audienceValue) {
  const { data, error } = await supabase.rpc("post_announcement", {
    p_subject: subject,
    p_body: body,
    p_audience: audience || "all",
    p_audience_value: audienceValue || null,
  });
  if (error) throw error;
  return data;
}
async function sendMessage(subject, body) {
  const me = await getMe();
  const { data, error } = await supabase
    .from("correspondence")
    .insert({
      department_id: me.department_id,
      kind: "message",
      subject,
      body,
      member_id: me.id,
      audience: "all",
    })
    .select().single();
  if (error) throw error;
  return data;
}
async function replyToMessage(threadId, body) {
  const me = await getMe();
  const { data, error } = await supabase
    .from("correspondence")
    .insert({
      department_id: me.department_id,
      kind: "reply",
      body,
      thread_id: threadId,
      member_id: me.id,
      audience: "all",
    })
    .select().single();
  if (error) throw error;
  return data;
}
async function submitBoardQuestion(deptId, question, anonymous, memberId) {
  const { data, error } = await supabase
    .from("correspondence")
    .insert({
      department_id: deptId,
      kind: "board_question",
      subject: question.slice(0, 80),
      body: question,
      member_id: anonymous ? null : memberId,
      audience: "all",
      status: "active",
    })
    .select().single();
  if (error) throw error;
  return data;
}
async function listFAQs() {
  const { data, error } = await supabase
    .from("correspondence")
    .select("*")
    .eq("kind", "faq")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function listBoardQuestions() {
  const { data, error } = await supabase
    .from("correspondence")
    .select("*, sender:members!correspondence_member_id_fkey(full_name)")
    .eq("kind", "board_question")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // fetch replies separately to avoid self-referencing join
  const ids = (data || []).map(m => m.id);
  if (ids.length === 0) return data || [];
  const { data: replies } = await supabase
    .from("correspondence").select("*").eq("kind", "reply").in("thread_id", ids);
  return (data || []).map(m => ({
    ...m,
    replies: (replies || []).filter(r => r.thread_id === m.id),
  }));
}
async function getValueLedger(start, end) {
  const { data, error } = await supabase.rpc("get_value_ledger", {
    p_start: start,
    p_end: end,
  });
  if (error) throw error;
  return data;
}
async function listContentCalendar(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
  const { data, error } = await supabase.from("content_calendar")
    .select("*").gte("date", start).lte("date", end)
    .order("date", { ascending: true });
  if (error) throw error;
  return data || [];
}
async function listPostCategories() {
  const { data, error } = await supabase.from("post_categories")
    .select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}
async function addContentPost(row) {
  const { data, error } = await supabase.from("content_calendar").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function removeContentPost(id) {
  const { error } = await supabase.from("content_calendar").delete().eq("id", id);
  if (error) throw error;
}
async function addPostCategory(row) {
  const { data, error } = await supabase.from("post_categories").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function deletePostCategory(id) {
  const { error } = await supabase.from("post_categories").delete().eq("id", id);
  if (error) throw error;
}
async function listFundraiserLog() {
  const { data, error } = await supabase.from("fundraiser_log")
    .select("*, members(full_name)").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function addFundraiserLog(row) {
  const { data, error } = await supabase.from("fundraiser_log").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function removeFundraiserLog(id) {
  const { error } = await supabase.from("fundraiser_log").delete().eq("id", id);
  if (error) throw error;
}
async function listFundingEvents(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end   = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
  const { data, error } = await supabase.from("funding_events")
    .select("*").gte("date", start).lte("date", end)
    .order("date", { ascending: true });
  if (error) throw error;
  return data || [];
}
async function addFundingEvent(row) {
  const { data, error } = await supabase.from("funding_events")
    .insert(row).select().single();
  if (error) throw error;
  return data;
}
async function removeFundingEvent(id) {
  const { error } = await supabase.from("funding_events").delete().eq("id", id);
  if (error) throw error;
}
async function listAIOutputs(feature) {
  const { data, error } = await supabase.from("ai_outputs")
    .select("*, members(full_name)").eq("feature", feature)
    .is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function saveAIDraft(row) {
  const { data, error } = await supabase.from("ai_outputs").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function deleteAIDraft(id) {
  const { error } = await supabase.from("ai_outputs")
    .update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
async function listBoardPositions() {
  const { data, error } = await supabase
    .from("board_positions")
    .select("*, members(full_name, badge)")
    .neq("status", "archived")
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data || [];
}
async function createBoardPosition(row) {
  const { data, error } = await supabase
    .from("board_positions").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateBoardPosition(id, patch) {
  const { data, error } = await supabase
    .from("board_positions").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function archiveBoardPosition(id) {
  const { error } = await supabase
    .from("board_positions").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}
async function listValueItems() {
  const { data, error } = await supabase
    .from("value_items")
    .select("*")
    .eq("active", true)
    .order("sort")
    .order("created_at");
  if (error) throw error;
  return data || [];
}
async function createValueItem(row) {
  const { data, error } = await supabase
    .from("value_items").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateValueItem(id, patch) {
  const { data, error } = await supabase
    .from("value_items").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function deactivateValueItem(id) {
  const { error } = await supabase
    .from("value_items").update({ active: false }).eq("id", id);
  if (error) throw error;
}
async function getLedgerNarrative(start, end) {
  const { data, error } = await supabase
    .from("ledger_narratives")
    .select("*")
    .eq("period_start", start)
    .eq("period_end", end)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}
async function saveLedgerNarrative(deptId, start, end, narrative, memberId) {
  const { data, error } = await supabase
    .from("ledger_narratives")
    .upsert({
      department_id: deptId,
      period_start: start,
      period_end: end,
      narrative,
      filed_by: memberId,
      filed_at: new Date().toISOString(),
    }, { onConflict: "department_id,period_start,period_end" })
    .select().single();
  if (error) throw error;
  return data;
}
async function listDocuments() {
  const { data, error } = await supabase
    .from("documents")
    .select("*, members(full_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function uploadDocument(file, meta) {
  const ext = file.name.split(".").pop();
  const path = `${meta.department_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: upErr } = await supabase.storage
    .from("org-documents").upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data, error } = await supabase.from("documents").insert({
    department_id: meta.department_id,
    name: meta.name,
    category: meta.category,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    visibility: meta.visibility,
    notes: meta.notes || null,
    uploaded_by: meta.uploaded_by,
  }).select().single();
  if (error) throw error;
  return data;
}
async function updateDocument(id, patch) {
  const { data, error } = await supabase
    .from("documents").update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function archiveDocument(id) {
  const { error } = await supabase
    .from("documents").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}
async function getDocumentUrl(path) {
  const { data, error } = await supabase.storage
    .from("org-documents").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
async function getDocsForAI() {
  const { data, error } = await supabase
    .from("documents")
    .select("name, category, extracted_text")
    .eq("status", "active")
    .not("extracted_text", "is", null);
  if (error) throw error;
  return data || [];
}
async function listCommunityPosts() {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*, members!community_posts_member_id_fkey(full_name, badge), poster:members!community_posts_posted_by_fkey(full_name)")
    .eq("status", "active")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function listPendingPosts() {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*, members!community_posts_member_id_fkey(full_name), poster:members!community_posts_posted_by_fkey(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function createCommunityPost(row) {
  const { data, error } = await supabase
    .from("community_posts").insert(row).select().single();
  if (error) throw error;
  return data;
}
async function approveCommunityPost(id) {
  const { error } = await supabase
    .from("community_posts").update({ status: "active" }).eq("id", id);
  if (error) throw error;
}
async function archiveCommunityPost(id) {
  const { error } = await supabase
    .from("community_posts").update({ status: "archived" }).eq("id", id);
  if (error) throw error;
}
async function toggleReaction(postId, emoji) {
  const mid = await supabase.rpc("my_member_id").then(r => r.data);
  const { data: existing } = await supabase
    .from("community_reactions")
    .select("id").eq("post_id", postId).eq("member_id", mid).eq("emoji", emoji).single();
  if (existing) {
    await supabase.from("community_reactions").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("community_reactions").insert({ post_id: postId, member_id: mid, emoji });
    return true;
  }
}
async function getReactions(postIds) {
  if (!postIds.length) return {};
  const { data, error } = await supabase
    .from("community_reactions")
    .select("post_id, emoji, member_id")
    .in("post_id", postIds);
  if (error) throw error;
  const map = {};
  (data || []).forEach(r => {
    if (!map[r.post_id]) map[r.post_id] = {};
    if (!map[r.post_id][r.emoji]) map[r.post_id][r.emoji] = [];
    map[r.post_id][r.emoji].push(r.member_id);
  });
  return map;
}
async function listActivityLog() {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return data || [];
}
async function logActivity(deptId, kind, title, linkView) {
  const { error } = await supabase.from("activity_log").insert({
    department_id: deptId,
    kind,
    title,
    link_view: linkView || null,
  });
  if (error) console.error("Activity log error:", error.message);
}
async function listVideos() {
  const { data, error } = await supabase.from("association_videos")
    .select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function addVideo(row) {
  const { data, error } = await supabase.from("association_videos")
    .insert(row).select().single();
  if (error) throw error;
  return data;
}
async function removeVideo(id) {
  const { error } = await supabase.from("association_videos").delete().eq("id", id);
  if (error) throw error;
}
async function listSpaceBookings() {
  const { data, error } = await supabase.from("space_bookings")
    .select("*, members(full_name, email)")
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data || [];
}
async function createSpaceBooking(row) {
  const { data, error } = await supabase.from("space_bookings")
    .insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateBookingStatus(id, status) {
  const { data, error } = await supabase.rpc("update_booking_status", {
    p_booking: id, p_status: status,
  });
  if (error) throw error;
  return data;
}
async function uploadStoreImage(file, itemName) {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${itemName.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
  const { data, error } = await supabase.storage
    .from("store-items").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: pub } = supabase.storage.from("store-items").getPublicUrl(path);
  return pub.publicUrl;
}

function POABuilding({ me, org }) {
  const [tab, setTab]           = useState("store");
  const [items, setItems]       = useState(null);
  const [bookings, setBookings] = useState(null);
  const [orgSettings, setOrgSettings] = useState({});
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);

  // store state
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [f, setF] = useState({
    name: "", description: "", price: "", category: "",
    order_url: "", image_url: "", image_file: null, image_mode: "url",
  });

  // booking state
  const [showBook, setShowBook] = useState(false);
  const [bf, setBf] = useState({
    title: "", booking_date: "", start_time: "", end_time: "", notes: "",
  });
  const [calCur, setCalCur] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() });
  const [calSelected, setCalSelected] = useState(null);

  const spaceName = orgSettings.event_space_name || "Event Space";
  const manage = canManage(me.access);

  async function load() {
    const [its, bks, sets] = await Promise.all([
      listStoreItems(),
      listSpaceBookings(),
      supabase.from("org_settings").select("*")
        .eq("department_id", me.department_id)
        .then(({ data }) => {
          const m = {};
          (data || []).forEach(r => { m[r.key] = r.value; });
          return m;
        }),
    ]);
    setItems(its); setBookings(bks); setOrgSettings(sets);
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setF({ name: "", description: "", price: "", category: "", order_url: "", image_url: "", image_file: null, image_mode: "url" });
    setEditing(null); setShowAdd(false); setErr("");
  }

  async function doSaveItem() {
    if (!f.name.trim()) { setErr("Name is required."); return; }
    setBusy(true); setErr("");
    try {
      let imageUrl = f.image_url.trim() || null;
      if (f.image_mode === "upload" && f.image_file) {
        setUploadBusy(true);
        imageUrl = await uploadStoreImage(f.image_file, f.name);
        setUploadBusy(false);
      }
      const row = {
        department_id: me.department_id,
        name: f.name.trim(),
        description: f.description.trim() || null,
        price: f.price.trim() || null,
        category: f.category.trim() || null,
        order_url: f.order_url.trim() || null,
        image_url: imageUrl,
      };
      if (editing) {
        await updateStoreItem(editing.id, row);
      } else {
        await createStoreItem(row);
      }
      resetForm();
      await load();
    } catch(e) { setErr(e.message); setUploadBusy(false); }
    finally { setBusy(false); }
  }

  async function doArchive(id) {
    if (!confirm("Remove this item from the store?")) return;
    try { await deactivateStoreItem(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  function startEdit(item) {
    setF({
      name: item.name, description: item.description || "",
      price: item.price || "", category: item.category || "",
      order_url: item.order_url || "", image_url: item.image_url || "",
      image_file: null, image_mode: "url",
    });
    setEditing(item); setShowAdd(true);
  }

  async function doBook() {
    if (!bf.title.trim() || !bf.booking_date) { setErr("Title and date are required."); return; }
    setBusy(true); setErr("");
    try {
      await createSpaceBooking({
        department_id: me.department_id,
        title: bf.title.trim(),
        booked_by: me.id,
        booking_date: bf.booking_date,
        start_time: bf.start_time || null,
        end_time: bf.end_time || null,
        notes: bf.notes.trim() || null,
        status: manage ? "confirmed" : "pending",
      });
      setBf({ title: "", booking_date: "", start_time: "", end_time: "", notes: "" });
      setShowBook(false);
      await load();
    } catch(e) { setErr(e?.message || e?.details || e?.hint || "Booking failed."); }
    finally { setBusy(false); }
  }

  async function doUpdateStatus(id, status) {
    try { await updateBookingStatus(id, status); await load(); }
    catch(e) { setErr(e.message); }
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = (bookings || []).filter(b => b.booking_date >= today && b.status !== "cancelled");
  const past     = (bookings || []).filter(b => b.booking_date < today || b.status === "cancelled");

  const statusColor = { confirmed: POA.green, pending: POA.amber, cancelled: POA.red };
  const statusBg    = { confirmed: "rgba(70,199,147,.14)", pending: "rgba(240,180,74,.14)", cancelled: "rgba(239,106,100,.14)" };

  const TABS = [
    { id: "store", label: "Store" },
    { id: "space", label: spaceName },
  ];

  // group store items by category
  const grouped = {};
  (items || []).forEach(item => {
    const cat = item.category || "General";
    (grouped[cat] = grouped[cat] || []).push(item);
  });

  return (
    <div>
      <PageTitle sub={`Association store and ${spaceName.toLowerCase()} management`}>
        POA Building
      </PageTitle>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setErr(""); }}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#06090A" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}` }}>
            {t.label}
          </button>
        ))}
      </div>
      <ErrBox msg={err} />

      {/* ── STORE TAB ── */}
      {tab === "store" && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary }}>Association Store</div>
              <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 2 }}>
                Browse what's available. Orders go through the association — B4C shows it, you handle it.
              </div>
            </div>
            {manage && (
              <button style={PS.btn} onClick={() => { setShowAdd(!showAdd); setEditing(null); setErr(""); }}>
                <Plus size={13} /> Add item
              </button>
            )}
          </div>

          {/* Add / Edit form */}
          {showAdd && (
            <Card style={{ marginBottom: 18 }}>
              <SectionTitle>{editing ? "Edit item" : "New item"}</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Item name</div>
                  <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
                    style={PS.input} placeholder="e.g. Association Polo" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Price</div>
                  <input value={f.price} onChange={e => setF({ ...f, price: e.target.value })}
                    style={PS.input} placeholder="$42" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Category</div>
                  <input value={f.category} onChange={e => setF({ ...f, category: e.target.value })}
                    style={PS.input} placeholder="e.g. Apparel" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Description</div>
                  <textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })}
                    style={{ ...PS.textarea, minHeight: 70 }} placeholder="Sizes, material, details…" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Order link (optional)</div>
                  <input value={f.order_url} onChange={e => setF({ ...f, order_url: e.target.value })}
                    style={PS.input} placeholder="https://… (links out to your store)" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 8 }}>Item image</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {["url", "upload"].map(mode => (
                      <button key={mode} onClick={() => setF({ ...f, image_mode: mode, image_url: "", image_file: null })}
                        style={{ ...PS.btn, background: f.image_mode === mode ? POA.accent : POA.btnBg, color: f.image_mode === mode ? "#06090A" : POA.btnText, border: f.image_mode === mode ? "none" : `0.5px solid ${POA.btnBorder}` }}>
                        {mode === "url" ? "Paste a link" : "Upload a photo"}
                      </button>
                    ))}
                  </div>
                  {f.image_mode === "url" ? (
                    <input value={f.image_url} onChange={e => setF({ ...f, image_url: e.target.value })}
                      style={PS.input} placeholder="https://… (Google Photos, Dropbox, your website)" />
                  ) : (
                    <div>
                      <input type="file" accept="image/*"
                        onChange={e => setF({ ...f, image_file: e.target.files[0] || null })}
                        style={{ ...PS.input, padding: "8px 12px", cursor: "pointer" }} />
                      {f.image_file && (
                        <div style={{ fontSize: 12, color: POA.green, marginTop: 6 }}>
                          ✓ {f.image_file.name} ready to upload
                        </div>
                      )}
                    </div>
                  )}
                  {(f.image_url || f.image_file) && f.image_mode === "url" && f.image_url && (
                    <img src={f.image_url} alt="preview"
                      style={{ marginTop: 10, height: 80, borderRadius: 8, objectFit: "cover" }}
                      onError={e => { e.target.style.display = "none"; }} />
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={busy || uploadBusy} onClick={doSaveItem}>
                  {uploadBusy ? "Uploading…" : busy ? "Saving…" : editing ? "Save changes" : "Add to store"}
                </button>
                <button style={PS.btn} onClick={resetForm}>Cancel</button>
                {editing && (
                  <button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }} onClick={() => doArchive(editing.id)}>
                    Remove from store
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
                Items are data — every association adds their own. Nothing is hardcoded.
              </div>
            </Card>
          )}

          {!items ? <Spinner /> : items.length === 0 && !showAdd ? (
            <Card>
              <div style={{ color: POA.textMuted, fontSize: 13.5 }}>
                No items in the store yet.
                {manage ? " Add your first item above." : " Check back soon."}
              </div>
            </Card>
          ) : (
            Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat}>
                <SectionTitle>{cat}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
                  {catItems.map(item => (
                    <div key={item.id} style={{ ...PS.card, padding: "14px 15px", display: "flex", flexDirection: "column" }}>
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name}
                          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 9, marginBottom: 10 }}
                          onError={e => { e.target.style.display = "none"; }} />
                      )}
                      {item.category && (
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.accent, marginBottom: 5 }}>
                          {item.category}
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary, marginBottom: 4 }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.45, marginBottom: 8, flex: 1 }}>{item.description}</div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                        {item.price && <div style={{ fontWeight: 700, color: POA.accent, fontSize: 16 }}>{item.price}</div>}
                        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                          {item.order_url && (
                            <a href={item.order_url} target="_blank" rel="noreferrer"
                              style={{ ...PS.btn, textDecoration: "none", fontSize: 12 }}>
                              Order ↗
                            </a>
                          )}
                          {manage && (
                            <button style={{ ...PS.btn, fontSize: 12 }} onClick={() => startEdit(item)}>
                              <Pencil size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      {!item.order_url && (
                        <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 6, fontStyle: "italic" }}>
                          Available in store
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── EVENT SPACE TAB ── */}
      {tab === "space" && (
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary }}>{spaceName}</div>
              <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 2 }}>
                Book the space for meetings, events, or association use.
                {!manage ? " Your request goes to the board for confirmation." : ""}
              </div>
            </div>
            <button style={PS.btnPrimary} onClick={() => { setShowBook(!showBook); setErr(""); }}>
              <Plus size={13} /> Book the space
            </button>
          </div>

          {/* Booking form */}
          {showBook && (
            <Card style={{ marginBottom: 18 }}>
              <SectionTitle>New booking request</SectionTitle>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>What's it for?</div>
                <input value={bf.title} onChange={e => setBf({ ...bf, title: e.target.value })}
                  style={PS.input} placeholder="e.g. District 4 meeting, training session, social event" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
                  <input type="date" value={bf.booking_date} min={today}
                    onChange={e => setBf({ ...bf, booking_date: e.target.value })} style={PS.input} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Start time</div>
                  <input type="time" value={bf.start_time}
                    onChange={e => setBf({ ...bf, start_time: e.target.value })} style={PS.input} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>End time</div>
                  <input type="time" value={bf.end_time}
                    onChange={e => setBf({ ...bf, end_time: e.target.value })} style={PS.input} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Notes (optional)</div>
                <textarea value={bf.notes} onChange={e => setBf({ ...bf, notes: e.target.value })}
                  style={{ ...PS.textarea, minHeight: 70 }} placeholder="Setup needs, number of people, equipment…" />
              </div>
              {!manage && (
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 12, fontStyle: "italic" }}>
                  Your request will be reviewed by the board. You'll see the status update here.
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={busy} onClick={doBook}>
                  {busy ? "Submitting…" : manage ? "Confirm booking" : "Submit request"}
                </button>
                <button style={PS.btn} onClick={() => { setShowBook(false); setErr(""); }}>Cancel</button>
              </div>
            </Card>
          )}

          {/* Calendar view */}
          {bookings && (
            <div style={{ marginBottom: 20 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button style={PS.btn} onClick={() => setCalCur(c => c.m === 0 ? { y: c.y-1, m: 11 } : { ...c, m: c.m-1 })}>‹</button>
                    <div style={{ fontSize: 14, fontWeight: 700, color: POA.textPrimary, minWidth: 130, textAlign: "center" }}>
                      {MONTHS[calCur.m]} {calCur.y}
                    </div>
                    <button style={PS.btn} onClick={() => setCalCur(c => c.m === 11 ? { y: c.y+1, m: 0 } : { ...c, m: c.m+1 })}>›</button>
                  </div>
                  <button style={PS.btn} onClick={() => setCalCur({ y: new Date().getFullYear(), m: new Date().getMonth() })}>Today</button>
                </div>

                {/* Day headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
                  {DOW.map(d => <div key={d} style={{ fontSize: 9, fontWeight: 700, textAlign: "center", color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>{d}</div>)}
                </div>

                {(() => {
                  const dim      = new Date(calCur.y, calCur.m + 1, 0).getDate();
                  const startDow = new Date(calCur.y, calCur.m, 1).getDay();
                  const cells    = [];
                  for (let i = 0; i < startDow; i++) cells.push(null);
                  for (let d = 1; d <= dim; d++) cells.push(d);
                  while (cells.length % 7) cells.push(null);

                  // Map bookings to days for this month
                  const byDay = {};
                  bookings.forEach(b => {
                    const bd = new Date(b.booking_date + "T12:00:00");
                    if (bd.getFullYear() === calCur.y && bd.getMonth() === calCur.m) {
                      const d = bd.getDate();
                      (byDay[d] = byDay[d] || []).push(b);
                    }
                  });

                  const todayD = new Date();
                  const isToday = d => d && calCur.y === todayD.getFullYear() && calCur.m === todayD.getMonth() && d === todayD.getDate();

                  return Array.from({ length: cells.length / 7 }, (_, w) => (
                    <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
                      {cells.slice(w*7, w*7+7).map((d, i) => {
                        const dayBookings = d ? (byDay[d] || []) : [];
                        const hasConfirmed = dayBookings.some(b => b.status === "confirmed");
                        const hasPending   = dayBookings.some(b => b.status === "pending");
                        const hasCancelled = dayBookings.length > 0 && !hasConfirmed && !hasPending;
                        const tod = isToday(d);

                        let bg = "transparent";
                        let border = `0.5px solid ${POA.hairline}`;
                        if (hasConfirmed) { bg = "rgba(70,199,147,.15)";  border = "0.5px solid rgba(70,199,147,.4)"; }
                        if (hasPending)   { bg = "rgba(219,165,37,.12)";  border = `0.5px solid rgba(219,165,37,.35)`; }
                        if (hasCancelled) { bg = "rgba(239,106,100,.08)"; border = "0.5px solid rgba(239,106,100,.2)"; }
                        if (tod) { border = `0.5px solid rgba(219,165,37,.6)`; }

                        return (
                          <div key={i}
                            onClick={() => d && dayBookings.length > 0 && setCalSelected(calSelected === `${calCur.y}-${calCur.m}-${d}` ? null : `${calCur.y}-${calCur.m}-${d}`)}
                            style={{ minHeight: 52, display: "flex", flexDirection: "column", borderRadius: 8, background: bg, border, cursor: dayBookings.length > 0 ? "pointer" : "default", padding: "4px 5px", gap: 2 }}>
                            {d && (
                              <>
                                <div style={{ fontSize: 11, fontWeight: tod ? 700 : 400, color: tod ? POA.accent : POA.textMuted }}>{d}</div>
                                {dayBookings.slice(0, 2).map(b => (
                                  <div key={b.id} style={{ fontSize: 9, fontWeight: 600, padding: "1px 4px", borderRadius: 3, background: statusBg[b.status], color: statusColor[b.status], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {b.start_time ? b.start_time.slice(0,5) + " " : ""}{b.title}
                                  </div>
                                ))}
                                {dayBookings.length > 2 && <div style={{ fontSize: 8, color: POA.textMuted }}>+{dayBookings.length - 2} more</div>}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}

                {/* Legend */}
                <div style={{ display: "flex", gap: 14, marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${POA.hairline}`, flexWrap: "wrap" }}>
                  {[
                    { color: "rgba(70,199,147,.5)",  label: "Confirmed" },
                    { color: "rgba(219,165,37,.4)",  label: "Pending" },
                    { color: "rgba(239,106,100,.3)", label: "Cancelled" },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: POA.textMuted }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Selected day detail */}
              {calSelected && (() => {
                const [y, m, d] = calSelected.split("-").map(Number);
                const dayBookings = bookings.filter(b => {
                  const bd = new Date(b.booking_date + "T12:00:00");
                  return bd.getFullYear() === y && bd.getMonth() === m && bd.getDate() === d;
                });
                if (!dayBookings.length) return null;
                return (
                  <Card style={{ marginTop: 10, borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 13px 13px 0" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent, marginBottom: 10 }}>
                      {new Date(y, m, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </div>
                    {dayBookings.map(b => (
                      <div key={b.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `0.5px solid ${POA.hairline}` }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{b.title}</div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: statusBg[b.status], color: statusColor[b.status], flexShrink: 0 }}>{b.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>
                          Requested by {b.members?.full_name || "Member"}
                          {b.members?.email ? ` · ${b.members.email}` : ""}
                        </div>
                        {(b.start_time || b.end_time) && (
                          <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>
                            {b.start_time?.slice(0,5)}{b.end_time ? ` – ${b.end_time.slice(0,5)}` : ""}
                          </div>
                        )}
                        {b.notes && <div style={{ fontSize: 12, color: POA.textMuted, fontStyle: "italic", marginBottom: 8 }}>{b.notes}</div>}
                        {manage && b.status === "pending" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={{ ...PS.btnPrimary, fontSize: 12, padding: "5px 12px" }} onClick={() => doUpdateStatus(b.id, "confirmed")}>
                              <CheckCircle2 size={12} /> Confirm
                            </button>
                            <button style={{ ...PS.btn, fontSize: 12, color: POA.red }} onClick={() => doUpdateStatus(b.id, "cancelled")}>
                              Decline
                            </button>
                          </div>
                        )}
                        {manage && b.status === "confirmed" && (
                          <button style={{ ...PS.btn, fontSize: 12, color: POA.red }} onClick={() => doUpdateStatus(b.id, "cancelled")}>
                            Cancel booking
                          </button>
                        )}
                      </div>
                    ))}
                  </Card>
                );
              })()}
            </div>
          )}

          {/* Upcoming bookings */}
          <SectionTitle>Upcoming</SectionTitle>
          {!bookings ? <Spinner /> : upcoming.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No upcoming bookings. The space is open.</div></Card>
          ) : upcoming.map(b => (
            <Card key={b.id} style={{ marginBottom: 10, borderLeft: `3px solid ${statusColor[b.status] || POA.accent}`, borderRadius: "0 14px 14px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: POA.textPrimary, marginBottom: 3 }}>{b.title}</div>
                  <div style={{ fontSize: 12.5, color: POA.textMuted }}>
                    {fmtDate(b.booking_date)}
                    {b.start_time ? ` · ${b.start_time.slice(0,5)}` : ""}
                    {b.end_time ? ` – ${b.end_time.slice(0,5)}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                    Requested by {b.members?.full_name || "Member"}
                  </div>
                  {b.notes && <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 4, fontStyle: "italic" }}>{b.notes}</div>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: statusBg[b.status], color: statusColor[b.status], flexShrink: 0, textTransform: "uppercase" }}>
                  {b.status}
                </span>
              </div>
              {manage && b.status === "pending" && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ ...PS.btnPrimary, flex: 1, fontSize: 13 }} onClick={() => doUpdateStatus(b.id, "confirmed")}>
                    <CheckCircle2 size={14} /> Confirm
                  </button>
                  <button style={{ ...PS.btn, color: POA.red }} onClick={() => doUpdateStatus(b.id, "cancelled")}>
                    Decline
                  </button>
                </div>
              )}
              {manage && b.status === "confirmed" && (
                <button style={{ ...PS.btn, marginTop: 10, color: POA.red, fontSize: 12 }}
                  onClick={() => doUpdateStatus(b.id, "cancelled")}>
                  Cancel booking
                </button>
              )}
            </Card>
          ))}

          {/* Past bookings — collapsible */}
          {past.length > 0 && (
            <CollapsiblePast bookings={past} statusColor={statusColor} statusBg={statusBg} />
          )}
        </div>
      )}
    </div>
  );
}

function CollapsiblePast({ bookings, statusColor, statusBg }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginTop: 18 }}>
      <div onClick={() => setShow(s => !s)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: show ? 10 : 0 }}>
        <p style={{ ...PS.kicker, margin: 0 }}>Past bookings ({bookings.length})</p>
        {show ? <ChevronUp size={16} color={POA.textMuted} /> : <ChevronDown size={16} color={POA.textMuted} />}
      </div>
      {show && bookings.map(b => (
        <Card key={b.id} style={{ marginBottom: 8, opacity: 0.7 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: POA.textPrimary }}>{b.title}</div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>{fmtDate(b.booking_date)} · {b.members?.full_name || "Member"}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: statusBg[b.status], color: statusColor[b.status], textTransform: "uppercase" }}>
              {b.status}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PADash({ setView, setViewAs }) {
  const [depts, setDepts]         = useState(null);
  const [stats, setStats]         = useState({});
  const [errors, setErrors]       = useState([]);
  const [err, setErr]             = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const d = await listAllDepts();
      setDepts(d);
      // Load stats for each dept in parallel
      const statsMap = {};
      await Promise.all(d.map(async dept => {
        const [members, events, correspondence] = await Promise.all([
          supabase.from('members').select('id, status, standing, created_at').eq('department_id', dept.id).then(({ data }) => data || []),
          supabase.from('events').select('id, created_at').eq('department_id', dept.id).then(({ data }) => data || []),
          supabase.from('correspondence').select('id, kind, created_at').eq('department_id', dept.id).then(({ data }) => data || []),
        ]);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        statsMap[dept.id] = {
          totalMembers: members.length,
          activeMembers: members.filter(m => m.status === 'active').length,
          goodStanding: members.filter(m => m.standing === 'Good' || m.standing === 'Active').length,
          recentMembers: members.filter(m => new Date(m.created_at) > thirtyDaysAgo).length,
          totalEvents: events.length,
          recentEvents: events.filter(e => new Date(e.created_at) > thirtyDaysAgo).length,
          announcements: correspondence.filter(c => c.kind === 'announcement').length,
          messages: correspondence.filter(c => c.kind === 'message').length,
        };
      }));
      setStats(statsMap);
    } catch(e) { setErr(e.message); }
  }

  const totalOrgs    = depts?.length || 0;
  const totalMembers = Object.values(stats).reduce((s, d) => s + (d.totalMembers || 0), 0);
  const poaOrgs      = depts?.filter(d => d.org_type === 'poa').length || 0;
  const fireOrgs     = depts?.filter(d => d.org_type === 'fire').length || 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ ...PS.kicker, marginBottom: 4 }}>Project Admin</p>
        <h1 style={{ fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: '0 0 4px' }}>
          Platform Overview
        </h1>
        <div style={{ fontSize: 13, color: POA.textMuted }}>
          Before the Call · Big Bull Technology
        </div>
      </div>

      <ErrBox msg={err} />

      {/* Platform stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 20 }}>
        {[
          { n: totalOrgs, label: 'Organizations', color: POA.accent },
          { n: totalMembers, label: 'Total members', color: POA.green },
          { n: poaOrgs, label: 'POA', color: POA.accent },
          { n: fireOrgs, label: 'Fire/EMS', color: POA.amber },
        ].map(s => (
          <div key={s.label} style={{ background: 'linear-gradient(160deg, #101828 0%, #0A1020 100%)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 11, padding: '13px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: 26, color: s.color, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 10, color: POA.textMuted, marginTop: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Org cards */}
      {!depts ? <Spinner /> : depts.map(dept => {
        const s = stats[dept.id] || {};
        const healthPct = s.totalMembers ? Math.round((s.goodStanding / s.totalMembers) * 100) : 0;
        return (
          <div key={dept.id} style={{ background: 'linear-gradient(160deg, #101828 0%, #0A1020 100%)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 13, padding: '16px 18px', marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,.4)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary, marginBottom: 2 }}>{dept.name}</div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: dept.org_type === 'poa' ? 'rgba(219,165,37,.14)' : 'rgba(70,199,147,.14)', color: dept.org_type === 'poa' ? POA.accent : POA.green }}>
                  {dept.org_type === 'poa' ? 'POA' : 'Fire/EMS'}
                </span>
              </div>
              <button style={{ ...PS.btnPrimary, fontSize: 12, padding: '6px 14px' }}
                onClick={() => setView('pa_orgs')}>
                Switch to →
              </button>
            </div>

            {/* Org stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { n: s.activeMembers || 0, label: 'Active members', color: POA.green },
                { n: `${healthPct}%`, label: 'Good standing', color: healthPct > 80 ? POA.green : healthPct > 50 ? POA.amber : POA.red },
                { n: s.recentMembers || 0, label: 'New (30d)', color: POA.accent },
                { n: s.totalEvents || 0, label: 'Events', color: POA.textSecondary },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: stat.color }}>{stat.n}</div>
                  <div style={{ fontSize: 10, color: POA.textMuted, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 3 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Activity bar */}
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: POA.textMuted, borderTop: `0.5px solid ${POA.hairline}`, paddingTop: 10 }}>
              <span><span style={{ color: POA.accent, fontWeight: 600 }}>{s.announcements || 0}</span> announcements</span>
              <span><span style={{ color: POA.accent, fontWeight: 600 }}>{s.messages || 0}</span> member messages</span>
              <span><span style={{ color: POA.accent, fontWeight: 600 }}>{s.recentEvents || 0}</span> events this month</span>
            </div>
          </div>
        );
      })}

      {/* Quick access to board screens */}
      {depts && depts.length > 0 && (
        <div style={{ marginTop: 20, marginBottom: 12 }}>
          <p style={{ ...PS.kicker, marginBottom: 10 }}>Quick access — Fort Worth POA</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { label: 'Members', id: 'b_members', icon: Users },
              { label: 'Causes', id: 'b_causes', icon: Heart },
              { label: 'Correspondence', id: 'b_correspondence', icon: Mail },
              { label: 'Documents', id: 'b_documents', icon: FileText },
              { label: 'Board Continuity', id: 'b_continuity', icon: BookOpen },
              { label: 'Meetings & Events', id: 'b_attendance', icon: CalendarCheck },
              { label: 'Value Ledger', id: 'b_ledger', icon: TrendingUp },
              { label: 'Settings', id: 'b_settings', icon: Settings },
            ].map(({ label, id, icon: Icon }) => (
              <button key={id}
                onClick={() => { setViewAs('board'); setView(id); }}
                style={{ background: 'linear-gradient(160deg, #101828, #0A1020)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 10, padding: '12px 10px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}>
                <Icon size={18} color={POA.accent} style={{ marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                <div style={{ fontSize: 11, color: POA.textSecondary, fontWeight: 500 }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' }}>
        Platform data is live. Stats update on each load.
      </div>
    </div>
  );
}

function PAOrgConfig() {
  const [depts, setDepts]     = useState(null);
  const [selected, setSelected] = useState(null);
  const [feats, setFeats]     = useState({});
  const [settings, setSettings] = useState({ building_name: '', org_short_name: '', org_type_label: '' });
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState('');
  const ALL_FEATURES = [
    { key: 'm_call', label: 'Who to Call', group: 'Member' },
    { key: 'm_ask', label: 'Ask B4C', group: 'Member' },
    { key: 'm_partners', label: 'Trusted Partners', group: 'Member' },
    { key: 'm_community', label: 'Community', group: 'Member' },
    { key: 'm_benefits', label: 'Benefits', group: 'Member' },
    { key: 'm_events', label: 'Events', group: 'Member' },
    { key: 'm_card', label: 'My Card', group: 'Member' },
    { key: 'm_vote', label: 'VoteLink', group: 'Member' },
    { key: 'm_store', label: 'Store', group: 'Member' },
    { key: 'm_booking', label: 'Event Space', group: 'Member' },
    { key: 'b_attendance', label: 'Meetings & Events', group: 'Board' },
    { key: 'b_meetings', label: 'Agenda & Minutes', group: 'Board' },
    { key: 'b_stipend', label: 'Stipend Log', group: 'Board' },
    { key: 'b_causes', label: 'Causes', group: 'Board' },
    { key: 'b_fundraising', label: 'Fundraising', group: 'Board' },
    { key: 'b_social', label: 'Social & Media', group: 'Board' },
    { key: 'b_building', label: 'POA Building', group: 'Board' },
    { key: 'b_continuity', label: 'Board Continuity', group: 'Board' },
    { key: 'b_correspondence', label: 'Correspondence', group: 'Board' },
    { key: 'b_community', label: 'Community', group: 'Board' },
    { key: 'b_members', label: 'Members', group: 'Board' },
    { key: 'b_ledger', label: 'Value Ledger', group: 'Board' },
    { key: 'b_settings', label: 'Settings', group: 'Board' },
  ];
  async function loadOrg(dept) {
    setSelected(dept);
    const [f, s] = await Promise.all([
      supabase.from('org_features').select('*').eq('department_id', dept.id),
      supabase.from('org_settings').select('*').eq('department_id', dept.id),
    ]);
    const fm = {}; (f.data || []).forEach(r => { fm[r.feature_key] = r.enabled; });
    const sm = { building_name: '', org_short_name: '', org_type_label: '' };
    (s.data || []).forEach(r => { if (r.key in sm) sm[r.key] = r.value; });
    setFeats(fm); setSettings(sm);
  }
  async function toggleFeature(key) {
    const next = feats[key] === false ? true : false;
    setFeats(f => ({ ...f, [key]: next }));
    await setOrgFeature(selected.id, key, next);
  }
  async function saveSettings() {
    setBusy(true); setMsg('');
    try {
      await Promise.all(Object.entries(settings).map(([k, v]) => v ? setOrgSetting(selected.id, k, v) : Promise.resolve()));
      setMsg('Saved.');
    } catch(e) { setMsg(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { listAllDepts().then(setDepts); }, []);
  if (!depts) return <Spinner />;
  const memberFeats = ALL_FEATURES.filter(f => f.group === 'Member');
  const boardFeats  = ALL_FEATURES.filter(f => f.group === 'Board');
  return (
    <div>
      <PageTitle sub="Configure features and terminology per organization">Org Config</PageTitle>
      {!selected ? (
        <>
          <SectionTitle>Select an organization</SectionTitle>
          {depts.map(d => (
            <Card key={d.id} style={{ cursor: 'pointer' }} onClick={() => loadOrg(d)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: POA.textPrimary }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted }}>{d.org_type}</div>
                </div>
                <ChevronRight size={15} color={POA.textMuted} />
              </div>
            </Card>
          ))}
        </>
      ) : (
        <>
          <button onClick={() => setSelected(null)} style={{ ...PS.btn, marginBottom: 16 }}><ArrowLeft size={13} /> All orgs</button>
          <PageTitle sub={selected.org_type}>{selected.name}</PageTitle>
          <SectionTitle>Terminology</SectionTitle>
          <Card>
            {[['building_name','Building name (e.g. POA Building)'],['org_short_name','Short name (e.g. FWPOA)'],['org_type_label','Type label (e.g. Association)']].map(([k, label]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>{label}</div>
                <input value={settings[k]} onChange={e => setSettings(s => ({ ...s, [k]: e.target.value }))} style={PS.input} />
              </div>
            ))}
            {msg && <div style={{ fontSize: 12, color: msg === 'Saved.' ? POA.green : POA.red, marginBottom: 8 }}>{msg}</div>}
            <button style={PS.btnPrimary} disabled={busy} onClick={saveSettings}>{busy ? 'Saving…' : 'Save terminology'}</button>
          </Card>
          <SectionTitle>Member features</SectionTitle>
          <Card>
            {memberFeats.map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `0.5px solid ${POA.hairline}` }}>
                <div style={{ fontSize: 13.5, color: POA.textPrimary }}>{f.label}</div>
                <button onClick={() => toggleFeature(f.key)}
                  style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: feats[f.key] === false ? POA.track : POA.accent, position: 'relative', transition: '.2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: feats[f.key] === false ? 3 : 21, transition: '.2s' }} />
                </button>
              </div>
            ))}
          </Card>
          <SectionTitle>Board features</SectionTitle>
          <Card>
            {boardFeats.map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `0.5px solid ${POA.hairline}` }}>
                <div style={{ fontSize: 13.5, color: POA.textPrimary }}>{f.label}</div>
                <button onClick={() => toggleFeature(f.key)}
                  style={{ width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: feats[f.key] === false ? POA.track : POA.accent, position: 'relative', transition: '.2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: feats[f.key] === false ? 3 : 21, transition: '.2s' }} />
                </button>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function PAAddOrg({ setView }) {
  const [f, setF] = useState({
    name: '',
    org_type: 'poa',
    admin_name: '',
    admin_email: '',
    short_name: '',
  });
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');
  const [success, setSuccess] = useState('');

  async function doCreate() {
    if (!f.name.trim() || !f.admin_email.trim()) {
      setErr('Organization name and admin email are required.');
      return;
    }
    setBusy(true); setErr(''); setSuccess('');
    try {
      const shortName = f.short_name.trim() ||
        f.name.split(' ').map(w => w[0]).join('').toUpperCase();

      const { data: deptId, error: rpcErr } = await supabase.rpc('create_organization', {
        org_name: f.name.trim(),
        org_short_name: shortName,
        org_type: f.org_type,
        admin_email: f.admin_email.trim().toLowerCase(),
        admin_name: f.admin_name.trim() || 'Admin',
      });
      if (rpcErr) throw rpcErr;

      // Send invite email via serverless function
      await fetch('/api/invite-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: f.admin_email.trim(),
          full_name: f.admin_name.trim() || 'Admin'
        }),
      });

      setSuccess(`✓ ${f.name} created! Invite sent to ${f.admin_email}.`);
      setF({ name: '', org_type: 'poa', admin_name: '', admin_email: '', short_name: '' });
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <button onClick={() => setView('pa_dash')} style={{ ...PS.btn, marginBottom: 16 }}>
        <ArrowLeft size={13} /> PA Dashboard
      </button>
      <p style={{ ...PS.kicker, marginBottom: 4 }}>Project Admin</p>
      <h1 style={{ fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: '0 0 16px' }}>
        Add Organization
      </h1>

      <ErrBox msg={err} />
      {success && (
        <div style={{ background: 'rgba(70,199,147,.1)', border: '0.5px solid rgba(70,199,147,.3)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: POA.greenText, marginBottom: 16 }}>
          {success}
        </div>
      )}

      <Card>
        <SectionTitle>Organization details</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Organization name</div>
            <input value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))}
              style={PS.input} placeholder='e.g. Fort Worth Police Officers Association' />
          </div>
          <div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Short name / abbreviation</div>
            <input value={f.short_name} onChange={e => setF(x => ({ ...x, short_name: e.target.value }))}
              style={PS.input} placeholder='e.g. FWPOA' />
          </div>
          <div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Organization type</div>
            <select value={f.org_type} onChange={e => setF(x => ({ ...x, org_type: e.target.value }))} style={PS.input}>
              <option value='poa'>Police Officers Association (POA)</option>
              <option value='fire'>Fire / EMS Department</option>
            </select>
          </div>
        </div>

        <SectionTitle>First admin</SectionTitle>
        <div style={{ fontSize: 12.5, color: POA.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
          This person will receive an invite email and become the Department Admin for this organization.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Admin full name</div>
            <input value={f.admin_name} onChange={e => setF(x => ({ ...x, admin_name: e.target.value }))}
              style={PS.input} placeholder='Full name' />
          </div>
          <div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Admin email</div>
            <input type='email' value={f.admin_email} onChange={e => setF(x => ({ ...x, admin_email: e.target.value }))}
              style={PS.input} placeholder='admin@department.gov' />
          </div>
        </div>

        <button style={{ ...PS.btnPrimary, opacity: busy ? 0.7 : 1 }}
          disabled={busy || !f.name.trim() || !f.admin_email.trim()}
          onClick={doCreate}>
          {busy ? 'Creating…' : <><Plus size={13} /> Create organization & send invite</>}
        </button>
        <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: 'italic' }}>
          Creates the organization, seeds default settings, and sends a magic link invite to the admin.
        </div>
      </Card>
    </div>
  );
}

function BoardCorrespondence({ me, members }) {
  const [tab, setTab]         = useState("inbox");
  const [announcements, setAnnouncements] = useState(null);
  const [messages, setMessages]           = useState(null);
  const [alert, setAlert]     = useState(null);
  const [err, setErr]         = useState("");
  const [busy, setBusy]       = useState(false);
  const [form, setForm]       = useState({ subject: "", body: "", audience: "all", audience_value: "" });
  const [alertForm, setAlertForm] = useState({ subject: "", body: "" });
  const [replyText, setReplyText] = useState({});
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [requests, setRequests]       = useState([]);
  const [responding, setResponding]   = useState(null);
  const [reqReply, setReqReply]       = useState('');
  const [replyBusy, setReplyBusy]     = useState(false);

  async function load() {
    const [ann, msgs, act, bqs, reqs] = await Promise.all([
      listAnnouncements(), listMessages(), getActiveAlert(), listBoardQuestions(),
      supabase.from('correspondence')
        .select('*, members!correspondence_member_id_fkey(full_name, phone, email)')
        .eq('department_id', me.department_id)
        .eq('kind', 'meeting_request')
        .order('created_at', { ascending: false })
        .then(({ data }) => data || []),
    ]);
    setAnnouncements(ann);
    setMessages([...msgs, ...bqs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setAlert(act);
    setRequests(reqs);
  }
  useEffect(() => { load(); }, []);

  async function doPostAnnouncement() {
    if (!form.subject.trim() || !form.body.trim()) { setErr("Subject and message are required."); return; }
    setBusy(true); setErr("");
    try {
      await postAnnouncement(form.subject, form.body, form.audience, form.audience_value || null);
      setForm({ subject: "", body: "", audience: "all", audience_value: "" });
      await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doPostAlert() {
    if (!alertForm.subject.trim() || !alertForm.body.trim()) { setErr("Subject and message required."); return; }
    if (!confirm("Post a CRITICAL ALERT? This will appear as a red banner on every member's dashboard immediately.")) return;
    setBusy(true); setErr("");
    try {
      await postAlert(alertForm.subject, alertForm.body);
      setAlertForm({ subject: "", body: "" });
      await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doClearAlert() {
    if (!confirm("Clear the active alert? The banner will disappear from all member dashboards.")) return;
    setBusy(true); setErr("");
    try { await clearAlert(); await load(); }
    catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doReply(threadId) {
    const text = replyText[threadId];
    if (!text?.trim()) return;
    setBusy(true); setErr("");
    try {
      await replyToMessage(threadId, text);
      setReplyText(r => ({ ...r, [threadId]: "" }));
      await load();
      if (selectedMsg?.id === threadId) {
        const [msgs, bqs] = await Promise.all([listMessages(), listBoardQuestions()]);
        setSelectedMsg([...msgs, ...bqs].find(m => m.id === threadId) || null);
      }
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doPostFaq() {
    const answer = replyText[selectedMsg.id];
    if (!answer?.trim()) { setErr("Write the answer in the reply box first, then post it as a FAQ."); return; }
    if (!confirm("Post this Q&A as a public FAQ visible to all members?")) return;
    setBusy(true); setErr("");
    try {
      const { error } = await supabase.from("correspondence").insert({
        department_id: me.department_id,
        kind: "faq",
        subject: selectedMsg.subject,
        body: answer.trim(),
        audience: "all",
        status: "active",
        posted_by: me.id,
      });
      if (error) throw error;
      await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const TABS = [
    { id: "inbox", label: "Inbox" },
    { id: "questions", label: `Questions${messages?.filter(m => m.kind === "board_question").length ? ` (${messages.filter(m => m.kind === "board_question").length})` : ""}` },
    { id: "announce", label: "Post Announcement" },
    { id: "alert", label: "🚨 Alert" },
    { id: 'requests', label: `Meeting Requests${requests.filter(r => !r.status || r.status === 'pending').length > 0 ? ` (${requests.filter(r => !r.status || r.status === 'pending').length})` : ''}` },
  ];

  // inbox = member messages; questions = board-question submissions
  const inboxItems = (messages || []).filter(m => m.kind === (tab === "questions" ? "board_question" : "message"));

  return (
    <div>
      <PageTitle sub="Member messages, announcements, and critical alerts">Correspondence</PageTitle>

      {/* Active alert banner for board */}
      {alert && (
        <div style={{ background: "rgba(239,106,100,.12)", border: "1px solid rgba(239,106,100,.4)", borderRadius: 12, padding: "14px 16px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <AlertTriangle size={18} color={POA.red} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: POA.red, fontSize: 13, marginBottom: 3 }}>ACTIVE ALERT — visible to all members</div>
            <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 2 }}>{alert.subject}</div>
            <div style={{ fontSize: 13, color: POA.textSecondary }}>{alert.body}</div>
          </div>
          <button style={{ ...PS.btn, color: POA.red, flexShrink: 0 }} disabled={busy} onClick={doClearAlert}>Clear alert</button>
        </div>
      )}

      <ErrBox msg={err} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#06090A" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}` }}>
            {t.label}
            {t.id === "inbox" && messages && messages.filter(m => m.kind === "message").length > 0 && (
              <span style={{ background: POA.accentSoft, color: POA.accent, borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{messages.filter(m => m.kind === "message").length}</span>
            )}
          </button>
        ))}
      </div>

      {/* INBOX + QUESTIONS */}
      {(tab === "inbox" || tab === "questions") && (
        <div>
          {!messages ? <Spinner /> : inboxItems.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>
              {tab === "questions" ? "No questions from members yet." : "No messages from members yet."}
            </div></Card>
          ) : selectedMsg ? (
            <div>
              <button onClick={() => setSelectedMsg(null)} style={{ ...PS.btn, marginBottom: 16 }}><ArrowLeft size={13} /> Back</button>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 4 }}>{selectedMsg.subject}</div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>From {selectedMsg.sender?.full_name || (selectedMsg.kind === "board_question" ? "Anonymous" : "Member")} · {fmtDate(selectedMsg.created_at)}</span>
                  {selectedMsg.kind === "board_question" && !selectedMsg.sender && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: POA.accentSoft, color: POA.accent, letterSpacing: ".05em" }}>ANONYMOUS</span>
                  )}
                </div>
                <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65, marginBottom: 14 }}>{selectedMsg.body}</div>
                {(selectedMsg.replies || []).map(r => (
                  <div key={r.id} style={{ borderTop: `0.5px solid ${POA.hairline}`, paddingTop: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 6 }}>Board reply · {fmtDate(r.created_at)}</div>
                    <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65 }}>{r.body}</div>
                  </div>
                ))}
              </Card>
              <div style={{ marginTop: 12 }}>
                <label className="fl" style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6, display: "block" }}>Reply</label>
                <textarea value={replyText[selectedMsg.id] || ""} onChange={e => setReplyText(r => ({ ...r, [selectedMsg.id]: e.target.value }))}
                  placeholder="Type your reply…" style={{ ...PS.textarea, minHeight: 100 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={PS.btnPrimary} disabled={busy || !replyText[selectedMsg.id]?.trim()} onClick={() => doReply(selectedMsg.id)}>
                    <Send size={14} /> Send reply
                  </button>
                  <button style={PS.btn} disabled={busy || !replyText[selectedMsg.id]?.trim()} onClick={doPostFaq}>
                    <MessageSquare size={13} /> Post as FAQ
                  </button>
                </div>
                <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
                  "Post as FAQ" publishes this question and your answer to the member FAQ — visible to everyone.
                </div>
              </div>
            </div>
          ) : (
            inboxItems.map(m => (
              <Card key={m.id} style={{ cursor: "pointer" }} onClick={() => setSelectedMsg(m)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{m.subject || "Message"}</div>
                    <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{m.sender?.full_name || (m.kind === "board_question" ? "Anonymous" : "Member")} · {fmtDate(m.created_at)}</span>
                      {m.kind === "board_question" && !m.sender && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: POA.accentSoft, color: POA.accent, letterSpacing: ".05em" }}>ANON</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.body}</div>
                  </div>
                  {(m.replies || []).length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(70,199,147,.14)", color: POA.green, flexShrink: 0 }}>Replied</span>
                  )}
                  <ChevronRight size={15} color={POA.textMuted} style={{ flexShrink: 0 }} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* POST ANNOUNCEMENT */}
      {tab === "announce" && (
        <div>
          <Card>
            <SectionTitle>New announcement</SectionTitle>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Subject</div>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Meeting reminder — July 12" style={PS.input} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Message</div>
              <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="What do members need to know?" style={PS.textarea} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Audience</div>
              <select value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value, audience_value: "" })} style={PS.input}>
                <option value="all">All members</option>
                <option value="district">Specific district</option>
                <option value="role">Specific role</option>
              </select>
            </div>
            {form.audience !== "all" && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>
                  {form.audience === "district" ? "District" : "Role"}
                </div>
                <input value={form.audience_value}
                  onChange={e => setForm({ ...form, audience_value: e.target.value })}
                  placeholder={form.audience === "district" ? "e.g. District 4" : "e.g. Board"}
                  style={PS.input} />
              </div>
            )}
            <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={busy} onClick={doPostAnnouncement}>
              <Send size={14} /> Post announcement
            </button>
          </Card>

          <SectionTitle>Recent announcements</SectionTitle>
          {!announcements ? <Spinner /> : announcements.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No announcements yet.</div></Card>
          ) : announcements.map(a => (
            <Card key={a.id}>
              <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 3 }}>{a.subject}</div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>
                {fmtDate(a.created_at)} · {a.audience === "all" ? "All members" : `${a.audience}: ${a.audience_value}`}
              </div>
              <div style={{ fontSize: 13, color: POA.textSecondary, lineHeight: 1.55 }}>{a.body}</div>
            </Card>
          ))}
        </div>
      )}

      {/* CRITICAL ALERT */}
      {tab === "alert" && (
        <div>
          <div style={{ background: "rgba(239,106,100,.06)", border: "1px solid rgba(239,106,100,.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ fontWeight: 700, color: POA.red, marginBottom: 6 }}>Critical Alert</div>
            <div style={{ fontSize: 13, color: POA.textMuted, lineHeight: 1.6 }}>
              Posting an alert immediately shows a red banner on every member's dashboard. Use only for genuine critical incidents — officer down, active threat, urgent member safety notice. Clear it as soon as the situation is resolved.
            </div>
          </div>
          {alert ? (
            <Card style={{ borderColor: "rgba(239,106,100,.4)" }}>
              <div style={{ fontWeight: 700, color: POA.red, marginBottom: 6 }}>⚠ Active alert</div>
              <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 4 }}>{alert.subject}</div>
              <div style={{ fontSize: 13, color: POA.textSecondary, marginBottom: 14 }}>{alert.body}</div>
              <button style={{ ...PS.btnPrimary, background: POA.red, width: "100%" }} disabled={busy} onClick={doClearAlert}>
                Clear alert — remove from all member dashboards
              </button>
            </Card>
          ) : (
            <Card>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Alert subject</div>
                <input value={alertForm.subject} onChange={e => setAlertForm({ ...alertForm, subject: e.target.value })}
                  placeholder="e.g. Officer down — District 4" style={PS.input} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Alert message</div>
                <textarea value={alertForm.body} onChange={e => setAlertForm({ ...alertForm, body: e.target.value })}
                  placeholder="What members need to know right now…" style={{ ...PS.textarea, minHeight: 80 }} />
              </div>
              <button style={{ ...PS.btnPrimary, background: POA.red, width: "100%" }} disabled={busy} onClick={doPostAlert}>
                <AlertTriangle size={14} /> Post critical alert
              </button>
            </Card>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <Card>
              <div style={{ color: POA.textMuted, fontSize: 13.5, textAlign: 'center', padding: '16px 0' }}>
                No meeting requests yet.
              </div>
            </Card>
          ) : requests.map(req => {
            const isPending = !req.status || req.status === 'pending';
            return (
              <Card key={req.id} style={{ marginBottom: 10, borderLeft: `3px solid ${isPending ? POA.amber : POA.green}`, borderRadius: '0 13px 13px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{req.members?.full_name || 'Member'}</div>
                    <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                      {req.members?.phone && `${req.members.phone} · `}
                      {req.members?.email && `${req.members.email} · `}
                      {fmtDate(req.created_at)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: isPending ? 'rgba(240,180,74,.14)' : 'rgba(70,199,147,.14)', color: isPending ? POA.amber : POA.green, flexShrink: 0 }}>
                    {req.status || 'Pending'}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: POA.textPrimary, marginBottom: 4 }}>{req.subject}</div>
                {req.body && <div style={{ fontSize: 13, color: POA.textSecondary, lineHeight: 1.65, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{req.body}</div>}

                {isPending && (
                  responding === req.id || responding === req.id + '_propose' || responding === req.id + '_decline' ? (
                    <div>
                      <textarea value={reqReply} onChange={e => setReqReply(e.target.value)}
                        style={{ ...PS.textarea, minHeight: 80, marginBottom: 8 }}
                        placeholder={
                          responding === req.id + '_propose'
                            ? 'Suggest an alternate time…'
                            : responding === req.id + '_decline'
                            ? 'Optional note to the member…'
                            : 'Optional message with your confirmation…'
                        } />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...PS.btnPrimary, fontSize: 12 }} disabled={replyBusy}
                          onClick={async () => {
                            setReplyBusy(true);
                            try {
                              const status = responding.includes('_propose') ? 'proposed' : responding.includes('_decline') ? 'declined' : 'confirmed';
                              const replyBody = status === 'confirmed'
                                ? `Your meeting request has been accepted. ${reqReply || 'I\'ll be in touch to confirm the details.'}`
                                : status === 'proposed'
                                ? reqReply || 'That time doesn\'t work — let me suggest an alternative.'
                                : reqReply || 'I\'m unable to meet at this time.';
                              await supabase.from('correspondence').update({ status }).eq('id', req.id);
                              await supabase.from('correspondence').insert({
                                department_id: me.department_id,
                                member_id: req.member_id,
                                kind: 'reply',
                                subject: `Re: ${req.subject}`,
                                body: replyBody,
                                thread_id: req.id,
                                replied_by: me.id,
                              });
                              setResponding(null); setReqReply('');
                              const { data } = await supabase.from('correspondence')
                                .select('*, members!correspondence_member_id_fkey(full_name, phone, email)')
                                .eq('department_id', me.department_id)
                                .eq('kind', 'meeting_request')
                                .order('created_at', { ascending: false });
                              setRequests(data || []);
                            } catch(e) { setErr(e.message); }
                            finally { setReplyBusy(false); }
                          }}>
                          {replyBusy ? 'Sending…' : 'Send reply'}
                        </button>
                        <button style={PS.btn} onClick={() => { setResponding(null); setReqReply(''); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button style={{ ...PS.btnPrimary, fontSize: 12, background: 'rgba(70,199,147,.15)', color: POA.green, border: '0.5px solid rgba(70,199,147,.3)' }}
                        onClick={() => { setResponding(req.id); setReqReply(''); }}>
                        <CheckCircle2 size={12} /> Accept
                      </button>
                      <button style={{ ...PS.btn, fontSize: 12 }}
                        onClick={() => { setResponding(req.id + '_propose'); setReqReply(''); }}>
                        <Clock size={12} /> Propose alternate
                      </button>
                      <button style={{ ...PS.btn, fontSize: 12, color: POA.red }}
                        onClick={() => { setResponding(req.id + '_decline'); setReqReply(''); }}>
                        Decline
                      </button>
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MemberCorrespondence({ me }) {
  const [tab, setTab]           = useState('announcements');
  const [announcements, setAnnouncements] = useState(null);
  const [messages, setMessages] = useState(null);
  const [form, setForm]         = useState({ subject: '', body: '' });
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState('');
  const [sent, setSent]         = useState(false);
  const [alert, setAlert]       = useState(null);

  async function load() {
    const [ann, msgs] = await Promise.all([listAnnouncements(), listMessages()]);
    setAnnouncements(ann);
    setMessages(msgs.filter(m => m.member_id === me.id));
  }
  useEffect(() => {
    localStorage.setItem(`last_seen_${me.id}`, new Date().toISOString());
    getActiveAlert().then(setAlert).catch(() => null);
    load();
  }, [me.id]);

  async function doSend() {
    if (!form.subject.trim() || !form.body.trim()) { setErr('Subject and message required.'); return; }
    setBusy(true); setErr('');
    try {
      await sendMessage(form.subject, form.body);
      setForm({ subject: '', body: '' });
      setSent(true);
      await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const TABS = [{ id: 'announcements', label: 'Announcements' }, { id: 'messages', label: 'My Messages' }, { id: 'new', label: '+ New Message' }];

  return (
    <div>
      <PageTitle sub="Association announcements and your messages to the board">Correspondence</PageTitle>
      {alert && (
        <div style={{ background: 'rgba(239,106,100,.1)', border: '1px solid rgba(239,106,100,.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={16} color={POA.red} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: POA.red, fontSize: 13, marginBottom: 2 }}>CRITICAL ALERT</div>
            <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 2 }}>{alert.subject}</div>
            <div style={{ fontSize: 12, color: POA.textSecondary }}>{alert.body}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSent(false); setErr(''); }}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? '#06090A' : POA.btnText, border: tab === t.id ? 'none' : `0.5px solid ${POA.btnBorder}` }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'announcements' && (
        <div>
          {!announcements ? <Spinner /> : announcements.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No announcements yet.</div></Card>
          ) : announcements.map(a => (
            <Card key={a.id}>
              <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 3 }}>{a.subject}</div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 8 }}>{fmtDate(a.created_at)}</div>
              <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65 }}>{a.body}</div>
            </Card>
          ))}
        </div>
      )}
      {tab === 'messages' && (
        <div>
          {!messages ? <Spinner /> : messages.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No messages sent yet. Use '+ New Message' to contact the board.</div></Card>
          ) : messages.map(m => (
            <Card key={m.id}>
              <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 3 }}>{m.subject}</div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>{fmtDate(m.created_at)}</div>
              <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.55, marginBottom: m.replies?.length ? 12 : 0 }}>{m.body}</div>
              {(m.replies || []).map(r => (
                <div key={r.id} style={{ borderTop: `0.5px solid ${POA.hairline}`, paddingTop: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: POA.accent, marginBottom: 4 }}>Board replied · {fmtDate(r.created_at)}</div>
                  <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.55 }}>{r.body}</div>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: (m.replies||[]).length ? 'rgba(70,199,147,.14)' : POA.accentSoft, color: (m.replies||[]).length ? POA.green : POA.textMuted }}>
                  {(m.replies||[]).length ? 'Replied' : 'Pending'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {tab === 'new' && (
        <Card>
          <SectionTitle>Message the board</SectionTitle>
          {sent && <div style={{ background: 'rgba(70,199,147,.1)', border: '0.5px solid rgba(70,199,147,.3)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: POA.greenText, marginBottom: 12 }}>Message sent. The board will follow up with you here.</div>}
          <ErrBox msg={err} />
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Subject</div>
            <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" style={PS.input} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Message</div>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Tell the board what you need…" style={PS.textarea} />
          </div>
          <button style={{ ...PS.btnPrimary, width: '100%' }} disabled={busy || !form.subject.trim() || !form.body.trim()} onClick={doSend}>
            <Send size={14} /> Send to board
          </button>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: 'italic' }}>Messages go directly to the board. Replies appear under 'My Messages'.</div>
        </Card>
      )}
    </div>
  );
}

function ValueLedger({ me }) {
  const today = new Date();
  const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
  const fmt = d => d.toISOString().split("T")[0];

  const PERIODS = [
    { label: "This Month", start: new Date(today.getFullYear(), today.getMonth(), 1), end: today },
    { label: "This Quarter", start: qStart, end: today },
    { label: "This Year", start: new Date(today.getFullYear(), 0, 1), end: today },
    { label: "Last Year", start: new Date(today.getFullYear() - 1, 0, 1), end: new Date(today.getFullYear() - 1, 11, 31) },
  ];

  const [period, setPeriod]     = useState(1); // default: This Quarter
  const [custom, setCustom]     = useState({ start: "", end: "" });
  const [showCustom, setShowCustom] = useState(false);
  const [data, setData]         = useState(null);
  const [narrative, setNarrative]       = useState("");
  const [savedNarrative, setSavedNarrative] = useState("");
  const [narrativeRecord, setNarrativeRecord] = useState(null);
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [aiBusy, setAiBusy]     = useState(false);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");
  const [ledgerTab, setLedgerTab] = useState("ledger");

  const activeStart = showCustom && custom.start ? custom.start : fmt(PERIODS[period].start);
  const activeEnd   = showCustom && custom.end   ? custom.end   : fmt(PERIODS[period].end);

  async function load() {
    setData(null); setErr("");
    try {
      const d = await getValueLedger(activeStart, activeEnd);
      setData(d);
    } catch(e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, [activeStart, activeEnd]);

  async function draftNarrative() {
    if (!data) return;
    setAiBusy(true); setErr("");
    try {
      const res = await fetch("/api/draft-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, period: showCustom ? `${activeStart} to ${activeEnd}` : PERIODS[period].label }),
      });
      const json = await res.json().catch(() => ({}));
      setNarrative(json.narrative || "AI drafting isn't configured yet — add ANTHROPIC_API_KEY in Vercel.");
      setEditingNarrative(true);
    } catch(e) { setErr("AI endpoint not available."); }
    finally { setAiBusy(false); }
  }

  async function saveNarrative() {
    setBusy(true);
    try {
      const rec = await saveLedgerNarrative(
        me.department_id, activeStart, activeEnd, narrative, me.id
      );
      setSavedNarrative(narrative); setNarrativeRecord(rec); setEditingNarrative(false);
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  // Load saved narrative when period changes
  useEffect(() => {
    setSavedNarrative(""); setNarrative(""); setNarrativeRecord(null); setEditingNarrative(false);
    getLedgerNarrative(activeStart, activeEnd)
      .then(rec => {
        if (rec) { setSavedNarrative(rec.narrative); setNarrative(rec.narrative); setNarrativeRecord(rec); }
      }).catch(() => null);
  }, [activeStart, activeEnd]);

  const n = (val) => val != null ? val : "—";
  const money = (val) => val != null && val > 0 ? "$" + Number(val).toLocaleString() : val === 0 ? "$0" : "—";

  const STATS = data ? [
    { group: "Meetings", items: [
      { label: "Meetings held", value: n(data.meetings_held), sub: "completed events" },
      { label: "Total check-ins", value: n(data.total_checkins), sub: "across all events" },
      { label: "Minutes filed", value: n(data.minutes_filed), sub: "of record" },
    ]},
    { group: "Membership", items: [
      { label: "Active members", value: n(data.active_members), sub: "on roster" },
      { label: "In good standing", value: n(data.good_standing), sub: "current" },
    ]},
    { group: "Action Items", items: [
      { label: "Completed", value: n(data.actions_completed), sub: "this period" },
      { label: "Still open", value: n(data.actions_open), sub: "in progress" },
    ]},
    { group: "Causes", items: [
      { label: "Active causes", value: n(data.causes_active), sub: "running" },
      { label: "Contributions tracked", value: money(data.contributions_tracked), sub: "recorded in app" },
    ]},
    { group: "Communication", items: [
      { label: "Announcements sent", value: n(data.announcements_sent), sub: "to members" },
      { label: "Member messages", value: n(data.messages_resolved), sub: "received" },
    ]},
  ] : [];

  return (
    <div>
      <PageTitle sub="What the association delivered — countable and honest">Value Ledger</PageTitle>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["ledger","Ledger"],["items","Value Items"]].map(([id, label]) => (
          <button key={id} onClick={() => setLedgerTab(id)}
            style={{ ...PS.btn, background: ledgerTab === id ? POA.accent : POA.btnBg, color: ledgerTab === id ? "#06090A" : POA.btnText, border: ledgerTab === id ? "none" : `0.5px solid ${POA.btnBorder}` }}>
            {label}
          </button>
        ))}
      </div>

      {ledgerTab === "ledger" && (<div>
      {/* Period selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => { setPeriod(i); setShowCustom(false); }}
            style={{ ...PS.btn, background: !showCustom && period === i ? POA.accent : POA.btnBg, color: !showCustom && period === i ? "#06090A" : POA.btnText, border: !showCustom && period === i ? "none" : `0.5px solid ${POA.btnBorder}` }}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setShowCustom(true)}
          style={{ ...PS.btn, background: showCustom ? POA.accent : POA.btnBg, color: showCustom ? "#06090A" : POA.btnText, border: showCustom ? "none" : `0.5px solid ${POA.btnBorder}` }}>
          Custom
        </button>
      </div>

      {showCustom && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>From</div>
              <input type="date" value={custom.start} onChange={e => setCustom(c => ({ ...c, start: e.target.value }))} style={PS.input} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>To</div>
              <input type="date" value={custom.end} onChange={e => setCustom(c => ({ ...c, end: e.target.value }))} style={PS.input} />
            </div>
          </div>
        </Card>
      )}

      <ErrBox msg={err} />

      {/* Stats */}
      {!data ? <Spinner /> : (
        <>
          {STATS.map(group => (
            <div key={group.group} style={{ marginBottom: 18 }}>
              <SectionTitle>{group.group}</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {group.items.map(item => (
                  <div key={item.label} style={{ ...PS.card, padding: "14px 16px" }}>
                    <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 28, color: POA.accent, lineHeight: 1 }}>{item.value}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: POA.textPrimary, marginTop: 6 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 2 }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Narrative */}
          <SectionTitle>Board narrative</SectionTitle>
          <Card>
            {editingNarrative ? (
              <>
                <textarea value={narrative} onChange={e => setNarrative(e.target.value)}
                  placeholder="Write 2-3 sentences about what this period meant for the association. AI can draft; you file."
                  style={{ ...PS.textarea, minHeight: 120 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {canManage(me?.access) && (
                    <button style={PS.btnPrimary} disabled={busy} onClick={saveNarrative}>
                      {busy ? "Saving…" : "File narrative"}
                    </button>
                  )}
                  {canManage(me?.access) && (
                    <button style={{ ...PS.btn }} disabled={aiBusy} onClick={draftNarrative}>
                      <Sparkles size={13} /> {aiBusy ? "Drafting…" : "Draft with AI"}
                    </button>
                  )}
                  <button style={PS.btn} onClick={() => { setEditingNarrative(false); setNarrative(savedNarrative); }}>
                    Cancel
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
                  AI drafts from real data only — never fabricates numbers. A board member files it.
                </div>
              </>
            ) : savedNarrative ? (
              <>
                <div style={{ fontSize: 14, color: POA.textSecondary, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{savedNarrative}</div>
                {canManage(me?.access) && (
                  <button style={{ ...PS.btn, marginTop: 12 }} onClick={() => setEditingNarrative(true)}>
                    <Pencil size={12} /> Edit narrative
                  </button>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
                  No narrative filed yet. Write a 2-3 sentence summary of what this period meant — or let AI draft from the numbers above.
                </div>
                {canManage(me?.access) && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={PS.btnPrimary} onClick={() => setEditingNarrative(true)}>
                      <FileText size={14} /> Write narrative
                    </button>
                    <button style={PS.btn} disabled={aiBusy} onClick={draftNarrative}>
                      <Sparkles size={13} /> {aiBusy ? "Drafting…" : "Draft with AI"}
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>

          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 16, lineHeight: 1.6, fontStyle: "italic" }}>
            All numbers pull from your association's live records — meetings, attendance, causes, correspondence. Nothing is fabricated. If data isn't recorded, it shows as —.
          </div>
        </>
      )}
      </div>)}

      {ledgerTab === "items" && <MyValue me={me} />}
    </div>
  );
}

function vimeoEmbedUrl(url) {
  if (!url) return null;
  // handles https://vimeo.com/123456789 and https://player.vimeo.com/video/123456789
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?title=0&byline=0&portrait=0` : null;
}

// Calls Claude through the /api/claude serverless proxy (mirrors /api/draft-minutes).
// The ANTHROPIC_API_KEY lives server-side only — never shipped in the browser bundle.
async function callClaudeAI(systemPrompt, userContent, temperature) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, content: userContent, ...(temperature != null ? { temperature } : {}) }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json().catch(() => ({}));
  return (data.text || "").trim();
}

function SocialMedia({ me, org }) {
  const today = new Date();
  const [cur, setCur]           = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [posts, setPosts]       = useState([]);
  const [cats, setCats]         = useState([]);
  const [videos, setVideos]     = useState([]);
  const [showVideos, setShowVideos] = useState(false);
  const [showIdeas, setShowIdeas]   = useState(false);
  const [showAdd, setShowAdd]   = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddVid, setShowAddVid] = useState(false);
  const [selCat, setSelCat]     = useState(null);
  const [postDay, setPostDay]   = useState(today.getDate());
  const [postText, setPostText] = useState("");
  const [newCat, setNewCat]     = useState({ label: "", color: POA.accent, default_text: "" });
  const [newVid, setNewVid]     = useState({ title: "", description: "", vimeo_url: "", series_name: "" });
  const [caption, setCaption]   = useState("");
  const [captionTopic, setCaptionTopic] = useState("");
  const [captionBusy, setCaptionBusy]   = useState(false);
  const [captionOut, setCaptionOut]     = useState("");
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);

  const COLORS = ["#9B6BE6","#46C793","#57B6E0","#F0B44A","#EF6A64","#B48AEF","#7AD8B0","#E8A87C"];

  async function loadAll() {
    const [p, c, v] = await Promise.all([
      listContentCalendar(cur.y, cur.m),
      listPostCategories(),
      listVideos(),
    ]);
    setPosts(p); setCats(c); setVideos(v);
    if (c.length && !selCat) setSelCat(c[0]);
  }
  useEffect(() => { loadAll(); }, [cur.y, cur.m]);

  async function doAddPost() {
    if (!selCat) return;
    setBusy(true); setErr("");
    try {
      await addContentPost({
        department_id: me.department_id,
        date: `${cur.y}-${String(cur.m + 1).padStart(2,"0")}-${String(postDay).padStart(2,"0")}`,
        theme: selCat.label,
        caption: postText.trim() || selCat.default_text || "",
        color: selCat.color,
      });
      setShowAdd(false); setPostText("");
      await loadAll();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doRemovePost(id) {
    if (!confirm("Remove this post from the calendar?")) return;
    try { await removeContentPost(id); await loadAll(); }
    catch(e) { setErr(e.message); }
  }

  async function doAddCat() {
    if (!newCat.label.trim()) return;
    setBusy(true); setErr("");
    try {
      const sortOrder = cats.reduce((mx, c) => Math.max(mx, c.sort_order || 0), 0) + 1;
      await addPostCategory({
        department_id: me.department_id,
        label: newCat.label.trim(),
        color: newCat.color,
        default_text: newCat.default_text.trim() || null,
        is_default: false,
        sort_order: sortOrder,
      });
      setNewCat({ label: "", color: POA.accent, default_text: "" });
      setShowAddCat(false);
      await loadAll();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doAddVideo() {
    if (!newVid.title.trim() || !newVid.vimeo_url.trim()) { setErr("Title and Vimeo URL required."); return; }
    setBusy(true); setErr("");
    try {
      const newVideo = await addVideo({
        department_id: me.department_id,
        title: newVid.title.trim(),
        description: newVid.description.trim() || null,
        vimeo_url: newVid.vimeo_url.trim(),
        series_name: newVid.series_name.trim() || null,
        posted_by: me.id,
      });
      // Fetch and store thumbnail so members don't re-fetch from Vimeo each load
      if (newVideo) {
        const thumb = await getVimeoThumb(newVid.vimeo_url.trim());
        if (thumb) {
          await supabase.from('association_videos').update({ thumbnail_url: thumb }).eq('id', newVideo.id);
        }
      }
      setNewVid({ title: "", description: "", vimeo_url: "", series_name: "" });
      setShowAddVid(false);
      await loadAll();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doCaptionDraft() {
    if (!captionTopic.trim()) return;
    setCaptionBusy(true); setCaptionOut(""); setErr("");
    try {
      const sys = `You write short, warm social media captions for a police officers' association to build community visibility and trust. Match a professional but approachable voice. Plain, genuine, under 60 words, with a tasteful hashtag or two. Never reference sensitive law enforcement details or ongoing cases. Return only the caption.`;
      const out = await callClaudeAI(sys, `Association: ${org?.name || "Police Officers' Association"}\nPost topic: ${captionTopic}`);
      setCaptionOut(out);
    } catch(e) { setErr("AI caption drafting failed. Check ANTHROPIC_API_KEY in Vercel."); }
    finally { setCaptionBusy(false); }
  }

  // calendar grid
  const dim      = new Date(cur.y, cur.m + 1, 0).getDate();
  const startDow = new Date(cur.y, cur.m, 1).getDay();
  const cells    = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const byDay = {};
  posts.forEach(p => {
    const d = new Date(p.date + "T12:00:00").getDate();
    (byDay[d] = byDay[d] || []).push(p);
  });
  const isToday = d => d && cur.y === today.getFullYear() && cur.m === today.getMonth() && d === today.getDate();

  return (
    <div>
      <PageTitle sub="Content calendar, AI captions, and your video library">Social & Media</PageTitle>
      <ErrBox msg={err} />

      {/* CONTENT CALENDAR */}
      <div>
          {/* Category chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {cats.map(c => (
              <button key={c.id} onClick={() => { setSelCat(c); setPostText(c.default_text || ""); setShowAdd(true); }}
                style={{ border: `1.5px solid ${c.color}`, color: c.color, background: POA.btnBg, borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Plus size={12} /> {c.label}
              </button>
            ))}
            <button onClick={() => setShowAddCat(!showAddCat)}
              style={{ border: `1.5px solid ${POA.hairline}`, color: POA.textMuted, background: POA.btnBg, borderRadius: 999, padding: "5px 12px", fontSize: 11.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Plus size={12} /> New category
            </button>
          </div>

          {/* Add category form */}
          {showAddCat && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>New category</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Label</div>
                  <input value={newCat.label} onChange={e => setNewCat({ ...newCat, label: e.target.value })} style={PS.input} placeholder="e.g. PAC Update" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Color</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setNewCat({ ...newCat, color: c })}
                        style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: newCat.color === c ? "2px solid #fff" : "none", cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Default caption text (optional)</div>
                <input value={newCat.default_text} onChange={e => setNewCat({ ...newCat, default_text: e.target.value })} style={PS.input} placeholder="Pre-filled text when adding a post" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={busy} onClick={doAddCat}>Save category</button>
                <button style={PS.btn} onClick={() => setShowAddCat(false)}>Cancel</button>
              </div>
            </Card>
          )}

          {/* Add post form */}
          {showAdd && selCat && (
            <Card style={{ marginBottom: 14, borderColor: selCat.color }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: selCat.color }} />
                <div style={{ fontWeight: 700, fontSize: 13.5, color: POA.textPrimary }}>{selCat.label}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Day of month</div>
                  <input type="number" min={1} max={dim} value={postDay} onChange={e => setPostDay(e.target.value)} style={PS.input} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Caption / note</div>
                  <input value={postText} onChange={e => setPostText(e.target.value)} style={PS.input} placeholder={selCat.default_text || "What's the post about?"} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={busy} onClick={doAddPost}>Add to calendar</button>
                <button style={PS.btn} onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </Card>
          )}

          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 17, color: POA.textPrimary }}>{MONTHS[cur.m]} {cur.y}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={PS.btn} onClick={() => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 })}>‹</button>
              <button style={PS.btn} onClick={() => setCur({ y: today.getFullYear(), m: today.getMonth() })}>Today</button>
              <button style={PS.btn} onClick={() => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 })}>›</button>
            </div>
          </div>

          {/* Calendar grid */}
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 8 }}>
              {DOW.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".06em", padding: "4px 0" }}>{d}</div>)}
            </div>
            {Array.from({ length: cells.length / 7 }, (_, w) => (
              <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
                {cells.slice(w * 7, w * 7 + 7).map((d, i) => (
                  <div key={i} style={{ minHeight: 64, background: isToday(d) ? POA.accentSoft : "transparent", border: `0.5px solid ${isToday(d) ? POA.accent : POA.hairline}`, borderRadius: 7, padding: "4px 5px" }}>
                    {d && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: isToday(d) ? 700 : 400, color: isToday(d) ? POA.accent : POA.textMuted, marginBottom: 3 }}>{d}</div>
                        {(byDay[d] || []).map(p => (
                          <button key={p.id} onClick={() => doRemovePost(p.id)}
                            style={{ display: "block", width: "100%", textAlign: "left", background: p.color || POA.accent, border: "none", borderRadius: 4, padding: "2px 5px", fontSize: 10, fontWeight: 600, color: "#fff", marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.theme}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </Card>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8 }}>
            {posts.length} post{posts.length !== 1 ? "s" : ""} scheduled in {MONTHS[cur.m]} · tap a colored post to remove it
          </div>
        </div>

      {/* AI CAPTION HELPER */}
      <div>
          <Card style={{ borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 14px 14px 0" }}>
            <SectionTitle>AI Caption Helper</SectionTitle>
            <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 20, color: POA.textPrimary, marginBottom: 4 }}>Write a post for your association</div>
            <div style={{ fontSize: 13.5, color: POA.textMuted, marginBottom: 14 }}>What's the post about?</div>
            <input id="caption-input" value={captionTopic} onChange={e => setCaptionTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !captionBusy && doCaptionDraft()}
              placeholder="e.g. Our members volunteered at the District 4 food drive" style={{ ...PS.input, marginBottom: 12 }} />
            <button style={PS.btnPrimary} disabled={captionBusy || !captionTopic.trim()} onClick={doCaptionDraft}>
              <Sparkles size={14} /> {captionBusy ? "Writing…" : "Draft a caption"}
            </button>
          </Card>
          {captionOut && (
            <Card style={{ marginTop: 14 }}>
              <SectionTitle>Your caption</SectionTitle>
              <div style={{ fontSize: 14.5, color: POA.textPrimary, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 12 }}>{captionOut}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btn} onClick={() => navigator.clipboard.writeText(captionOut)}>Copy</button>
                <button style={PS.btn} onClick={() => { setCaptionOut(""); setCaptionTopic(""); }}>Clear</button>
              </div>
              <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>Review before posting — AI drafts, you publish.</div>
            </Card>
          )}
          <div style={{ marginTop: 20 }}>
            <div onClick={() => setShowIdeas(v => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <SectionTitle>Ideas for things to post</SectionTitle>
              {showIdeas ? <ChevronUp size={16} color={POA.textMuted} /> : <ChevronDown size={16} color={POA.textMuted} />}
            </div>
            {showIdeas && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              {[
                { title: "Member spotlight", desc: "Highlight a member's service or milestone." },
                { title: "Community impact", desc: "Show what the association did for the community." },
                { title: "Association win", desc: "CBA progress, legal victory, or member benefit." },
                { title: "Safety tip", desc: "Public safety awareness from your members." },
                { title: "Event reminder", desc: "Upcoming meeting, vote, or community event." },
                { title: "The ask", desc: "Recruit, donate, show up, get involved." },
              ].map(i => (
                <div key={i.title} style={{ ...PS.card, padding: "13px 14px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: POA.textPrimary, marginBottom: 4 }}>{i.title}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.45, marginBottom: 10 }}>{i.desc}</div>
                  <button style={{ ...PS.btn, width: "100%", justifyContent: "center" }}
                    onClick={() => { setCaptionTopic(i.title); document.getElementById('caption-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                    <Sparkles size={12} /> Draft this
                  </button>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

      {/* VIDEO LIBRARY */}
      <div style={{ marginTop: 20 }}>
        <div onClick={() => setShowVideos(v => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <SectionTitle>Video Library</SectionTitle>
          {showVideos ? <ChevronUp size={16} color={POA.textMuted} /> : <ChevronDown size={16} color={POA.textMuted} />}
        </div>
        {showVideos && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: POA.textMuted }}>Internal comms, training series, and association updates.</div>
            <button style={PS.btn} onClick={() => setShowAddVid(!showAddVid)}><Plus size={13} /> Add video</button>
          </div>

          {showAddVid && (
            <Card style={{ marginBottom: 16 }}>
              <SectionTitle>Add video</SectionTitle>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Title</div>
                <input value={newVid.title} onChange={e => setNewVid({ ...newVid, title: e.target.value })} style={PS.input} placeholder="e.g. Q2 Internal Comms — July Update" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Vimeo URL</div>
                <input value={newVid.vimeo_url} onChange={e => setNewVid({ ...newVid, vimeo_url: e.target.value })} style={PS.input} placeholder="https://vimeo.com/123456789" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Series name (optional)</div>
                <input value={newVid.series_name} onChange={e => setNewVid({ ...newVid, series_name: e.target.value })} style={PS.input} placeholder="e.g. Internal Comms Series" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Description (optional)</div>
                <textarea value={newVid.description} onChange={e => setNewVid({ ...newVid, description: e.target.value })} style={{ ...PS.textarea, minHeight: 70 }} placeholder="What's this video about?" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={busy} onClick={doAddVideo}>Save video</button>
                <button style={PS.btn} onClick={() => setShowAddVid(false)}>Cancel</button>
              </div>
            </Card>
          )}

          {videos.length === 0 && !showAddVid && (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No videos posted yet. Add your first video above.</div></Card>
          )}
          {videos.map(v => {
            const embedUrl = vimeoEmbedUrl(v.vimeo_url);
            return (
              <Card key={v.id} style={{ marginBottom: 14 }}>
                {v.series_name && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: POA.accent, marginBottom: 6 }}>{v.series_name}</div>}
                <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 4 }}>{v.title}</div>
                {v.description && <div style={{ fontSize: 13, color: POA.textMuted, lineHeight: 1.55, marginBottom: 10 }}>{v.description}</div>}
                {embedUrl && (
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: 10, marginBottom: 10 }}>
                    <iframe src={embedUrl} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 10 }}
                      allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={v.title} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11.5, color: POA.textMuted }}>{fmtDate(v.created_at)}</div>
                  <button style={{ ...PS.btn, color: POA.red, fontSize: 12 }} onClick={async () => { if (confirm("Remove this video?")) { await removeVideo(v.id); await loadAll(); } }}>Remove</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

const FUNDRAISER_COLORS = ["#F0B44A","#9B6BE6","#46C793","#57B6E0","#EF6A64","#B48AEF"];

const POA_IDEA_BANK = [
  // Community Experiences
  { title: "Ride Along Auction", pitch: "Auction off ride-along experiences with officers — high perceived value, low cost.", key: "ride_along", cat: "Community Experiences", tags: ["High Profit Potential","Corporate Sponsorship Friendly","Premium Experience"] },
  { title: "K9 Meet & Greet Day", pitch: "Community loves the dogs. Easy to sponsor, great for families.", key: "k9_meet", cat: "Community Experiences", tags: ["Family Friendly","Low Cost","Community Engagement"] },
  { title: "Junior Officer Academy", pitch: "Kids go through a mini police academy. Parents pay, kids love it.", key: "junior_academy", cat: "Community Experiences", tags: ["Family Friendly","Community Engagement","Recruitment Opportunity"] },
  { title: "Citizens Police Challenge", pitch: "Public competes in police-style challenges. Builds community trust.", key: "citizens_challenge", cat: "Community Experiences", tags: ["Community Engagement","Outdoor","Large Department"] },
  { title: "Police Skills Obstacle Course", pitch: "Open to the public. Timed runs, sponsor each station.", key: "obstacle_course", cat: "Community Experiences", tags: ["Outdoor","Fitness","Corporate Sponsorship Friendly"] },
  { title: "Patrol Car Touch-a-Truck", pitch: "Families explore patrol vehicles. Simple, high attendance.", key: "touch_truck", cat: "Community Experiences", tags: ["Family Friendly","Low Cost","Community Engagement"] },
  { title: "Coffee With Cops Festival", pitch: "Multiple coffee sponsors, officers mingle with the public. Recurring potential.", key: "coffee_cops", cat: "Community Experiences", tags: ["Low Cost","Community Engagement","Recurring Monthly","Corporate Sponsorship Friendly"] },
  { title: "Night Patrol Experience", pitch: "VIP ticket holders ride along on a Friday night. Premium price point.", key: "night_patrol", cat: "Community Experiences", tags: ["Premium Experience","High Profit Potential","Small Volunteer Base"] },
  { title: "Mounted Unit Demonstration", pitch: "Horses draw crowds. Great photo opportunity and sponsor backdrop.", key: "mounted_demo", cat: "Community Experiences", tags: ["Family Friendly","Community Engagement","Outdoor"] },
  { title: "Drone Demonstration Day", pitch: "Tech-forward crowd pleaser. Drone sponsors eager to participate.", key: "drone_demo", cat: "Community Experiences", tags: ["Family Friendly","Corporate Sponsorship Friendly","Community Engagement"] },
  // Family Events
  { title: "Cops & Kids Carnival", pitch: "Full carnival with officer-run booths. Signature community event.", key: "carnival", cat: "Family Events", tags: ["Family Friendly","Signature Annual Event","Community Engagement","Outdoor"] },
  { title: "Teddy Bear Picnic", pitch: "Kids bring stuffed animals, officers bring K9s. Low cost, high warmth.", key: "teddy_picnic", cat: "Family Events", tags: ["Family Friendly","Low Cost","Community Engagement"] },
  { title: "Hero Family Fun Run", pitch: "5K with families. Sponsor every mile marker.", key: "fun_run", cat: "Family Events", tags: ["Family Friendly","Outdoor","Corporate Sponsorship Friendly","Fitness"] },
  { title: "Neighborhood Movie Night", pitch: "Outdoor screening with patrol car parking. Sponsors love the captive audience.", key: "movie_night", cat: "Family Events", tags: ["Family Friendly","Low Cost","Community Engagement","Outdoor"] },
  { title: "First Responder Easter Egg Drop", pitch: "Helicopter or drone drops thousands of eggs. Kids go wild.", key: "egg_drop", cat: "Family Events", tags: ["Family Friendly","Signature Annual Event","Community Engagement"] },
  { title: "Halloween Safety Village", pitch: "Safe trick-or-treat with every station themed. Annual repeat event.", key: "halloween", cat: "Family Events", tags: ["Family Friendly","Recurring Monthly","Holiday-Themed","Community Engagement"] },
  { title: "Christmas Cruiser Parade", pitch: "Decorated patrol cars parade through neighborhoods. Easy, beloved.", key: "xmas_parade", cat: "Family Events", tags: ["Family Friendly","Holiday-Themed","Low Cost","Community Engagement"] },
  { title: "Santa Escort Experience", pitch: "Officers escort Santa to neighborhoods. Premium package for families.", key: "santa_escort", cat: "Family Events", tags: ["Family Friendly","Holiday-Themed","Premium Experience"] },
  { title: "Bike Rodeo", pitch: "Kids learn bike safety. Sponsors provide helmets. Annual staple.", key: "bike_rodeo", cat: "Family Events", tags: ["Family Friendly","Low Cost","Community Engagement","Recruitment Opportunity"] },
  { title: "Family Field Day", pitch: "Classic field day games with officer teams vs families.", key: "field_day", cat: "Family Events", tags: ["Family Friendly","Outdoor","Community Engagement","Low Cost"] },
  // Competitions
  { title: "Cornhole Tournament", pitch: "Easy to run, great sponsor visibility, everyone participates.", key: "cornhole", cat: "Competitions", tags: ["Low Cost","Minimal Planning","Corporate Sponsorship Friendly","Indoor"] },
  { title: "BBQ Smoke-Off", pitch: "Teams compete, public pays to judge. Food sponsors line up.", key: "bbq", cat: "Competitions", tags: ["Outdoor","Corporate Sponsorship Friendly","Community Engagement","Signature Annual Event"] },
  { title: "Chili Championship", pitch: "Low cost to run, high engagement. Officers vs public.", key: "chili", cat: "Competitions", tags: ["Low Cost","Indoor","Community Engagement","Corporate Sponsorship Friendly"] },
  { title: "Donut Decorating Contest", pitch: "Bakeries sponsor. Officers judge. Press loves it.", key: "donut_decorate", cat: "Competitions", tags: ["Low Cost","Family Friendly","Community Engagement","Minimal Planning"] },
  { title: "Patrol Vehicle Car Show", pitch: "Current and vintage patrol cars on display. Enthusiast crowd pays.", key: "car_show", cat: "Competitions", tags: ["Community Engagement","Corporate Sponsorship Friendly","Outdoor"] },
  { title: "Police vs Fire Softball", pitch: "Classic rivalry game. Community takes sides. Easy to sell tickets.", key: "softball", cat: "Competitions", tags: ["Community Engagement","Outdoor","Low Cost","Signature Annual Event"] },
  { title: "K9 Agility Competition", pitch: "Multiple departments compete. Crowd loves watching the dogs work.", key: "k9_agility", cat: "Competitions", tags: ["Community Engagement","Outdoor","Corporate Sponsorship Friendly"] },
  { title: "Axe Throwing Tournament", pitch: "Growing sport. Easy venue partnership. Adult crowd, premium price.", key: "axe_throwing", cat: "Competitions", tags: ["High Profit Potential","Corporate Sponsorship Friendly","Indoor"] },
  { title: "Trivia Night", pitch: "Police-themed trivia. Easy to host monthly. Recurring revenue.", key: "trivia", cat: "Competitions", tags: ["Low Cost","Indoor","Recurring Monthly","Minimal Planning"] },
  { title: "Pickleball Tournament", pitch: "Fastest growing sport. All ages. Sponsor every court.", key: "pickleball", cat: "Competitions", tags: ["Outdoor","Corporate Sponsorship Friendly","Community Engagement"] },
  // Community Challenges
  { title: "Escape Room Weekend", pitch: "Police-themed escape rooms. Businesses sponsor each room.", key: "escape_room", cat: "Community Challenges", tags: ["Indoor","Corporate Sponsorship Friendly","High Profit Potential","Weather Independent"] },
  { title: "Amazing Race Through Town", pitch: "Teams complete missions at local businesses. Town-wide engagement.", key: "amazing_race", cat: "Community Challenges", tags: ["Community Engagement","Corporate Sponsorship Friendly","Outdoor"] },
  { title: "Scavenger Hunt", pitch: "QR codes at sponsor locations. Easy to scale, low overhead.", key: "scavenger", cat: "Community Challenges", tags: ["Low Cost","Community Engagement","Family Friendly","Corporate Sponsorship Friendly"] },
  { title: "Poker Run", pitch: "Motorcycle or car route through sponsor locations. Strong community draw.", key: "poker_run", cat: "Community Challenges", tags: ["Outdoor","Corporate Sponsorship Friendly","Community Engagement"] },
  { title: "Passport to Local Businesses", pitch: "Visit 20 businesses, collect stamps, win prizes. Businesses love it.", key: "passport", cat: "Community Challenges", tags: ["Community Engagement","Corporate Sponsorship Friendly","Recurring Monthly"] },
  { title: "Hidden Badge Hunt", pitch: "Hide challenge coins across town. Thousands search. Donation to unlock clues.", key: "badge_hunt", cat: "Community Challenges", tags: ["Community Engagement","Low Cost","Family Friendly"] },
  { title: "Treasure Hunt", pitch: "Multi-day hunt with escalating prizes. Donations unlock clues.", key: "treasure_hunt", cat: "Community Challenges", tags: ["Community Engagement","High Profit Potential","Family Friendly"] },
  { title: "QR Code Adventure", pitch: "Digital scavenger hunt at sponsor locations. Modern, scalable.", key: "qr_adventure", cat: "Community Challenges", tags: ["Community Engagement","Corporate Sponsorship Friendly","Low Cost"] },
  { title: "City Photo Challenge", pitch: "Instagram-style challenges at landmarks. Sponsors pick winners.", key: "photo_challenge", cat: "Community Challenges", tags: ["Low Cost","Community Engagement","Minimal Planning"] },
  { title: "Geocaching Event", pitch: "Tech-savvy crowd. Cache prizes at sponsor locations.", key: "geocaching", cat: "Community Challenges", tags: ["Outdoor","Community Engagement","Family Friendly","Low Cost"] },
  // Educational
  { title: "Self Defense Classes", pitch: "Women's series with paid registration. Officers teach, community learns.", key: "self_defense", cat: "Educational", tags: ["Recurring Monthly","Indoor","Weather Independent","Community Engagement"] },
  { title: "Situational Awareness Workshop", pitch: "Corporate audience pays premium. One officer, one room.", key: "situational", cat: "Educational", tags: ["High Profit Potential","Indoor","Small Volunteer Base","Corporate Sponsorship Friendly"] },
  { title: "Teen Driver Safety Day", pitch: "Parents pay. Officers teach. Sponsors provide vehicles.", key: "teen_driver", cat: "Educational", tags: ["Community Engagement","Family Friendly","Corporate Sponsorship Friendly"] },
  { title: "Women's Safety Seminar", pitch: "Ticketed event. Practical skills. High word-of-mouth.", key: "womens_safety", cat: "Educational", tags: ["Indoor","Community Engagement","Recurring Monthly","Weather Independent"] },
  { title: "Fraud Prevention Workshop", pitch: "Senior audience. Bank sponsors. Easy to fill seats.", key: "fraud_prevention", cat: "Educational", tags: ["Indoor","Corporate Sponsorship Friendly","Community Engagement","Low Cost"] },
  { title: "Internet Safety Night", pitch: "Parents and kids together. School partnerships drive attendance.", key: "internet_safety", cat: "Educational", tags: ["Family Friendly","Indoor","Community Engagement","Low Cost"] },
  { title: "Child ID Event", pitch: "Free fingerprinting, paid sponsorships. Community goodwill builder.", key: "child_id", cat: "Educational", tags: ["Low Cost","Family Friendly","Community Engagement","Corporate Sponsorship Friendly"] },
  { title: "Senior Scam Prevention", pitch: "AARP partnership potential. Senior centers fill the room.", key: "senior_scam", cat: "Educational", tags: ["Indoor","Community Engagement","Corporate Sponsorship Friendly","Weather Independent"] },
  { title: "Stop the Bleed Course", pitch: "Life-saving skill. Corporate groups pay for team training.", key: "stop_bleed", cat: "Educational", tags: ["Indoor","High Profit Potential","Corporate Sponsorship Friendly","Weather Independent"] },
  { title: "CPR Certification Weekend", pitch: "Charge per certification. Hospitals sponsor. High demand.", key: "cpr", cat: "Educational", tags: ["Indoor","High Profit Potential","Corporate Sponsorship Friendly","Weather Independent"] },
  // Behind-the-Scenes
  { title: "Dispatch Center Tour", pitch: "Limited tickets, premium price. Insider access people can't get anywhere else.", key: "dispatch_tour", cat: "Behind-the-Scenes", tags: ["Premium Experience","Small Volunteer Base","High Profit Potential","Indoor"] },
  { title: "Jail Tour Experience", pitch: "Behind the bars experience. Haunted version at Halloween.", key: "jail_tour", cat: "Behind-the-Scenes", tags: ["Premium Experience","Indoor","Weather Independent","Holiday-Themed"] },
  { title: "SWAT Equipment Showcase", pitch: "Tactical gear display. Corporate sponsors love the branding opportunity.", key: "swat_showcase", cat: "Behind-the-Scenes", tags: ["Community Engagement","Corporate Sponsorship Friendly","High Profit Potential"] },
  { title: "Motorcycle Unit Day", pitch: "Precision riding demonstration. Sponsors get logo on the bikes.", key: "motorcycle_day", cat: "Behind-the-Scenes", tags: ["Community Engagement","Outdoor","Corporate Sponsorship Friendly"] },
  { title: "Detective for a Day", pitch: "Work a mock case. Premium ticket. Corporate team-building potential.", key: "detective_day", cat: "Behind-the-Scenes", tags: ["Premium Experience","High Profit Potential","Indoor","Corporate Sponsorship Friendly"] },
  { title: "CSI Demonstration", pitch: "Crime scene science fascinates everyone. Schools pay for field trips.", key: "csi_demo", cat: "Behind-the-Scenes", tags: ["Community Engagement","Indoor","Corporate Sponsorship Friendly","Family Friendly"] },
  { title: "Bomb Squad Demo", pitch: "Robot demo draws massive crowd. One of the most-requested experiences.", key: "bomb_squad", cat: "Behind-the-Scenes", tags: ["Community Engagement","Outdoor","Corporate Sponsorship Friendly"] },
  { title: "Dive Team Demo", pitch: "Waterfront event. Sponsors get naming rights on each dive.", key: "dive_demo", cat: "Behind-the-Scenes", tags: ["Outdoor","Community Engagement","Corporate Sponsorship Friendly"] },
  { title: "Mounted Patrol Experience", pitch: "Interact with horses and riders. Rural and suburban crowds love it.", key: "mounted_exp", cat: "Behind-the-Scenes", tags: ["Family Friendly","Outdoor","Community Engagement"] },
  { title: "Aviation Unit Open House", pitch: "Helicopter up close. Families, kids, enthusiasts all show up.", key: "aviation", cat: "Behind-the-Scenes", tags: ["Family Friendly","Outdoor","Community Engagement","Corporate Sponsorship Friendly"] },
  // Fitness
  { title: "Stair Climb Challenge", pitch: "Building climbs raise money per floor. Corporate teams compete.", key: "stair_climb", cat: "Fitness", tags: ["High Profit Potential","Corporate Sponsorship Friendly","Indoor","Weather Independent"] },
  { title: "Memorial Ruck March", pitch: "Honor fallen officers. Emotional, high participation, sponsor every mile.", key: "ruck_march", cat: "Fitness", tags: ["Outdoor","Community Engagement","Signature Annual Event","Corporate Sponsorship Friendly"] },
  { title: "Murph Competition", pitch: "CrossFit crowd shows up. Easy to sell heat spots. Hero WOD.", key: "murph", cat: "Fitness", tags: ["Outdoor","Corporate Sponsorship Friendly","Fitness","Community Engagement"] },
  { title: "Push-Up Challenge", pitch: "Pledge per push-up. Virtual or in-person. Easy to go viral.", key: "pushup", cat: "Fitness", tags: ["Low Cost","Community Engagement","Minimal Planning","Recurring Monthly"] },
  { title: "Pull-Up Competition", pitch: "Gym partnership, corporate teams, online bracket. Low overhead.", key: "pullup", cat: "Fitness", tags: ["Low Cost","Corporate Sponsorship Friendly","Indoor","Weather Independent"] },
  { title: "Bench Press Meet", pitch: "Powerlifting gyms co-host. Weight class brackets. Easy to sponsor.", key: "bench_press", cat: "Fitness", tags: ["Indoor","Corporate Sponsorship Friendly","Weather Independent"] },
  { title: "Fitness Relay", pitch: "Teams of 4-6. Multiple stations. Businesses sponsor each station.", key: "fitness_relay", cat: "Fitness", tags: ["Outdoor","Corporate Sponsorship Friendly","Community Engagement"] },
  { title: "Team Endurance Challenge", pitch: "Multi-hour team event. Corporate groups buy entry packages.", key: "endurance", cat: "Fitness", tags: ["High Profit Potential","Corporate Sponsorship Friendly","Outdoor"] },
  { title: "Rowing Competition", pitch: "Indoor rowing machines. Corporate relay teams. Weather independent.", key: "rowing", cat: "Fitness", tags: ["Indoor","Corporate Sponsorship Friendly","Weather Independent","High Profit Potential"] },
  { title: "Tactical Fitness Challenge", pitch: "Police-inspired workouts open to public. Officers compete alongside.", key: "tactical_fit", cat: "Fitness", tags: ["Outdoor","Community Engagement","Corporate Sponsorship Friendly"] },
  // Creative
  { title: "Police Patch Festival", pitch: "Collectors trade patches. Table fees plus sponsor revenue.", key: "patch_fest", cat: "Creative", tags: ["Indoor","Community Engagement","Weather Independent"] },
  { title: "Badge Collectors Expo", pitch: "Niche audience, high spend. Table fees and exclusive merchandise.", key: "badge_expo", cat: "Creative", tags: ["Indoor","High Profit Potential","Weather Independent"] },
  { title: "Police Memorabilia Show", pitch: "Retired officers bring artifacts. Press loves the history angle.", key: "memorabilia", cat: "Creative", tags: ["Indoor","Community Engagement","Weather Independent"] },
  { title: "Public Safety Art Show", pitch: "Local artists interpret public safety themes. Gallery night format.", key: "art_show", cat: "Creative", tags: ["Indoor","Community Engagement","Corporate Sponsorship Friendly","Weather Independent"] },
  { title: "Photography Contest", pitch: "Public submits law enforcement photos. Online voting drives donations.", key: "photo_contest", cat: "Creative", tags: ["Low Cost","Community Engagement","Minimal Planning"] },
  { title: "Community Mural Project", pitch: "Artist paints mural, public watches and donates. Permanent legacy piece.", key: "mural", cat: "Creative", tags: ["Community Engagement","Corporate Sponsorship Friendly","Outdoor"] },
  { title: "Lego Emergency City Build", pitch: "Teams build emergency scenes. Kids division. Corporate teams. Prize.", key: "lego", cat: "Creative", tags: ["Family Friendly","Indoor","Corporate Sponsorship Friendly","Weather Independent"] },
  { title: "Toy Patrol Car Build-Off", pitch: "Kids decorate cardboard patrol cars. Parade follows. Media loves it.", key: "toy_car", cat: "Creative", tags: ["Family Friendly","Low Cost","Community Engagement"] },
  { title: "Comic Book Convention", pitch: "Police-themed comic art. Officer cosplay welcome. Vendor tables.", key: "comic_con", cat: "Creative", tags: ["Indoor","Community Engagement","Family Friendly","Weather Independent"] },
  { title: "Hero Costume Ball", pitch: "Adults dress as officers and heroes. Gala pricing. Venue partnership.", key: "costume_ball", cat: "Creative", tags: ["High Profit Potential","Indoor","Corporate Sponsorship Friendly","Premium Experience"] },
  // Food Experiences
  { title: "Battle of the Food Trucks", pitch: "10+ trucks, public votes. Trucks pay entry, sponsors pay more.", key: "food_trucks", cat: "Food Experiences", tags: ["Outdoor","Community Engagement","Corporate Sponsorship Friendly","Signature Annual Event"] },
  { title: "Donut Crawl", pitch: "Passport to bakeries. Cop + donut angle is irresistible PR.", key: "donut_crawl", cat: "Food Experiences", tags: ["Community Engagement","Corporate Sponsorship Friendly","Low Cost"] },
  { title: "Coffee Passport", pitch: "Visit 10 coffee shops. Stamp card. Shops donate percentage.", key: "coffee_passport", cat: "Food Experiences", tags: ["Low Cost","Community Engagement","Corporate Sponsorship Friendly","Recurring Monthly"] },
  { title: "Wing Festival", pitch: "Restaurants compete. Public pays to judge. Sauce sponsor opportunity.", key: "wing_fest", cat: "Food Experiences", tags: ["Outdoor","Community Engagement","Corporate Sponsorship Friendly","Signature Annual Event"] },
  { title: "Chili Trail", pitch: "Weekend-long trail of restaurants. Passport stamp format.", key: "chili_trail", cat: "Food Experiences", tags: ["Community Engagement","Corporate Sponsorship Friendly","Low Cost"] },
  { title: "BBQ Passport", pitch: "Visit 10 BBQ joints, collect stamps, win prizes. Businesses donate revenue.", key: "bbq_passport", cat: "Food Experiences", tags: ["Community Engagement","Corporate Sponsorship Friendly","Low Cost"] },
  { title: "Burger Battle", pitch: "Restaurants submit best burger. Public votes with dollars.", key: "burger_battle", cat: "Food Experiences", tags: ["Community Engagement","Corporate Sponsorship Friendly","Outdoor"] },
  { title: "Dessert Walk", pitch: "Bakeries line the street. Ticket includes tastings. Easy to sell out.", key: "dessert_walk", cat: "Food Experiences", tags: ["Community Engagement","Corporate Sponsorship Friendly","Family Friendly"] },
  { title: "Breakfast With Officers", pitch: "Diner sponsors. Officers eat with the public. Recurring potential.", key: "breakfast", cat: "Food Experiences", tags: ["Low Cost","Community Engagement","Recurring Monthly","Corporate Sponsorship Friendly"] },
  { title: "Community Picnic", pitch: "Park setting, food trucks, officer games. Family staple.", key: "picnic", cat: "Food Experiences", tags: ["Family Friendly","Outdoor","Community Engagement","Low Cost"] },
  // Premium Experiences
  { title: "Chief for a Day", pitch: "Winner shadows the chief all day. Auction format. High perceived value.", key: "chief_day", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Small Volunteer Base"] },
  { title: "Ride in the BearCat Experience", pitch: "Armored vehicle ride-along. Unique, memorable, easy to auction.", key: "bearcat", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Small Volunteer Base"] },
  { title: "Precision Driving Course", pitch: "Ride with a trained driver. Corporate team packages.", key: "precision_drive", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Corporate Sponsorship Friendly"] },
  { title: "K9 Handler Experience", pitch: "Work with a K9 for an afternoon. Limited tickets, premium price.", key: "k9_handler", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Small Volunteer Base"] },
  { title: "Sheriff BBQ at the Range", pitch: "Shooting range + BBQ. Exclusive. Corporate groups book it out.", key: "range_bbq", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Corporate Sponsorship Friendly","Small Volunteer Base"] },
  { title: "Honor Guard Gala", pitch: "Black tie event. Honor guard performs. Highest ticket price of the year.", key: "honor_gala", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Corporate Sponsorship Friendly","Signature Annual Event"] },
  { title: "Tactical Team Meet-Up", pitch: "SWAT team Q&A and demo. Exclusive access for top donors.", key: "tactical_meetup", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Small Volunteer Base"] },
  { title: "VIP Range Day", pitch: "Shooting instruction from officers. Corporate team building packages.", key: "range_day", cat: "Premium Experiences", tags: ["Premium Experience","High Profit Potential","Corporate Sponsorship Friendly"] },
  { title: "Executive Leadership Breakfast", pitch: "Business leaders meet the chief. Sponsor tables. Keynote format.", key: "exec_breakfast", cat: "Premium Experiences", tags: ["High Profit Potential","Corporate Sponsorship Friendly","Indoor","Premium Experience"] },
  { title: "Heroes Gala Under the Stars", pitch: "Outdoor gala. Table sponsorships. Awards ceremony. Signature event.", key: "heroes_gala", cat: "Premium Experiences", tags: ["Signature Annual Event","High Profit Potential","Corporate Sponsorship Friendly","Outdoor","Premium Experience"] },
  // Wild Cards (from the innovation list)
  { title: "Car Smash for Cash", pitch: "People donate to destroy a junk car with bats and sledgehammers. VIP ticket = 10 minutes.", key: "car_smash", cat: "Wild Cards", tags: ["High Profit Potential","Outdoor","Community Engagement"] },
  { title: "Lock Up Your Boss", pitch: "Businesses nominate their boss, officers 'arrest' them, coworkers donate to make bail.", key: "lock_up_boss", cat: "Wild Cards", tags: ["High Profit Potential","Corporate Sponsorship Friendly","Community Engagement"] },
  { title: "Last Squad Standing", pitch: "20 teams, police-style challenges — Survivor meets Amazing Race.", key: "last_squad", cat: "Wild Cards", tags: ["High Profit Potential","Outdoor","Community Engagement","Large Department"] },
  { title: "Reverse Ticket Day", pitch: "Officers hand out sponsor coupons with QR codes instead of citations. Donations unlock prizes.", key: "reverse_ticket", cat: "Wild Cards", tags: ["Low Cost","Community Engagement","Corporate Sponsorship Friendly"] },
  { title: "Squad Car Escape Room", pitch: "Locked evidence in an old patrol car. Puzzle chain. Escape in 15 minutes.", key: "car_escape", cat: "Wild Cards", tags: ["Indoor","High Profit Potential","Corporate Sponsorship Friendly","Weather Independent"] },
  { title: "Midnight Donut Dash", pitch: "Midnight start, bakery checkpoints, costumes encouraged. Completely unique.", key: "donut_dash", cat: "Wild Cards", tags: ["Community Engagement","Outdoor","Signature Annual Event"] },
  { title: "Police Auction Draft", pitch: "Businesses bid to 'draft' an officer who volunteers at their business for 4 hours.", key: "officer_draft", cat: "Wild Cards", tags: ["High Profit Potential","Corporate Sponsorship Friendly","Small Volunteer Base"] },
  { title: "Crime Scene Dinner", pitch: "Fake homicide. Guests solve clues between dinner courses.", key: "crime_dinner", cat: "Wild Cards", tags: ["Premium Experience","High Profit Potential","Indoor","Corporate Sponsorship Friendly"] },
  { title: "Officer Trading Cards", pitch: "Limited edition, random packs, autographed cards. Ultra Rare Chief card. People chase full collections.", key: "trading_cards", cat: "Wild Cards", tags: ["Community Engagement","High Profit Potential","Low Cost"] },
  { title: "Battle of the Chiefs", pitch: "Every chief competes in ridiculous games — pie eating, trivia, golf cart race, obstacle course.", key: "chiefs_battle", cat: "Wild Cards", tags: ["Community Engagement","Outdoor","Signature Annual Event","High Profit Potential"] },
  { title: "Secret Dinner", pitch: "Guests know the date, time, and dress code — not the location. Police escort reveals destination.", key: "secret_dinner", cat: "Wild Cards", tags: ["Premium Experience","High Profit Potential","Signature Annual Event"] },
  { title: "Adopt a Cruiser", pitch: "Businesses adopt patrol cars with temporary wraps. Public votes. Winner gets trophy.", key: "adopt_cruiser", cat: "Wild Cards", tags: ["Community Engagement","Corporate Sponsorship Friendly","High Profit Potential"] },
  { title: "24-Hour Relay Broadcast", pitch: "Livestream games, challenges, and interviews with donation goals all day.", key: "relay_broadcast", cat: "Wild Cards", tags: ["High Profit Potential","Community Engagement","Minimal Planning"] },
  { title: "Community Bucket List", pitch: "Giant board — every donation unlocks another bucket-list activity the department must complete.", key: "bucket_list", cat: "Wild Cards", tags: ["Community Engagement","High Profit Potential","Signature Annual Event"] },
];

const ALL_TAGS = [
  "Low Cost","High Profit Potential","Family Friendly","Indoor","Outdoor",
  "Small Volunteer Base","Large Department","Minimal Planning","Signature Annual Event",
  "Community Engagement","Recruitment Opportunity","Corporate Sponsorship Friendly",
  "Recurring Monthly","Holiday-Themed","Weather Independent","Premium Experience","Fitness",
];

const ALL_CATS = [...new Set(POA_IDEA_BANK.map(i => i.cat))];

const BRAINSTORM_SYS = `You are a creative fundraising strategist for police officers' associations. Your job is to propose 6 fundraiser ideas that are SPECIFIC, VARIED, and perfectly matched to the effort level chosen.

EFFORT LEVEL DEFINITIONS — match these exactly:

QUICK & EASY:
- Planning time: 1-3 weeks
- Volunteers needed: 2-8 people
- Launch cost: under $500
- Format: single evening, weekend morning, or recurring monthly
- Examples: trivia night at a bar, coffee with cops pop-up, push-up challenge with pledge donations, donut crawl to 5 bakeries, axe throwing tournament at existing venue, cornhole tournament at a park, breakfast with officers at a diner

MEDIUM:
- Planning time: 4-10 weeks
- Volunteers needed: 10-25 people
- Launch cost: $500-$2,500
- Format: single day event, half-day event, or weekend event
- Examples: 5K fun run, escape room weekend, poker run, BBQ cook-off, police vs fire softball game, K9 meet & greet day, citizens police challenge, scavenger hunt across businesses
- NEVER suggest: golf scramble (always big event), galas, multi-day festivals, anything requiring 2+ months of planning

BIG EVENT:
- Planning time: 2-6 months
- Volunteers needed: 30+ people or major venue coordination
- Launch cost: $2,000+ investment, large sponsor ask
- Format: major signature event, gala, multi-sponsor production
- Examples: golf scramble, honor guard gala, heroes gala under the stars, annual awards banquet, 24-hour relay broadcast, battle of the chiefs spectacular, secret dinner experience

VARIETY RULES — your 6 ideas MUST:
1. Come from at least 4 different categories (food/drink, fitness, competition, community experience, behind-the-scenes, educational, creative/unique, premium experience)
2. Include at least 1 idea that is genuinely unexpected or creative — something a typical POA hasn't done before
3. Include at least 1 that heavily involves community participation (not just officer-run)
4. NOT be 6 variations of the same theme
5. Be specific — "Badges & Brews Trivia Night at O'Malley's" not just "Trivia Night"

Return ONLY a valid JSON array of 6 objects: {"name": string, "pitch": "one punchy sentence, max 20 words, make it compelling"}. No text outside the JSON.`;

const PLAN_SYS_POA = `You are a fundraising event planner for a police officers' association. Generate a COMPLETE, DETAILED event plan the board can actually execute. This must be thorough and specific — not a summary.

Your response MUST include ALL of these sections in order, using ## for section headers:

## EVENT OVERVIEW
One paragraph describing the event concept, why it works for a POA, and what makes it special.

## GOAL
Specific fundraising goal and how it will be achieved (ticket sales + sponsorships + donations breakdown).

## RECOMMENDED DATE & VENUE
Specific day of week, time of year recommendation, and venue type suggestions with notes on what to look for.

## TIMELINE & CHECKLIST
Week-by-week checklist from today to event day. Be specific — name real tasks, not vague steps. Include:
- 60+ days out tasks
- 30 days out tasks
- 2 weeks out tasks
- Event week tasks
- Day-of tasks
- Post-event tasks (within 48 hours)

## ROLES NEEDED
List every volunteer role needed with the number of people and what they do.

## PROMOTION STEPS
At least 6 specific promotion steps with timing (social posts, press release, email blast, etc).

## REALISTIC MONEY TARGET
Break down expected revenue by source: tickets, sponsorships, donations, merchandise, etc. Give realistic numbers for a mid-size POA.

## SPONSORSHIP PACKAGES
This is critical — be specific and compelling:

Title/Presenting Sponsor — $[amount]
- [3-4 specific benefits]

Gold Sponsor — $[amount]
- [3 specific benefits]

Silver Sponsor — $[amount]
- [2-3 specific benefits]

Bronze Sponsor — $[amount]
- [2 specific benefits]

## A LA CARTE SPONSORSHIPS
List 8-12 individual sponsorship items specific to THIS event with prices and benefits. Be creative — think naming rights for specific elements of the event.

## READY-TO-SEND OUTREACH LINE
One specific, compelling text/email a board member can send to a local business right now. Include the event name, date range, lowest entry price point, and a clear ask.

Be specific to THIS event and THIS association. Do not write generic advice — write an actual plan.`;

const EXTRACT_SYS = `You convert a police officers' association fundraiser plan into trackable work. Respond with ONLY one valid JSON object, no markdown, no code fences. Schema: {"action_items":[{"task":string,"suggested_owner":string|null,"suggested_due_date":"YYYY-MM-DD"|null}],"calendar_events":[{"title":string,"date":"YYYY-MM-DD"}]}. DATES: resolve every relative timing into a real YYYY-MM-DD between today and the target date. calendar_events must be ONLY the 3-5 most important dates. NEVER invent an owner — leave null for a human to fill in. Return ONLY the JSON object.`;

function FundraisingPlanDisplay({ text }) {
  if (!text) return null;

  function renderInline(str) {
    // render **bold** inline
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((p, i) =>
      i % 2 === 1
        ? <strong key={i} style={{ color: POA.textPrimary, fontWeight: 700 }}>{p}</strong>
        : p
    );
  }

  const lines = text.split("\n");
  const els = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();
    i++;

    if (!t) { els.push(<div key={i} style={{ height: 10 }} />); continue; }

    // H1 — # Title
    if (t.startsWith("# ")) {
      els.push(<div key={i} style={{ fontWeight: 700, fontSize: 18, color: POA.textPrimary, marginTop: 4, marginBottom: 12 }}>{t.slice(2).replace(/\*\*/g,"")}</div>);
      continue;
    }

    // H2 — ## Section
    if (t.startsWith("## ")) {
      els.push(
        <div key={i} style={{ marginTop: 22, marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: POA.accent, marginBottom: 3 }}>
            {t.slice(3).replace(/\*\*/g,"")}
          </div>
          <div style={{ height: 1, background: POA.hairline }} />
        </div>
      );
      continue;
    }

    // H3 — ### Subsection
    if (t.startsWith("### ")) {
      els.push(<div key={i} style={{ fontWeight: 700, fontSize: 13.5, color: POA.textPrimary, marginTop: 14, marginBottom: 4 }}>{t.slice(4).replace(/\*\*/g,"")}</div>);
      continue;
    }

    // Sponsorship tier headers (Title/Gold/Silver/Bronze/Presenting/A La Carte)
    const tierMatch = t.replace(/\*\*/g,"").match(/^(title|gold|silver|bronze|presenting|platinum|a la carte|à la carte)(\s*sponsor)?[\s\-—]*/i);
    if (tierMatch && t.length < 80) {
      const tierColors = { title: "#F0B44A", gold: "#F0B44A", presenting: "#F0B44A", platinum: "#9B6BE6", silver: "#A0A0B0", bronze: "#CD7F32" };
      const tierKey = tierMatch[1].toLowerCase();
      const color = tierColors[tierKey] || POA.accentBright;
      els.push(
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <div style={{ fontWeight: 700, fontSize: 14, color }}>{t.replace(/\*\*/g,"")}</div>
        </div>
      );
      continue;
    }

    // A la carte section
    if (/^a.la.carte/i.test(t.replace(/\*\*/g,""))) {
      els.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, color: POA.accentBright, marginTop: 16, marginBottom: 4 }}>{t.replace(/\*\*/g,"")}</div>);
      continue;
    }

    // Dollar amount lines
    if (/^\*?\*?\$[\d,]+/.test(t)) {
      els.push(<div key={i} style={{ fontWeight: 700, color: POA.green, fontSize: 15, marginBottom: 2 }}>{t.replace(/\*\*/g,"")}</div>);
      continue;
    }

    // Bullet points — - or •
    if (t.startsWith("- ") || t.startsWith("• ") || t.startsWith("* ")) {
      const content = t.slice(2);
      els.push(
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "flex-start", paddingLeft: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: POA.accent, flexShrink: 0, marginTop: 8 }} />
          <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65, flex: 1 }}>{renderInline(content)}</div>
        </div>
      );
      continue;
    }

    // Numbered list — 1. 2. etc
    if (/^\d+\.\s/.test(t)) {
      const num = t.match(/^(\d+)\.\s(.*)/);
      if (num) {
        els.push(
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 5, alignItems: "flex-start", paddingLeft: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: POA.accent, flexShrink: 0, minWidth: 18, marginTop: 2 }}>{num[1]}.</div>
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65, flex: 1 }}>{renderInline(num[2])}</div>
          </div>
        );
        continue;
      }
    }

    // Outreach line (quoted)
    if (t.startsWith('"') || t.startsWith('"')) {
      els.push(
        <div key={i} style={{ background: POA.accentSoft, border: `0.5px solid ${POA.accentDim}`, borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", margin: "10px 0", fontSize: 13, color: POA.textPrimary, lineHeight: 1.6, fontStyle: "italic" }}>
          {renderInline(t)}
        </div>
      );
      continue;
    }

    // Bold-only lines (entire line is **text**)
    if (t.startsWith("**") && t.endsWith("**") && t.length > 4) {
      els.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary, marginTop: 12, marginBottom: 4 }}>{t.slice(2,-2)}</div>);
      continue;
    }

    // Default paragraph
    els.push(<div key={i} style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7, marginBottom: 4 }}>{renderInline(t)}</div>);
  }

  return <div style={{ padding: "2px 0" }}>{els}</div>;
}

function Fundraising({ me, org }) {
  const today = new Date();

  // planner state
  const [phase, setPhase]           = useState("input");
  const [detail, setDetail]         = useState("");
  const [goalAmt, setGoalAmt]       = useState("");
  const [effortLevel, setEffortLevel] = useState("Medium");
  const [targetDate, setTargetDate] = useState("");
  const [ideas, setIdeas]           = useState([]);
  const [shownIdeas, setShownIdeas] = useState([]);
  const [chosenIdea, setChosenIdea] = useState(null);
  const [out, setOut]               = useState("");
  const [planReview, setPlanReview] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Working…");
  const [operationalizing, setOperationalizing] = useState(false);
  const [addingToApp, setAddingToApp] = useState(false);
  const [saveTitle, setSaveTitle]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState("");

  // collapsible sections
  const [ideasOpen, setIdeasOpen]   = useState(false);
  const [ideaCat, setIdeaCat]   = useState("All");
  const [ideaTags, setIdeaTags] = useState([]);
  const [calOpen, setCalOpen]       = useState(true);
  const [logOpen, setLogOpen]       = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);

  // calendar state
  const [calCur, setCalCur]         = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [calEvents, setCalEvents]   = useState([]);
  const [calReloadKey, setCalReloadKey] = useState(0);
  const [showAddCal, setShowAddCal] = useState(false);
  const [calTitle, setCalTitle]     = useState("");
  const [calDay, setCalDay]         = useState(today.getDate());
  const [calColor, setCalColor]     = useState(FUNDRAISER_COLORS[0]);

  // log + drafts
  const [log, setLog]               = useState([]);
  const [drafts, setDrafts]         = useState([]);
  const [openDraft, setOpenDraft]   = useState(null);
  const [addingLog, setAddingLog]   = useState(false);
  const [ln, setLn]                 = useState("");
  const [ld, setLd]                 = useState("");
  const [la, setLa]                 = useState("");

  // members for owner matching
  const [members, setMembers]       = useState([]);
  const [causes, setCauses]           = useState([]);
  const [assigningEvent, setAssigningEvent] = useState(null);
  const [assignCauseId, setAssignCauseId]   = useState('');
  const [assignBusy, setAssignBusy]         = useState(false);
  const [assignErr, setAssignErr]           = useState('');

  const totalRaised = log.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  async function loadAll() {
    const [l, d, m, ev] = await Promise.all([
      listFundraiserLog(),
      listAIOutputs("fundraiser"),
      listMembers(),
      listFundingEvents(calCur.y, calCur.m),
    ]);
    setLog(l); setDrafts(d); setMembers(m); setCalEvents(ev);
    listCauses().then(c => setCauses(c.filter(x => x.status === 'active'))).catch(() => null);
  }
  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    listFundingEvents(calCur.y, calCur.m).then(setCalEvents).catch(() => null);
  }, [calCur.y, calCur.m, calReloadKey]);

  async function doAssignToCause() {
    if (!assignCauseId || !assigningEvent) return;
    setAssignBusy(true); setAssignErr('');
    try {
      // Create a cause_event linked to this funding_event
      await supabase.from('cause_events').insert({
        cause_id: assignCauseId,
        department_id: me.department_id,
        title: assigningEvent.title,
        event_date: assigningEvent.date,
        notes: assigningEvent.description || '',
        status: assigningEvent.date >= new Date().toISOString().split('T')[0] ? 'upcoming' : 'completed',
        funding_event_id: assigningEvent.id,
      });
      // Update funding_event with cause reference
      await supabase.from('funding_events').update({ cause_id: assignCauseId }).eq('id', assigningEvent.id);
      setAssigningEvent(null); setAssignCauseId('');
      setCalReloadKey(k => k + 1);
    } catch(e) { setAssignErr(e.message); }
    finally { setAssignBusy(false); }
  }

  // --- owner matching (same pattern as fire) ---
  function matchOwnerId(name) {
    const n = (name || "").trim().toLowerCase();
    if (!n) return "";
    const exact = members.filter(m => m.full_name?.toLowerCase() === n);
    if (exact.length === 1) return exact[0].id;
    const tok = members.filter(m => m.full_name?.toLowerCase().split(/\s+/).includes(n));
    if (tok.length === 1) return tok[0].id;
    return "";
  }
  const normalizeDate = s => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.trim())) ? s.trim() : "";

  // --- brainstorm → ideas ---
  async function brainstorm() {
    if (!detail.trim()) { setErr("Tell us what you're raising for first."); return; }
    setLoading(true); setLoadingLabel("Brainstorming ideas…"); setErr(""); setIdeas([]); setOut("");
    // shuffle and sample 12 random ideas as inspiration — different each call
    const seed = Math.floor(Math.random() * 999999);
    const shuffled = [...POA_IDEA_BANK].sort(() => Math.random() - 0.5).slice(0, 12);
    const sampleIdeas = shuffled.map(i => `${i.title}: ${i.pitch}`).join('\n');
    const recent = log.slice(0, 8).map(e => `${e.name}${e.event_when ? ` (${e.event_when})` : ''}`).join('; ') || 'none yet';
    const previouslyShown = shownIdeas.length > 0 ? shownIdeas.join(', ') : 'none';
    const user = `[Request ID: ${seed}] Association: ${org?.name || 'POA'}\nGoal: ${goalAmt || 'not specified'}\nEffort level: ${effortLevel}\nTarget date: ${targetDate || 'flexible'}\nWhat they're raising for: ${detail}\nRecently run — do NOT suggest these again: ${recent}\nAlready shown in this session — do NOT repeat these: ${previouslyShown}\nIdea inspiration (use as creative springboard, do NOT copy verbatim — invent fresh variations): \n${sampleIdeas}`;
    try {
      const raw = await callClaudeAI(BRAINSTORM_SYS, user, 1.0);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) throw new Error("bad format");
      setIdeas(parsed); setPhase("ideas");
      setShownIdeas(prev => [...prev, ...parsed.map(i => i.name)].slice(-40));
    } catch { setErr("Couldn't brainstorm ideas right now — check ANTHROPIC_API_KEY in Vercel."); }
    finally { setLoading(false); }
  }

  // --- choose idea → build full plan ---
  async function chooseIdea(idea) {
    setChosenIdea(idea); setPhase("plan"); setOut(""); setErr("");
    setLoading(true); setLoadingLabel("Building the plan…");
    const user = `Association: ${org?.name || "POA"}\nChosen fundraiser: ${idea.name} — ${idea.pitch}\nGoal: ${goalAmt || "not specified"}\nEffort: ${effortLevel}\nToday: ${today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}\nTarget date: ${targetDate || "flexible"}\nRaising for: ${detail}`;
    try {
      const t = await callClaudeAI(PLAN_SYS_POA, user);
      setOut(t); setSaveTitle(idea.name.slice(0, 60));
    } catch { setErr("Couldn't build the plan right now. Try again."); }
    finally { setLoading(false); }
  }

  // --- operationalize: extract action items + calendar events ---
  async function extractPlanWork() {
    setOperationalizing(true); setErr("");
    const user = `Today: ${today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}. Target date: ${targetDate || "flexible"}.\n\nFundraiser plan:\n${out}`;
    try {
      const raw = await callClaudeAI(EXTRACT_SYS, user);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no JSON found");
      const parsed = JSON.parse(jsonMatch[0]);
      setPlanReview({
        sourceLabel: `Fundraiser: ${chosenIdea?.name || "plan"}`,
        actionItems: (parsed.action_items || []).map((it, idx) => ({
          id: Date.now() + idx,
          task: it.task || "",
          ownerId: matchOwnerId(it.suggested_owner),
          due: normalizeDate(it.suggested_due_date),
          keep: true,
        })),
        calendarEvents: (parsed.calendar_events || []).map((ev, idx) => ({
          id: Date.now() + 5000 + idx,
          title: ev.title || "",
          date: normalizeDate(ev.date),
          keep: true,
        })),
      });
      setPhase("operationalize");
    } catch {
      setPlanReview({
        sourceLabel: `Fundraiser: ${chosenIdea?.name || "plan"}`,
        actionItems: [
          { id: Date.now(),   task: "", ownerId: "", due: "", keep: true },
          { id: Date.now()+1, task: "", ownerId: "", due: "", keep: true },
          { id: Date.now()+2, task: "", ownerId: "", due: "", keep: true },
        ],
        calendarEvents: [
          { id: Date.now()+10, title: "", date: "", keep: true },
        ],
      });
      setErr("Auto-extraction had trouble — we opened a blank form below. Add tasks manually or try again.");
      setPhase("operationalize");
    } finally { setOperationalizing(false); }
  }

  async function addToApp() {
    if (!planReview) return;
    const validDate = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
    const items  = planReview.actionItems.filter(r => r.keep && r.task.trim());
    const events = planReview.calendarEvents.filter(r => r.keep && r.title.trim() && validDate(r.date));
    if (!items.length && !events.length) { setErr("Keep at least one action item or calendar event."); return; }
    setAddingToApp(true); setErr("");
    try {
      if (items.length) {
        const { error } = await supabase.from("action_items").insert(
          items.map(r => ({ department_id: me.department_id, title: r.task.trim(), owner_member_id: r.ownerId || null, due_date: r.due || null }))
        );
        if (error) throw error;
      }
      if (events.length) {
        const { error } = await supabase.from("funding_events").insert(
          events.map(r => ({ department_id: me.department_id, title: r.title.trim(), date: r.date, color: FUNDRAISER_COLORS[0], source_label: planReview.sourceLabel }))
        );
        if (error) throw error;
        setCalReloadKey(k => k + 1);
      }
      setPlanReview(null); setPhase("plan"); setErr("");
    } catch(e) { setErr(e.message); }
    finally { setAddingToApp(false); }
  }

  // --- save draft ---
  async function doSaveDraft() {
    if (!out || !saveTitle.trim()) return;
    setSaving(true);
    try {
      await saveAIDraft({ department_id: me.department_id, feature: "fundraiser", title: saveTitle.trim(), ai_text: out, created_by: me.id });
      const d = await listAIOutputs("fundraiser"); setDrafts(d);
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  // --- fundraiser log ---
  async function doAddLog() {
    if (!ln.trim()) return;
    try {
      await addFundraiserLog({ department_id: me.department_id, name: ln.trim(), event_when: ld.trim() || null, amount: Number(String(la).replace(/[^0-9.]/g, "")) || 0, created_by: me.id });
      setLn(""); setLd(""); setLa(""); setAddingLog(false);
      const l = await listFundraiserLog(); setLog(l);
    } catch(e) { setErr(e.message); }
  }
  async function doRemoveLog(id) {
    if (!confirm("Remove this entry?")) return;
    try { await removeFundraiserLog(id); const l = await listFundraiserLog(); setLog(l); }
    catch(e) { setErr(e.message); }
  }

  // --- funding calendar ---
  const calDim = new Date(calCur.y, calCur.m + 1, 0).getDate();
  const calByDay = {};
  calEvents.forEach(e => { const d = new Date(e.date + "T12:00:00").getDate(); (calByDay[d] = calByDay[d] || []).push(e); });
  const isTodayCal = d => d && calCur.y === today.getFullYear() && calCur.m === today.getMonth() && d === today.getDate();
  const calCells = [];
  for (let i = 0; i < new Date(calCur.y, calCur.m, 1).getDay(); i++) calCells.push(null);
  for (let d = 1; d <= calDim; d++) calCells.push(d);
  while (calCells.length % 7) calCells.push(null);

  async function doAddCalEvent() {
    if (!calTitle.trim()) return;
    try {
      await addFundingEvent({ department_id: me.department_id, title: calTitle.trim(), date: `${calCur.y}-${String(calCur.m + 1).padStart(2,"0")}-${String(calDay).padStart(2,"0")}`, color: calColor });
      setCalTitle(""); setShowAddCal(false); setCalReloadKey(k => k + 1);
    } catch(e) { setErr(e.message); }
  }
  async function doRemoveCalEvent(id, title) {
    if (!confirm(`Remove "${title}" from the calendar?`)) return;
    try { await removeFundingEvent(id); setCalReloadKey(k => k + 1); }
    catch(e) { setErr(e.message); }
  }

  function startOver() { setPhase("input"); setIdeas([]); setShownIdeas([]); setChosenIdea(null); setOut(""); setErr(""); setPlanReview(null); }

  return (
    <div>
      <PageTitle sub="Plan fundraisers, write the appeals, line up sponsors">Fundraising</PageTitle>
      <ErrBox msg={err} />

      {/* ── PLANNER ── */}
      <Card style={{ borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 14px 14px 0", marginBottom: 18 }}>
        <SectionTitle>Fundraiser Planner</SectionTitle>

        {/* INPUT phase */}
        {phase === "input" && (
          <>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>What are you trying to do?</div>
              <textarea value={detail} onChange={e => setDetail(e.target.value)}
                style={{ ...PS.textarea, minHeight: 70 }} placeholder="e.g. Raise money for the legal defense fund and officer scholarships." />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Goal amount</div>
                <input value={goalAmt} onChange={e => setGoalAmt(e.target.value)} style={PS.input} placeholder="$10,000" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Effort level</div>
                <select value={effortLevel} onChange={e => setEffortLevel(e.target.value)} style={PS.input}>
                  <option>Quick & easy</option>
                  <option>Medium</option>
                  <option>Big event</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Target date</div>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={PS.input} />
              </div>
            </div>
            <button style={PS.btnPrimary} disabled={loading || !detail.trim()} onClick={brainstorm}>
              <Sparkles size={14} /> {loading ? loadingLabel : "Get ideas"}
            </button>
          </>
        )}

        {/* IDEAS phase */}
        {phase === "ideas" && (
          <>
            <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 12, lineHeight: 1.55 }}>
              Six ideas across proven, fresh, and bold. Pick one to build a full plan.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8, marginBottom: 14 }}>
              {ideas.map((idea, i) => (
                <div key={i} style={{ ...PS.card, padding: "12px 13px", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: POA.textPrimary, marginBottom: 4 }}>{idea.name}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.4, flex: 1, marginBottom: 10 }}>{idea.pitch}</div>
                  <button style={{ ...PS.btnPrimary, fontSize: 12, padding: "8px 10px", width: "100%", justifyContent: "center" }}
                    onClick={() => chooseIdea(idea)}>
                    <Sparkles size={12} /> Build the plan
                  </button>
                </div>
              ))}
            </div>
            <button style={PS.btn} onClick={startOver}><ArrowLeft size={13} /> Start over</button>
          </>
        )}

        {/* PLAN phase */}
        {phase === "plan" && (
          <>
            <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 10 }}>
              Plan: <b style={{ color: POA.textPrimary }}>{chosenIdea?.name}</b>
              {loading && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 10, color: POA.textMuted }}>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {loadingLabel}
              </span>}
            </div>
            {out && (
              <>
                <div style={{ background: POA.sidebar, border: `0.5px solid ${POA.hairline}`, borderRadius: 12, padding: "18px 20px", marginBottom: 14, maxHeight: 520, overflowY: "auto" }}>
                  <FundraisingPlanDisplay text={out} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Save as</div>
                    <input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} style={PS.input} placeholder="Draft title" />
                  </div>
                  <button style={{ ...PS.btn, alignSelf: "flex-end" }} disabled={saving || !saveTitle.trim()} onClick={doSaveDraft}>
                    <FileText size={13} /> {saving ? "Saving…" : "Save draft"}
                  </button>
                </div>

                {/* Prominent operationalize button */}
                <div style={{ background: "rgba(155,107,230,.08)", border: `1px solid ${POA.accentDim}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary, marginBottom: 4 }}>Ready to turn this into real work?</div>
                  <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 12, lineHeight: 1.55 }}>
                    Extract action items with owners and due dates, plus calendar milestones — review them before anything gets added to the app.
                  </div>
                  <button style={{ ...PS.btnPrimary, width: "100%" }}
                    disabled={operationalizing} onClick={extractPlanWork}>
                    {operationalizing
                      ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Extracting tasks and milestones…</>
                      : <><ClipboardList size={14} /> Extract action items + calendar milestones</>}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={PS.btn} onClick={() => setPhase("ideas")}><ArrowLeft size={13} /> Back to ideas</button>
                  <button style={PS.btn} onClick={startOver}>Start over</button>
                </div>
              </>
            )}
          </>
        )}

        {/* OPERATIONALIZE phase */}
        {phase === "operationalize" && planReview && (
          <div style={{ borderLeft: `3px solid ${POA.amber}`, paddingLeft: 14, marginTop: 8 }}>
            <div style={{ ...PS.kicker, marginBottom: 4 }}>Review & confirm — turn the plan into tracked work</div>
            <div style={{ fontSize: 12.5, color: POA.textMuted, marginBottom: 14 }}>
              From: <b style={{ color: POA.textPrimary }}>{planReview.sourceLabel}</b>
            </div>

            <div style={{ ...PS.kicker, fontSize: 11, marginBottom: 6 }}>Action items</div>
            {planReview.actionItems.map((r, i) => (
              <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "8px 0", borderBottom: `0.5px solid ${POA.hairline}` }}>
                <input type="checkbox" checked={r.keep} style={{ marginBottom: 10 }}
                  onChange={e => setPlanReview(p => ({ ...p, actionItems: p.actionItems.map((x,j) => j===i ? { ...x, keep: e.target.checked } : x) }))} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 3 }}>Task</div>
                  <input value={r.task} style={PS.input}
                    onChange={e => setPlanReview(p => ({ ...p, actionItems: p.actionItems.map((x,j) => j===i ? { ...x, task: e.target.value } : x) }))} />
                </div>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 3 }}>Owner</div>
                  <select value={r.ownerId} style={PS.input}
                    onChange={e => setPlanReview(p => ({ ...p, actionItems: p.actionItems.map((x,j) => j===i ? { ...x, ownerId: e.target.value } : x) }))}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 3 }}>Due</div>
                  <input type="date" value={r.due} style={PS.input}
                    onChange={e => setPlanReview(p => ({ ...p, actionItems: p.actionItems.map((x,j) => j===i ? { ...x, due: e.target.value } : x) }))} />
                </div>
              </div>
            ))}
            <button style={{ ...PS.btn, marginTop: 8 }}
              onClick={() => setPlanReview(p => ({ ...p, actionItems: [...p.actionItems, { id: Date.now(), task: "", ownerId: "", due: "", keep: true }] }))}>
              <Plus size={13} /> Add action item
            </button>

            <div style={{ ...PS.kicker, fontSize: 11, margin: "16px 0 6px" }}>Calendar events</div>
            {planReview.calendarEvents.map((r, i) => (
              <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", padding: "8px 0", borderBottom: `0.5px solid ${POA.hairline}` }}>
                <input type="checkbox" checked={r.keep} style={{ marginBottom: 10 }}
                  onChange={e => setPlanReview(p => ({ ...p, calendarEvents: p.calendarEvents.map((x,j) => j===i ? { ...x, keep: e.target.checked } : x) }))} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 3 }}>Event</div>
                  <input value={r.title} style={PS.input}
                    onChange={e => setPlanReview(p => ({ ...p, calendarEvents: p.calendarEvents.map((x,j) => j===i ? { ...x, title: e.target.value } : x) }))} />
                </div>
                <div style={{ minWidth: 150 }}>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 3 }}>Date</div>
                  <input type="date" value={r.date} style={PS.input}
                    onChange={e => setPlanReview(p => ({ ...p, calendarEvents: p.calendarEvents.map((x,j) => j===i ? { ...x, date: e.target.value } : x) }))} />
                </div>
              </div>
            ))}
            <button style={{ ...PS.btn, marginTop: 8 }}
              onClick={() => setPlanReview(p => ({ ...p, calendarEvents: [...p.calendarEvents, { id: Date.now(), title: "", date: "", keep: true }] }))}>
              <Plus size={13} /> Add event
            </button>

            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button style={{ ...PS.btnPrimary, opacity: addingToApp ? 0.7 : 1 }} disabled={addingToApp} onClick={addToApp}>
                {addingToApp ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Adding…</> : <><ClipboardList size={14} /> Add to the app</>}
              </button>
              <button style={PS.btn} onClick={() => setPhase("plan")}><ArrowLeft size={13} /> Back to plan</button>
              <button style={PS.btn} onClick={() => { setPlanReview(null); setPhase("plan"); }}>Discard</button>
            </div>
          </div>
        )}
      </Card>

      {/* ── EVENT IDEAS (collapsible) ── */}
      <div onClick={() => setIdeasOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: ideasOpen ? 10 : 16 }}>
        <p style={{ ...PS.kicker, margin: 0 }}>Event ideas ({POA_IDEA_BANK.length})</p>
        {ideasOpen ? <ChevronUp size={15} color={POA.textMuted} /> : <ChevronDown size={15} color={POA.textMuted} />}
      </div>
      {ideasOpen && (
        <>
          <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 14 }}>
            {POA_IDEA_BANK.length} ideas across {ALL_CATS.length} categories. Tap "Plan this" to load into the planner above.
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            <button onClick={() => { setIdeaCat("All"); setIdeaTags([]); }}
              style={{ ...PS.btn, background: ideaCat === "All" ? POA.accent : POA.btnBg, color: ideaCat === "All" ? "#06090A" : POA.btnText, border: ideaCat === "All" ? "none" : `0.5px solid ${POA.btnBorder}`, fontSize: 12 }}>
              All ({POA_IDEA_BANK.length})
            </button>
            {ALL_CATS.map(cat => {
              const count = POA_IDEA_BANK.filter(i => i.cat === cat).length;
              return (
                <button key={cat} onClick={() => { setIdeaCat(cat); setIdeaTags([]); }}
                  style={{ ...PS.btn, background: ideaCat === cat ? POA.accent : POA.btnBg, color: ideaCat === cat ? "#06090A" : POA.btnText, border: ideaCat === cat ? "none" : `0.5px solid ${POA.btnBorder}`, fontSize: 12 }}>
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Tag filters */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
            {ALL_TAGS.map(tag => {
              const on = ideaTags.includes(tag);
              return (
                <button key={tag} onClick={() => setIdeaTags(t => on ? t.filter(x => x !== tag) : [...t, tag])}
                  style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, border: `1px solid ${on ? POA.accent : POA.hairline}`, background: on ? POA.accentSoft : "transparent", color: on ? POA.accent : POA.textMuted, cursor: "pointer" }}>
                  {tag}
                </button>
              );
            })}
            {ideaTags.length > 0 && (
              <button onClick={() => setIdeaTags([])}
                style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, border: `1px solid ${POA.hairline}`, background: "transparent", color: POA.red, cursor: "pointer" }}>
                Clear filters
              </button>
            )}
          </div>

          {/* Filtered ideas grid */}
          {(() => {
            const filtered = POA_IDEA_BANK
              .filter(i => ideaCat === "All" || i.cat === ideaCat)
              .filter(i => ideaTags.length === 0 || ideaTags.every(t => i.tags.includes(t)));
            return (
              <>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 10 }}>
                  {filtered.length} idea{filtered.length !== 1 ? "s" : ""} {ideaTags.length > 0 ? "matching your filters" : ""}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8, marginBottom: 18 }}>
                  {filtered.map(idea => (
                    <div key={idea.key} style={{ ...PS.card, padding: "12px 13px", display: "flex", flexDirection: "column" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.accent, marginBottom: 5 }}>{idea.cat}</div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: POA.textPrimary, marginBottom: 4 }}>{idea.title}</div>
                      <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.4, flex: 1, marginBottom: 8 }}>{idea.pitch}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                        {idea.tags.slice(0,2).map(tag => (
                          <span key={tag} style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{tag}</span>
                        ))}
                      </div>
                      <button style={{ ...PS.btnPrimary, fontSize: 12, padding: "8px 10px", width: "100%", justifyContent: "center" }}
                        onClick={() => { setDetail(`A ${idea.title.toLowerCase()} to raise money for the association.`); setPhase("input"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                        <Sparkles size={12} /> Plan this
                      </button>
                    </div>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No ideas match your filters. Try removing a filter or two.</div></Card>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* ── FUNDRAISING CALENDAR (collapsible) ── */}
      <div onClick={() => setCalOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: calOpen ? 10 : 16 }}>
        <p style={{ ...PS.kicker, margin: 0 }}>Fundraising calendar</p>
        {calOpen ? <ChevronUp size={15} color={POA.textMuted} /> : <ChevronDown size={15} color={POA.textMuted} />}
      </div>
      {calOpen && (
        <Card style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary }}>{MONTHS[calCur.m]} {calCur.y}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={PS.btn} onClick={() => setCalCur(c => c.m === 0 ? { y: c.y-1, m: 11 } : { ...c, m: c.m-1 })}>‹</button>
              <button style={PS.btn} onClick={() => setCalCur({ y: today.getFullYear(), m: today.getMonth() })}>Today</button>
              <button style={PS.btn} onClick={() => setCalCur(c => c.m === 11 ? { y: c.y+1, m: 0 } : { ...c, m: c.m+1 })}>›</button>
              <button style={PS.btn} onClick={() => setShowAddCal(v => !v)}><Plus size={13} /> Add</button>
            </div>
          </div>
          {showAddCal && (
            <div style={{ background: POA.sidebar, borderRadius: 10, padding: "12px 14px", marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Title</div>
                <input value={calTitle} onChange={e => setCalTitle(e.target.value)} style={PS.input} placeholder="e.g. Golf scramble setup day" />
              </div>
              <div style={{ minWidth: 80 }}>
                <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Day</div>
                <select value={calDay} onChange={e => setCalDay(e.target.value)} style={PS.input}>
                  {Array.from({ length: calDim }, (_, i) => i+1).map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Color</div>
                <div style={{ display: "flex", gap: 5 }}>
                  {FUNDRAISER_COLORS.map(c => (
                    <button key={c} onClick={() => setCalColor(c)}
                      style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: calColor === c ? "2px solid #fff" : "none", cursor: "pointer" }} />
                  ))}
                </div>
              </div>
              <button style={PS.btnPrimary} onClick={doAddCalEvent}><Plus size={13} /> Add</button>
              <button style={PS.btn} onClick={() => setShowAddCal(false)}>Cancel</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 8 }}>
            {DOW.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 700, textAlign: "center", color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".06em", padding: "4px 0" }}>{d}</div>)}
          </div>
          {Array.from({ length: calCells.length / 7 }, (_, w) => (
            <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 2 }}>
              {calCells.slice(w*7, w*7+7).map((d, i) => (
                <div key={i} style={{ minHeight: 64, background: isTodayCal(d) ? "rgba(155,107,230,.12)" : "transparent", border: `0.5px solid ${isTodayCal(d) ? POA.accent : POA.hairline}`, borderRadius: 7, padding: "4px 5px" }}>
                  {d && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: isTodayCal(d) ? 700 : 400, color: isTodayCal(d) ? POA.accent : POA.textMuted, marginBottom: 3 }}>{d}</div>
                      {(calByDay[d] || []).map(e => (
                        <button key={e.id} onClick={() => doRemoveCalEvent(e.id, e.title)}
                          title={`${e.title} (tap to remove)`}
                          style={{ display: "block", width: "100%", textAlign: "left", background: e.color || FUNDRAISER_COLORS[0], border: "none", borderRadius: 4, padding: "2px 5px", fontSize: 10, fontWeight: 600, color: "#fff", marginBottom: 2, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.title}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 8 }}>
            {calEvents.length} event{calEvents.length !== 1 ? "s" : ""} in {MONTHS[calCur.m]} · tap an event to remove it
          </div>
          {calEvents.length > 0 && (
            <div style={{ marginTop: 10, borderTop: `0.5px solid ${POA.hairline}`, paddingTop: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 8 }}>Link events to a cause</div>
              {calEvents.map(event => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `0.5px solid ${POA.hairline}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: POA.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                    <div style={{ fontSize: 11, color: POA.textMuted }}>{event.date ? fmtShort(event.date) : ''}</div>
                  </div>
                  <button style={{ ...PS.btn, fontSize: 11, padding: '3px 8px', flexShrink: 0, color: event.cause_id ? POA.green : POA.btnText }}
                    onClick={() => { setAssigningEvent(event); setAssignCauseId(event.cause_id || ''); }}>
                    {event.cause_id ? '✓ Assigned' : '+ Assign to cause'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── RECENT FUNDRAISERS LOG (collapsible) ── */}
      <div onClick={() => setLogOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: logOpen ? 10 : 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ ...PS.kicker, margin: 0 }}>Recent fundraisers</p>
          {totalRaised > 0 && <span style={{ fontWeight: 700, color: POA.greenText, fontSize: 12 }}>${totalRaised.toLocaleString()} raised</span>}
        </div>
        {logOpen ? <ChevronUp size={15} color={POA.textMuted} /> : <ChevronDown size={15} color={POA.textMuted} />}
      </div>
      {logOpen && (
        <>
          <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 10 }}>
            What you've run and what it brought in. Logged events inform the brainstormer so it avoids repeats.
          </div>
          {addingLog && (
            <Card style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Event</div>
                <input value={ln} onChange={e => setLn(e.target.value)} style={PS.input} placeholder="e.g. Golf Scramble" />
              </div>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>When</div>
                <input value={ld} onChange={e => setLd(e.target.value)} style={PS.input} placeholder="e.g. June 2026" />
              </div>
              <div style={{ minWidth: 120 }}>
                <div style={{ fontSize: 11, color: POA.textMuted, marginBottom: 4 }}>Raised ($)</div>
                <input value={la} onChange={e => setLa(e.target.value)} style={PS.input} placeholder="12500" />
              </div>
              <button style={PS.btnPrimary} onClick={doAddLog}><Plus size={13} /> Log it</button>
              <button style={PS.btn} onClick={() => setAddingLog(false)}>Cancel</button>
            </Card>
          )}
          <button style={{ ...PS.btn, marginBottom: 10 }} onClick={() => setAddingLog(v => !v)}>
            <Plus size={13} /> Log a fundraiser
          </button>
          {log.length === 0 && <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>Nothing logged yet.</div></Card>}
          {log.map(e => (
            <Card key={e.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                    {e.event_when || "Recent"}{Number(e.amount) > 0 ? ` · $${Number(e.amount).toLocaleString()} raised` : ""}
                  </div>
                </div>
                <button style={{ ...PS.btn, color: POA.red, fontSize: 12 }} onClick={() => doRemoveLog(e.id)}>Remove</button>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* ── SAVED DRAFTS (collapsible) ── */}
      <div onClick={() => setDraftsOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: draftsOpen ? 10 : 0 }}>
        <p style={{ ...PS.kicker, margin: 0 }}>Saved drafts{drafts.length ? ` (${drafts.length})` : ""}</p>
        {draftsOpen ? <ChevronUp size={15} color={POA.textMuted} /> : <ChevronDown size={15} color={POA.textMuted} />}
      </div>
      {draftsOpen && (
        <>
          {openDraft ? (
            <>
              <button onClick={() => setOpenDraft(null)} style={{ ...PS.btn, margin: "10px 0" }}><ArrowLeft size={13} /> All drafts</button>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 4 }}>{openDraft.title}</div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 12 }}>{fmtDate(openDraft.created_at)}</div>
                <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{openDraft.ai_text}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button style={PS.btn} onClick={() => navigator.clipboard.writeText(openDraft.ai_text)}>Copy</button>
                  <button style={{ ...PS.btn, color: POA.red }} onClick={async () => { await deleteAIDraft(openDraft.id); setOpenDraft(null); const d = await listAIOutputs("fundraiser"); setDrafts(d); }}>Delete</button>
                </div>
              </Card>
            </>
          ) : (
            <>
              {drafts.length === 0 && <Card style={{ marginTop: 10 }}><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No saved drafts yet.</div></Card>}
              {drafts.map(d => (
                <Card key={d.id} style={{ cursor: "pointer", marginTop: 8 }} onClick={() => setOpenDraft(d)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{d.title}</div>
                      <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>{fmtDate(d.created_at)}</div>
                    </div>
                    <ChevronRight size={15} color={POA.textMuted} />
                  </div>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      {assigningEvent && (
        <div onClick={() => { setAssigningEvent(null); setAssignErr(''); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(135deg, #0E1630, #0A1020)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 420, width: '100%', padding: '20px 22px', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent, marginBottom: 8 }}>Assign to cause</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary, marginBottom: 14 }}>{assigningEvent.title}</div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>Which cause does this event support?</div>
            <select value={assignCauseId} onChange={e => setAssignCauseId(e.target.value)} style={{ ...PS.input, marginBottom: 14 }}>
              <option value=''>— Select a cause —</option>
              {causes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {assignErr && <ErrBox msg={assignErr} />}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...PS.btnPrimary }} disabled={assignBusy || !assignCauseId} onClick={doAssignToCause}>
                {assignBusy ? 'Assigning…' : 'Assign to cause'}
              </button>
              <button style={PS.btn} onClick={() => { setAssigningEvent(null); setAssignErr(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardDocuments({ me }) {
  const [docs, setDocs]       = useState(null);
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [err, setErr]         = useState("");
  const [busy, setBusy]       = useState(false);
  const [viewing, setViewing] = useState(null);
  const [f, setF] = useState({
    name: "", category: "General", visibility: "board_only",
    notes: "", file: null,
  });

  async function load() {
    try { setDocs(await listDocuments()); }
    catch(e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setF({ name: "", category: "General", visibility: "board_only", notes: "", file: null });
    setAdding(false); setEditing(null); setErr("");
  }

  async function doUpload() {
    if (!f.file && !editing) { setErr("Please select a file."); return; }
    if (!f.name.trim()) { setErr("Document name is required."); return; }
    setBusy(true); setErr("");
    try {
      if (editing) {
        await updateDocument(editing.id, {
          name: f.name.trim(),
          category: f.category,
          visibility: f.visibility,
          notes: f.notes.trim() || null,
        });
      } else {
        const data = await uploadDocument(f.file, {
          department_id: me.department_id,
          name: f.name.trim(),
          category: f.category,
          visibility: f.visibility,
          notes: f.notes.trim() || null,
          uploaded_by: me.id,
        });
        // for text files, extract content immediately
        if (f.file && (f.file.type === 'text/plain' || f.file.name.endsWith('.md') || f.file.name.endsWith('.txt'))) {
          const text = await f.file.text();
          fetch('/api/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, documentId: data.id }),
          }).catch(() => null); // fire and forget
        }
      }
      resetForm(); await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doArchive(id) {
    if (!confirm("Archive this document? It will no longer be visible to anyone.")) return;
    try { await archiveDocument(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  const CATEGORIES = ["CBA","Bylaws","Policies","Member Handbook","Benefits","Meeting Minutes","General","Other"];
  const grouped = {};
  (docs || []).forEach(d => { (grouped[d.category] = grouped[d.category] || []).push(d); });

  const visIcon = v => v === "all_members" ? "👥" : "🔒";
  const visLabel = v => v === "all_members" ? "All members" : "Board only";
  const sizeLabel = b => !b ? "" : b < 1024 ? `${b}B` : b < 1048576 ? `${Math.round(b/1024)}KB` : `${(b/1048576).toFixed(1)}MB`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <PageTitle sub="Association documents — CBA, bylaws, policies, and member resources" />
        {canManage(me.access) && (
          <button style={PS.btn} onClick={() => { setAdding(!adding); setEditing(null); }}>
            <Plus size={13} /> Upload
          </button>
        )}
      </div>
      <ErrBox msg={err} />

      {/* Upload / Edit form */}
      {(adding || editing) && canManage(me.access) && (
        <Card style={{ marginBottom: 18 }}>
          <SectionTitle>{editing ? "Edit document" : "Upload document"}</SectionTitle>
          {!editing && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>File</div>
              <input type="file" accept=".pdf,.doc,.docx,.txt,.md"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file && !f.name) setF(prev => ({ ...prev, file, name: file.name.replace(/\.[^.]+$/, "") }));
                  else if (file) setF(prev => ({ ...prev, file }));
                }}
                style={{ ...PS.input, padding: "8px 12px", cursor: "pointer" }} />
              {f.file && <div style={{ fontSize: 12, color: POA.green, marginTop: 5 }}>✓ {f.file.name} ({sizeLabel(f.file.size)})</div>}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Document name</div>
              <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
                style={PS.input} placeholder="e.g. 2024-2026 Collective Bargaining Agreement" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Category</div>
              <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} style={PS.input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Who can see this</div>
              <select value={f.visibility} onChange={e => setF({ ...f, visibility: e.target.value })} style={PS.input}>
                <option value="board_only">🔒 Board only</option>
                <option value="all_members">👥 All members</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Notes (optional)</div>
              <input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })}
                style={PS.input} placeholder="e.g. Ratified June 2024, expires 2026" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doUpload}>
              {busy ? "Saving…" : editing ? "Save changes" : "Upload document"}
            </button>
            <button style={PS.btn} onClick={resetForm}>Cancel</button>
            {editing && canAdmin(me.access) && (
              <button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }}
                onClick={() => { doArchive(editing.id); resetForm(); }}>
                Archive
              </button>
            )}
          </div>
          {!editing && (
            <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
              Supported: PDF, Word (.doc/.docx), text files. Documents marked "All members" appear in the member Documents screen and power Ask B4C answers.
            </div>
          )}
        </Card>
      )}

      {!docs ? <Spinner /> : docs.length === 0 && !adding ? (
        <Card>
          <div style={{ color: POA.textMuted, fontSize: 13.5 }}>
            No documents uploaded yet. {canManage(me.access) ? "Upload your CBA, bylaws, and member handbook to power Ask B4C." : "Check back when your board has uploaded documents."}
          </div>
        </Card>
      ) : (
        Object.entries(grouped).map(([cat, catDocs]) => (
          <div key={cat} style={{ marginBottom: 8 }}>
            <SectionTitle>{cat}</SectionTitle>
            {catDocs.map(doc => (
              <Card key={doc.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: POA.textPrimary, marginBottom: 3 }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: POA.textMuted, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span>{visIcon(doc.visibility)} {visLabel(doc.visibility)}</span>
                      {doc.file_name && <span>· {doc.file_name}</span>}
                      {doc.file_size && <span>· {sizeLabel(doc.file_size)}</span>}
                      {doc.members?.full_name && <span>· Uploaded by {doc.members.full_name}</span>}
                    </div>
                    {doc.notes && <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 4, fontStyle: "italic" }}>{doc.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {doc.storage_path && (
                      <button style={{ ...PS.btnPrimary, fontSize: 12, padding: '6px 12px' }}
                        onClick={async () => {
                          try {
                            const url = await getDocumentUrl(doc.storage_path);
                            setViewing({ doc, url });
                          } catch(e) { setErr('Could not open document.'); }
                        }}>
                        Open
                      </button>
                    )}
                    {canManage(me.access) && (
                      <button style={{ ...PS.btn, fontSize: 12 }}
                        onClick={() => {
                          setEditing(doc);
                          setF({ name: doc.name, category: doc.category, visibility: doc.visibility, notes: doc.notes || "", file: null });
                          setAdding(false);
                        }}>
                        <Pencil size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ))
      )}
      {viewing && (
        <div onClick={() => setViewing(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(135deg, #0E1630, #0A1020)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 860, width: '100%', padding: '16px 18px', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent, marginBottom: 2 }}>Document</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: POA.textPrimary }}>{viewing.doc.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={viewing.url} target='_blank' rel='noreferrer'
                  style={{ ...PS.btn, fontSize: 12, textDecoration: 'none' }}>
                  Open in new tab ↗
                </a>
                <button style={{ ...PS.btn, padding: '6px 10px' }} onClick={() => setViewing(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>
            {viewing.doc.mime_type === 'application/pdf' || viewing.doc.file_name?.endsWith('.pdf') ? (
              <iframe src={viewing.url} style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 8, background: '#fff' }} title={viewing.doc.name} />
            ) : viewing.doc.extracted_text ? (
              <div style={{ background: 'rgba(0,0,0,.3)', border: `0.5px solid ${POA.hairline}`, borderRadius: 10, padding: '16px 18px', maxHeight: '75vh', overflowY: 'auto', fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {viewing.doc.extracted_text}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 13.5, color: POA.textMuted, marginBottom: 14 }}>
                  This file type can't be previewed in-app.
                </div>
                <a href={viewing.url} target='_blank' rel='noreferrer'
                  style={{ ...PS.btnPrimary, textDecoration: 'none' }}>
                  Open in new tab ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberDocuments({ me }) {
  const [docs, setDocs] = useState(null);
  const [err, setErr]   = useState("");
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    listDocuments().then(setDocs).catch(e => setErr(e.message));
  }, []);

  const filtered = (docs || []).filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.notes || '').toLowerCase().includes(search.toLowerCase())
  );
  const grouped = {};
  filtered.forEach(d => {
    const cat = d.category || 'General';
    (grouped[cat] = grouped[cat] || []).push(d);
  });

  return (
    <div>
      <PageTitle sub="Association documents available to members">Documents</PageTitle>
      <Card style={{ marginBottom: 18, borderColor: POA.accentDim }}>
        <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65 }}>
          Your association's official documents — CBA, bylaws, benefits, and more. These documents also power <b style={{ color: POA.accent }}>Ask B4C</b> so you can ask questions and get answers straight from the source.
        </div>
      </Card>
      <ErrBox msg={err} />
      {docs && docs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder='Search documents…' style={{ ...PS.input }} />
        </div>
      )}
      {!docs ? <Spinner /> : docs.length === 0 ? (
        <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No documents have been shared with members yet. Check back soon.</div></Card>
      ) : (
        Object.entries(grouped).map(([cat, catDocs]) => (
          <div key={cat} style={{ marginBottom: 8 }}>
            <SectionTitle>{cat}</SectionTitle>
            {catDocs.map(doc => (
              <Card key={doc.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: POA.textPrimary, marginBottom: 3 }}>{doc.name}</div>
                    {doc.notes && <div style={{ fontSize: 12, color: POA.textMuted, fontStyle: "italic" }}>{doc.notes}</div>}
                  </div>
                  {doc.storage_path && (
                    <button style={{ ...PS.btnPrimary, fontSize: 13, padding: "8px 14px", flexShrink: 0 }}
                      onClick={async () => {
                        try {
                          const url = await getDocumentUrl(doc.storage_path);
                          setViewing({ doc, url });
                        } catch(e) { setErr('Could not open document.'); }
                      }}>
                      Open
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ))
      )}
      {search && filtered.length === 0 && (
        <Card>
          <div style={{ color: POA.textMuted, fontSize: 13.5 }}>
            No documents match '{search}'. Try a different search term.
          </div>
        </Card>
      )}
      {viewing && (
        <div onClick={() => setViewing(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px 16px', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'linear-gradient(135deg, #0E1630, #0A1020)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 16, maxWidth: 860, width: '100%', padding: '16px 18px', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: POA.accent, marginBottom: 2 }}>Document</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: POA.textPrimary }}>{viewing.doc.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={viewing.url} target='_blank' rel='noreferrer'
                  style={{ ...PS.btn, fontSize: 12, textDecoration: 'none' }}>
                  Open in new tab ↗
                </a>
                <button style={{ ...PS.btn, padding: '6px 10px' }} onClick={() => setViewing(null)}>
                  <X size={14} />
                </button>
              </div>
            </div>
            {viewing.doc.mime_type === 'application/pdf' || viewing.doc.file_name?.endsWith('.pdf') ? (
              <iframe src={viewing.url} style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 8, background: '#fff' }} title={viewing.doc.name} />
            ) : viewing.doc.extracted_text ? (
              <div style={{ background: 'rgba(0,0,0,.3)', border: `0.5px solid ${POA.hairline}`, borderRadius: 10, padding: '16px 18px', maxHeight: '75vh', overflowY: 'auto', fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {viewing.doc.extracted_text}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 13.5, color: POA.textMuted, marginBottom: 14 }}>
                  This file type can't be previewed in-app.
                </div>
                <a href={viewing.url} target='_blank' rel='noreferrer'
                  style={{ ...PS.btnPrimary, textDecoration: 'none' }}>
                  Open in new tab ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const ALL_VIEWS = [
  // member views
  'm_dash','m_videos','m_call','m_ask','m_partners','m_community',
  'm_benefits','m_events','m_card','m_vote','m_store','m_booking','m_correspondence','m_documents',
  // board views
  'b_dash','b_profile','b_attendance','b_meetings','b_stipend','b_causes',
  'b_fundraising','b_social','b_building','b_continuity',
  'b_correspondence','b_community','b_members','b_ledger','b_documents','b_settings',
  // pa views
  'pa_dash','pa_orgs','pa_config','pa_add',
];

function OrgSettingsField({ label, k, placeholder, type = "text", value, onChange, isAdmin }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>{label}</div>
      {isAdmin ? (
        <input type={type} value={value || ""} placeholder={placeholder}
          onChange={e => onChange(k, e.target.value)}
          style={PS.input} />
      ) : (
        <div style={{ fontSize: 13.5, color: POA.textPrimary, padding: '9px 12px', background: 'rgba(0,0,0,.2)', borderRadius: 8, border: `0.5px solid ${POA.hairline}` }}>
          {value || <span style={{ color: POA.textMuted, fontStyle: 'italic' }}>Not set</span>}
        </div>
      )}
    </div>
  );
}

function OrgSettings({ me, org }) {
  const isAdmin = canAdmin(me.access);
  const [tab, setTab] = useState(isAdmin ? "identity" : "brand");
  const [settings, setSettings] = useState({
    building_name: "",
    org_short_name: "",
    org_type_label: "",
    org_address: "",
    org_phone: "",
    org_website: "",
    org_founded: "",
    org_logo_url: "",
    org_primary_color: "#DBA525",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview]     = useState(null);

  useEffect(() => {
    supabase.from("org_settings")
      .select("*")
      .eq("department_id", me.department_id)
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach(r => { map[r.key] = r.value; });
        setSettings(prev => ({ ...prev, ...map }));
      });
  }, [me.department_id]);

  async function saveSetting(key, value) {
    const { error } = await supabase.from("org_settings")
      .upsert({ department_id: me.department_id, key, value },
        { onConflict: "department_id,key" });
    if (error) throw error;
  }

  async function uploadLogo(file) {
    if (!file) return;
    setLogoUploading(true); setErr("");
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/${me.department_id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('org-assets')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('org-assets').getPublicUrl(path);
      const url = data.publicUrl;
      await saveSetting('org_logo_url', url);
      setSettings(prev => ({ ...prev, org_logo_url: url }));
      setLogoPreview(url);
    } catch(e) { setErr(e.message); }
    finally { setLogoUploading(false); }
  }

  async function doSave() {
    setBusy(true); setErr(""); setSaved(false);
    try {
      await Promise.all(
        Object.entries(settings)
          .filter(([, v]) => v !== "")
          .map(([k, v]) => saveSetting(k, v))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const TABS = [
    ...(isAdmin ? [{ id: "identity", label: "Org Identity" }] : []),
    { id: "brand", label: "Brand Standards" },
    { id: "support", label: "Support & Privacy" },
  ];

  const onFieldChange = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  return (
    <div>
      <PageTitle sub="Organization settings, brand standards, and support">Settings</PageTitle>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#06090A" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}`, fontWeight: tab === t.id ? 700 : 500 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ORG IDENTITY (DeptAdmin only) ── */}
      {tab === "identity" && isAdmin && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Association identity</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <OrgSettingsField label="Full association name" k="org_name" placeholder="Fort Worth Police Officers Association" value={settings.org_name || org?.name || ""} onChange={onFieldChange} isAdmin={isAdmin} />
                <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: -6, marginBottom: 12, fontStyle: "italic" }}>This updates the display name in B4C — your department record name is managed separately.</div>
              </div>
              <OrgSettingsField label="Short name / abbreviation" k="org_short_name" placeholder="FWPOA" value={settings.org_short_name} onChange={onFieldChange} isAdmin={isAdmin} />
              <OrgSettingsField label="Type label" k="org_type_label" placeholder="Association" value={settings.org_type_label} onChange={onFieldChange} isAdmin={isAdmin} />
              <div style={{ gridColumn: "1 / -1" }}>
                <OrgSettingsField label="Headquarters address" k="org_address" placeholder="123 Main St, Fort Worth, TX 76101" value={settings.org_address} onChange={onFieldChange} isAdmin={isAdmin} />
              </div>
              <OrgSettingsField label="Phone number" k="org_phone" placeholder="(817) 555-0100" type="tel" value={settings.org_phone} onChange={onFieldChange} isAdmin={isAdmin} />
              <OrgSettingsField label="Website" k="org_website" placeholder="https://fwpoa.org" type="url" value={settings.org_website} onChange={onFieldChange} isAdmin={isAdmin} />
              <OrgSettingsField label="Year founded" k="org_founded" placeholder="1968" value={settings.org_founded} onChange={onFieldChange} isAdmin={isAdmin} />
              <OrgSettingsField label="Building / space name" k="building_name" placeholder="POA Building" value={settings.building_name} onChange={onFieldChange} isAdmin={isAdmin} />
            </div>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Branding</SectionTitle>
            <div style={{ gridColumn: '1 / -1', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 8 }}>Association logo</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(219,165,37,.1)', border: `1px solid rgba(219,165,37,.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {(logoPreview || settings.org_logo_url) ? (
                    <img src={logoPreview || settings.org_logo_url} alt='logo'
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 700, color: POA.accent }}>
                      {(settings.org_short_name || settings.org_name || 'POA').slice(0,3).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ ...PS.btnPrimary, display: 'inline-flex', cursor: 'pointer', fontSize: 12 }}>
                    {logoUploading ? 'Uploading…' : <><Upload size={13} /> {(logoPreview || settings.org_logo_url) ? 'Replace logo' : 'Upload logo'}</>}
                    <input type='file' accept='image/*' style={{ display: 'none' }}
                      onChange={e => { if (e.target.files[0]) uploadLogo(e.target.files[0]); }} />
                  </label>
                  <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 6 }}>PNG or SVG recommended. Shows on membership cards and the board dashboard.</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Association color</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={settings.org_primary_color || "#DBA525"}
                  onChange={e => setSettings(s => ({ ...s, org_primary_color: e.target.value }))}
                  style={{ width: 44, height: 36, borderRadius: 7, border: `0.5px solid ${POA.hairline}`, background: "transparent", cursor: "pointer", padding: 2 }} />
                <input value={settings.org_primary_color || "#DBA525"}
                  onChange={e => setSettings(s => ({ ...s, org_primary_color: e.target.value }))}
                  style={{ ...PS.input, maxWidth: 120 }} placeholder="#DBA525" />
                <div style={{ fontSize: 12, color: POA.textMuted }}>Used for future per-org theming</div>
              </div>
            </div>
          </Card>

          <ErrBox msg={err} />
          {saved && (
            <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: POA.greenText, marginBottom: 12 }}>
              ✓ Settings saved.
            </div>
          )}
          <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={busy} onClick={doSave}>
            {busy ? "Saving…" : "Save settings"}
          </button>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic", textAlign: "center" }}>
            Changes apply immediately across the app for all members.
          </div>
        </div>
      )}

      {/* ── BRAND STANDARDS (all board) ── */}
      {tab === "brand" && (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Your association identity</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Full name", k: "org_name" },
                { label: "Short name", k: "org_short_name" },
                { label: "Type", k: "org_type_label" },
                { label: "Building", k: "building_name" },
                { label: "Address", k: "org_address" },
                { label: "Phone", k: "org_phone" },
                { label: "Website", k: "org_website" },
                { label: "Founded", k: "org_founded" },
              ].map(({ label, k }) => (
                <div key={k}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.textMuted, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13.5, color: POA.textPrimary }}>{(k === "org_name" ? (settings.org_name || org?.name) : settings[k]) || <span style={{ color: POA.textMuted, fontStyle: "italic" }}>Not set</span>}</div>
                </div>
              ))}
            </div>
          </Card>

          {settings.org_logo_url && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>Logo</SectionTitle>
              <img src={settings.org_logo_url} alt="Association logo"
                style={{ height: 80, objectFit: "contain", borderRadius: 8, background: "rgba(0,0,0,.3)", padding: 10 }}
                onError={e => { e.target.style.display = "none"; }} />
            </Card>
          )}

          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Brand color</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: settings.org_primary_color || "#DBA525", border: `0.5px solid ${POA.hairline}`, boxShadow: `0 0 16px ${settings.org_primary_color || "#DBA525"}40` }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: POA.textPrimary }}>{settings.org_primary_color || "#DBA525"}</div>
                <div style={{ fontSize: 12, color: POA.textMuted }}>Primary association color</div>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Brand guidelines</SectionTitle>
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7 }}>
              When representing the association publicly, always use the official name, logo, and color above. Do not modify the logo, use unofficial colors, or represent the association without board authorization. For media inquiries, direct to the association president.
            </div>
            {isAdmin && (
              <button style={{ ...PS.btn, marginTop: 12 }} onClick={() => setTab("identity")}>
                <Settings size={13} /> Edit settings
              </button>
            )}
          </Card>
        </div>
      )}

      {/* ── SUPPORT & PRIVACY (everyone) ── */}
      {tab === "support" && (
        <div>
          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Get support</SectionTitle>
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7, marginBottom: 14 }}>
              B4C is built and maintained by Big Bull Technology. If something isn't working or you need help, reach out directly.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href="mailto:support@b4thecall.com"
                style={{ ...PS.btnPrimary, textDecoration: "none", justifyContent: "center" }}>
                <Mail size={14} /> Email support
              </a>
            </div>
          </Card>

          <Card style={{ marginBottom: 12 }}>
            <SectionTitle>Legal & Trust Center</SectionTitle>
            <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
              B4C's full legal documentation, privacy policy, security practices, and responsible AI policy are published at the B4C Trust Center.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Terms of Service', url: 'https://www.b4thecall.com/legal/terms' },
                { label: 'Privacy Policy', url: 'https://www.b4thecall.com/legal/privacy' },
                { label: 'Responsible AI Policy', url: 'https://www.b4thecall.com/legal/responsible-ai' },
                { label: 'Security Overview', url: 'https://www.b4thecall.com/legal/security' },
                { label: 'Data Ownership', url: 'https://www.b4thecall.com/legal/data-ownership' },
                { label: 'Acceptable Use', url: 'https://www.b4thecall.com/legal/acceptable-use' },
              ].map(({ label, url }) => (
                <a key={label} href={url} target='_blank' rel='noreferrer'
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,.03)', border: `0.5px solid ${POA.hairline}`, borderRadius: 8, textDecoration: 'none', color: POA.textSecondary, fontSize: 13 }}>
                  <ExternalLink size={13} color={POA.accent} />
                  {label}
                </a>
              ))}
            </div>
            <a href='https://www.b4thecall.com/legal' target='_blank' rel='noreferrer'
              style={{ ...PS.btn, display: 'inline-flex', textDecoration: 'none', marginTop: 12, fontSize: 12 }}>
              View full Trust Center ↗
            </a>
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Privacy & data</SectionTitle>
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7 }}>
              B4C stores your association's data securely using Supabase, hosted in the United States. Member data is never sold, shared with advertisers, or used for any purpose other than powering your association's platform. Only your association's authorized administrators can access member records. You can request deletion of your data at any time by contacting support.
            </div>
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Terms of use</SectionTitle>
            <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7 }}>
              B4C is provided for use by authorized first responder associations and their members. By using this platform, you agree to use it only for lawful association business. Misuse, unauthorized access, or sharing of credentials is prohibited. Big Bull Technology reserves the right to suspend access for violations of these terms.
            </div>
          </Card>

          <div style={{ fontSize: 11.5, color: POA.textMuted, textAlign: "center", lineHeight: 1.6 }}>
            B4C · Before the Call · Built by Big Bull Technology<br />
            © {new Date().getFullYear()} Big Bull Technology. All rights reserved.
          </div>
        </div>
      )}
    </div>
  );
}

const KIND_META = {
  birthday:     { label: "Birthday",          emoji: "🎂", color: "#F0C84A" },
  retirement:   { label: "Retirement",         emoji: "🏅", color: "#DBA525" },
  promotion:    { label: "Promotion",          emoji: "⭐", color: "#46C793" },
  spotlight:    { label: "Officer Spotlight",  emoji: "🌟", color: "#57B6E0" },
  memorial:     { label: "In Memoriam",        emoji: "🕯️", color: "#9CA3AF" },
  new_hire:     { label: "Welcome",            emoji: "👋", color: "#46C793" },
  family:       { label: "Family News",        emoji: "❤️", color: "#EF6A64" },
  achievement:  { label: "Achievement",        emoji: "🏆", color: "#DBA525" },
  announcement: { label: "Announcement",       emoji: "📢", color: "#57B6E0" },
};

const REACTION_EMOJIS = ["❤️","👏","🎉","🙏"];

function CommunityPostCard({ post, me, onReact, reactions }) {
  const meta = KIND_META[post.kind] || KIND_META.announcement;
  const myReactions = reactions || {};
  const memberId = me.id;

  return (
    <div style={{ ...PS.card, marginBottom: 12, overflow: "visible" }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}18`, border: `1px solid ${meta.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {meta.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: meta.color }}>{meta.label}</span>
            {post.pinned && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: `${POA.accent}20`, color: POA.accent }}>PINNED</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, lineHeight: 1.3 }}>{post.title}</div>
          {post.members?.full_name && (
            <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
              {post.members.full_name}{post.members.badge ? ` · Badge ${post.members.badge}` : ""}
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: POA.textMuted, flexShrink: 0 }}>{fmtDate(post.created_at)}</div>
      </div>

      {post.body && (
        <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.7, marginBottom: 12, paddingLeft: 52 }}>
          {post.body}
        </div>
      )}

      {/* Reactions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 52 }}>
        {REACTION_EMOJIS.map(emoji => {
          const reacted = (myReactions[emoji] || []).includes(memberId);
          const count = (myReactions[emoji] || []).length;
          return (
            <button key={emoji} onClick={() => onReact(post.id, emoji)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, border: `1px solid ${reacted ? POA.accent : POA.hairline2}`, background: reacted ? POA.accentSoft : "rgba(255,255,255,.03)", cursor: "pointer", fontSize: 13, color: reacted ? POA.accent : POA.textMuted, fontWeight: reacted ? 700 : 400, transition: ".15s" }}>
              {emoji}{count > 0 && <span style={{ fontSize: 11 }}>{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Community({ me }) {
  const [posts, setPosts]       = useState(null);
  const [reactions, setReactions] = useState({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);
  const [f, setF]               = useState({ kind: "achievement", title: "", body: "" });

  async function load() {
    const p = await listCommunityPosts();
    setPosts(p);
    if (p.length > 0) {
      const r = await getReactions(p.map(x => x.id));
      setReactions(r);
    }
  }
  useEffect(() => { load(); }, []);

  async function doReact(postId, emoji) {
    await toggleReaction(postId, emoji);
    const r = await getReactions(posts.map(x => x.id));
    setReactions(r);
  }

  async function doSubmit() {
    if (!f.title.trim()) { setErr("Title is required."); return; }
    setBusy(true); setErr("");
    try {
      await createCommunityPost({
        department_id: me.department_id,
        kind: f.kind,
        title: f.title.trim(),
        body: f.body.trim() || null,
        posted_by: me.id,
        status: "pending",
      });
      setSubmitted(true);
      setShowSubmit(false);
      setF({ kind: "achievement", title: "", body: "" });
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Community</p>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            Your Association Family
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            Birthdays, milestones, spotlights, and the moments that matter.
          </div>
        </div>
        <button style={PS.btn} onClick={() => { setShowSubmit(!showSubmit); setSubmitted(false); }}>
          <Plus size={13} /> Share a milestone
        </button>
      </div>

      {submitted && (
        <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: POA.greenText, marginBottom: 16 }}>
          ✓ Submitted! Your board will review and post it shortly.
        </div>
      )}

      {showSubmit && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>Share a milestone</SectionTitle>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Type</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {Object.entries(KIND_META).map(([k, v]) => (
                <button key={k} onClick={() => setF(x => ({ ...x, kind: k }))}
                  style={{ padding: "5px 11px", borderRadius: 999, border: `1px solid ${f.kind === k ? v.color : POA.hairline}`, background: f.kind === k ? `${v.color}15` : "transparent", color: f.kind === k ? v.color : POA.textMuted, fontSize: 12, fontWeight: f.kind === k ? 700 : 400, cursor: "pointer" }}>
                  {v.emoji} {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Headline</div>
            <input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))}
              style={PS.input} placeholder={
                f.kind === "birthday" ? "e.g. Happy birthday, Officer Martinez!" :
                f.kind === "promotion" ? "e.g. Congratulations, Sergeant Chen!" :
                f.kind === "retirement" ? "e.g. Celebrating 28 years of service — Officer Davis" :
                "What's the milestone?"
              } />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Message (optional)</div>
            <textarea value={f.body} onChange={e => setF(x => ({ ...x, body: e.target.value }))}
              style={{ ...PS.textarea, minHeight: 80 }} placeholder="Add a few words to celebrate them…" />
          </div>
          <ErrBox msg={err} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doSubmit}>
              {busy ? "Submitting…" : "Submit for board review"}
            </button>
            <button style={PS.btn} onClick={() => setShowSubmit(false)}>Cancel</button>
          </div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
            Your board reviews submissions before they post. Usually quick!
          </div>
        </Card>
      )}

      {!posts ? <Spinner /> : posts.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🌟</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 6 }}>Nothing posted yet</div>
            <div style={{ fontSize: 13, color: POA.textMuted }}>Your board will post birthdays, milestones, and spotlights here. You can also submit your own!</div>
          </div>
        </Card>
      ) : posts.map(post => (
        <CommunityPostCard key={post.id} post={post} me={me}
          onReact={doReact} reactions={reactions[post.id]} />
      ))}
    </div>
  );
}

function BoardCommunity({ me }) {
  const [posts, setPosts]         = useState(null);
  const [pending, setPending]     = useState([]);
  const [members, setMembers]     = useState([]);
  const [tab, setTab]             = useState("feed");
  const [showAdd, setShowAdd]     = useState(false);
  const [err, setErr]             = useState("");
  const [busy, setBusy]           = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [f, setF]                 = useState({
    kind: "birthday", title: "", body: "", member_id: "", pinned: false,
  });

  async function load() {
    const [p, pend, mem] = await Promise.all([
      listCommunityPosts(), listPendingPosts(), listMembers()
    ]);
    setPosts(p); setPending(pend); setMembers(mem);
  }
  useEffect(() => { load(); }, []);

  async function draftWithAI() {
    if (!f.kind || !f.title.trim()) { setErr("Add a headline first so AI has something to work with."); return; }
    setAiLoading(true); setErr("");
    try {
      const member = members.find(m => m.id === f.member_id);
      const prompt = `Write a warm, brief community post for a police officers' association. Type: ${KIND_META[f.kind]?.label}. Headline: "${f.title}"${member ? `. Officer: ${member.full_name}` : ""}. Keep it genuine, celebratory, and under 60 words. Just the post body, no headline.`;
      const body = await callClaudeAI("You write warm community posts for police officers' associations. Be genuine, brief, and celebratory. Return only the post body text.", prompt);
      setF(x => ({ ...x, body }));
    } catch(e) { setErr("AI draft failed — check ANTHROPIC_API_KEY."); }
    finally { setAiLoading(false); }
  }

  async function doPost() {
    if (!f.title.trim()) { setErr("Headline is required."); return; }
    setBusy(true); setErr("");
    try {
      const member = members.find(m => m.id === f.member_id);
      await createCommunityPost({
        department_id: me.department_id,
        kind: f.kind,
        title: f.title.trim(),
        body: f.body.trim() || null,
        member_id: f.member_id || null,
        posted_by: me.id,
        status: "active",
        pinned: f.pinned,
      });
      await logActivity(me.department_id, "community",
        `${KIND_META[f.kind]?.emoji} ${f.title.trim()}`, "m_community");
      setF({ kind: "birthday", title: "", body: "", member_id: "", pinned: false });
      setShowAdd(false);
      await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doApprove(id) {
    try { await approveCommunityPost(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  async function doArchive(id) {
    if (!confirm("Archive this post?")) return;
    try { await archiveCommunityPost(id); await load(); }
    catch(e) { setErr(e.message); }
  }

  const TABS = [
    { id: "feed", label: `Feed${posts ? ` (${posts.length})` : ""}` },
    { id: "pending", label: `Pending${pending.length ? ` (${pending.length})` : ""}` },
    { id: "post", label: "New Post" },
  ];

  return (
    <div>
      <PageTitle sub="Community posts, milestones, and member spotlights">Community</PageTitle>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setErr(""); }}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#06090A" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}`, fontWeight: tab === t.id ? 700 : 500 }}>
            {t.label}
          </button>
        ))}
      </div>
      <ErrBox msg={err} />

      {/* FEED */}
      {tab === "feed" && (
        <div>
          {!posts ? <Spinner /> : posts.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No posts yet. Create your first one in New Post.</div></Card>
          ) : posts.map(post => (
            <div key={post.id} style={{ position: "relative" }}>
              <Card style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{KIND_META[post.kind]?.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: KIND_META[post.kind]?.color, marginBottom: 2 }}>{KIND_META[post.kind]?.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: POA.textPrimary }}>{post.title}</div>
                    {post.members?.full_name && <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 1 }}>{post.members.full_name}</div>}
                    {post.body && <div style={{ fontSize: 13, color: POA.textSecondary, marginTop: 6, lineHeight: 1.6 }}>{post.body}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, alignItems: "flex-end" }}>
                    <div style={{ fontSize: 11, color: POA.textMuted }}>{fmtDate(post.created_at)}</div>
                    {post.pinned && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>PINNED</span>}
                    <button style={{ ...PS.btn, fontSize: 11, padding: "3px 8px", color: POA.red }}
                      onClick={() => doArchive(post.id)}>Archive</button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* PENDING */}
      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No pending submissions.</div></Card>
          ) : pending.map(post => (
            <Card key={post.id} style={{ marginBottom: 10, borderLeft: `3px solid ${POA.amber}`, borderRadius: "0 13px 13px 0" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>{KIND_META[post.kind]?.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: POA.amber, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 2 }}>{KIND_META[post.kind]?.label} · Pending review</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{post.title}</div>
                  {post.body && <div style={{ fontSize: 13, color: POA.textSecondary, marginTop: 4, lineHeight: 1.6 }}>{post.body}</div>}
                  <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4 }}>Submitted by {post.poster?.full_name || "Member"} · {fmtDate(post.created_at)}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button style={{ ...PS.btnPrimary, fontSize: 12, padding: "6px 12px" }} onClick={() => doApprove(post.id)}>
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button style={{ ...PS.btn, fontSize: 12, color: POA.red }} onClick={() => doArchive(post.id)}>
                    Decline
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* NEW POST */}
      {tab === "post" && (
        <Card>
          <SectionTitle>New community post</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {Object.entries(KIND_META).map(([k, v]) => (
              <button key={k} onClick={() => setF(x => ({ ...x, kind: k }))}
                style={{ padding: "5px 11px", borderRadius: 999, border: `1px solid ${f.kind === k ? v.color : POA.hairline}`, background: f.kind === k ? `${v.color}15` : "transparent", color: f.kind === k ? v.color : POA.textMuted, fontSize: 12, fontWeight: f.kind === k ? 700 : 400, cursor: "pointer" }}>
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Tag a member (optional)</div>
            <select value={f.member_id} onChange={e => {
              const m = members.find(x => x.id === e.target.value);
              setF(x => ({ ...x, member_id: e.target.value, title: m && !x.title ? `${KIND_META[x.kind]?.label} — ${m.full_name}` : x.title }));
            }} style={PS.input}>
              <option value="">— No specific member —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.badge ? ` · ${m.badge}` : ""}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Headline</div>
            <input value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))}
              style={PS.input} placeholder="e.g. Happy birthday, Officer Martinez! 🎂" />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Message</div>
            <textarea value={f.body} onChange={e => setF(x => ({ ...x, body: e.target.value }))}
              style={{ ...PS.textarea, minHeight: 90 }} placeholder="Add a personal message…" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <input type="checkbox" id="pinned" checked={f.pinned}
              onChange={e => setF(x => ({ ...x, pinned: e.target.checked }))}
              style={{ width: 16, height: 16, cursor: "pointer" }} />
            <label htmlFor="pinned" style={{ fontSize: 13, color: POA.textSecondary, cursor: "pointer" }}>
              Pin to top of Community feed
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doPost}>
              {busy ? "Posting…" : "Post to community"}
            </button>
            <button style={{ ...PS.btn, opacity: aiLoading ? 0.7 : 1 }} disabled={aiLoading} onClick={draftWithAI}>
              <Sparkles size={13} /> {aiLoading ? "Writing…" : "Draft with AI"}
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
            Posts go live immediately. Members can react with emoji.
          </div>
        </Card>
      )}
    </div>
  );
}

function EventSpaceBooking({ me }) {
  const today = new Date();
  const [cur, setCur]         = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [bookings, setBookings] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bf, setBf]             = useState({ title: "", booking_date: "", start_time: "", end_time: "", notes: "" });

  async function load() {
    try {
      const { data, error } = await supabase
        .from("space_bookings")
        .select("booking_date, start_time, end_time, status")
        .eq("department_id", me.department_id)
        .neq("status", "cancelled")
        .gte("booking_date", `${cur.y}-${String(cur.m + 1).padStart(2,"0")}-01`)
        .lte("booking_date", `${cur.y}-${String(cur.m + 1).padStart(2,"0")}-31`);
      if (error) throw error;
      setBookings(data || []);
    } catch(e) { setErr(e.message); }
  }

  useEffect(() => { load(); }, [cur.y, cur.m]);

  async function doRequest() {
    if (!bf.title.trim() || !bf.booking_date) { setErr("Date and purpose are required."); return; }
    setBusy(true); setErr("");
    try {
      await createSpaceBooking({
        department_id: me.department_id,
        title: bf.title.trim(),
        booked_by: me.id,
        booking_date: bf.booking_date,
        start_time: bf.start_time || null,
        end_time: bf.end_time || null,
        notes: bf.notes.trim() || null,
        status: "pending",
      });
      setSubmitted(true);
      setShowForm(false);
      setBf({ title: "", booking_date: "", start_time: "", end_time: "", notes: "" });
      await load();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  // Build calendar
  const dim      = new Date(cur.y, cur.m + 1, 0).getDate();
  const startDow = new Date(cur.y, cur.m, 1).getDay();
  const cells    = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  // Map booked dates
  const bookedDates = new Set();
  const pendingDates = new Set();
  (bookings || []).forEach(b => {
    const d = new Date(b.booking_date + "T12:00:00").getDate();
    if (b.status === "confirmed") bookedDates.add(d);
    else if (b.status === "pending") pendingDates.add(d);
  });

  const isToday = d => d && cur.y === today.getFullYear() && cur.m === today.getMonth() && d === today.getDate();
  const isPast  = d => {
    const date = new Date(cur.y, cur.m, d);
    return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Event Space</p>
          <h1 style={{ fontFamily: "inherit", fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            Book the Space
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            Check availability and request a booking — board approves within 24 hours.
          </div>
        </div>
        <button style={PS.btnPrimary} onClick={() => { setShowForm(v => !v); setSubmitted(false); }}>
          <Plus size={13} /> Request booking
        </button>
      </div>

      <ErrBox msg={err} />

      {/* Success message */}
      {submitted && (
        <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: POA.greenText, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={POA.green} />
          Request submitted — your board will confirm within 24 hours.
        </div>
      )}

      {/* Booking request form */}
      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <SectionTitle>Request a booking</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>What's it for?</div>
              <input value={bf.title} onChange={e => setBf({ ...bf, title: e.target.value })}
                style={PS.input} placeholder="e.g. District 4 meeting, training session, family event" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
              <input type="date" value={bf.booking_date}
                min={today.toISOString().split("T")[0]}
                onChange={e => setBf({ ...bf, booking_date: e.target.value })}
                style={PS.input} />
            </div>
            <div></div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Start time (optional)</div>
              <input type="time" value={bf.start_time} onChange={e => setBf({ ...bf, start_time: e.target.value })}
                style={PS.input} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>End time (optional)</div>
              <input type="time" value={bf.end_time} onChange={e => setBf({ ...bf, end_time: e.target.value })}
                style={PS.input} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Notes (optional)</div>
              <textarea value={bf.notes} onChange={e => setBf({ ...bf, notes: e.target.value })}
                style={{ ...PS.textarea, minHeight: 70 }}
                placeholder="Setup needs, number of people, equipment required…" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy || !bf.title.trim() || !bf.booking_date} onClick={doRequest}>
              {busy ? "Submitting…" : "Submit request"}
            </button>
            <button style={PS.btn} onClick={() => { setShowForm(false); setErr(""); }}>Cancel</button>
          </div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
            Your board reviews all requests. You'll hear back in Correspondence.
          </div>
        </Card>
      )}

      {/* Calendar */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={PS.btn} onClick={() => setCur(c => c.m === 0 ? { y: c.y-1, m: 11 } : { ...c, m: c.m-1 })}>‹</button>
            <div style={{ fontSize: 14, fontWeight: 700, color: POA.textPrimary, alignSelf: "center", minWidth: 120, textAlign: "center" }}>
              {MONTHS[cur.m]} {cur.y}
            </div>
            <button style={PS.btn} onClick={() => setCur(c => c.m === 11 ? { y: c.y+1, m: 0 } : { ...c, m: c.m+1 })}>›</button>
          </div>
          <button style={PS.btn} onClick={() => setCur({ y: today.getFullYear(), m: today.getMonth() })}>Today</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
          {DOW.map(d => <div key={d} style={{ fontSize: 9, fontWeight: 700, textAlign: "center", color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".06em", padding: "2px 0" }}>{d}</div>)}
        </div>

        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <div key={w} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
            {cells.slice(w*7, w*7+7).map((d, i) => {
              const booked  = d && bookedDates.has(d);
              const pending = d && pendingDates.has(d);
              const past    = d && isPast(d);
              const tod     = isToday(d);

              let bg = "transparent";
              let border = `0.5px solid ${POA.hairline}`;
              let textColor = past ? "rgba(255,255,255,.2)" : POA.textMuted;

              if (booked)  { bg = "rgba(239,106,100,.15)"; border = "0.5px solid rgba(239,106,100,.4)"; textColor = "#EF6A64"; }
              if (pending) { bg = "rgba(219,165,37,.1)";   border = `0.5px solid rgba(219,165,37,.3)`;  textColor = POA.accent; }
              if (tod)     { bg = "linear-gradient(135deg, rgba(219,165,37,.2), rgba(219,165,37,.08))"; border = `0.5px solid rgba(219,165,37,.5)`; textColor = POA.accent; }

              return (
                <div key={i} onClick={() => d && !past && setBf(prev => ({ ...prev, booking_date: `${cur.y}-${String(cur.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` }))}
                  style={{ height: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 8, background: bg, border, cursor: d && !past && !booked ? "pointer" : "default", transition: ".1s", gap: 2 }}>
                  {d && (
                    <>
                      <div style={{ fontSize: 12, fontWeight: tod || booked ? 700 : 400, color: textColor }}>{d}</div>
                      {booked  && <div style={{ fontSize: 8, fontWeight: 700, color: "#EF6A64", letterSpacing: ".04em" }}>BOOKED</div>}
                      {pending && <div style={{ fontSize: 8, fontWeight: 700, color: POA.accent, letterSpacing: ".04em" }}>PENDING</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${POA.hairline}`, flexWrap: "wrap" }}>
          {[
            { color: "rgba(239,106,100,.5)", label: "Unavailable" },
            { color: "rgba(219,165,37,.4)",  label: "Pending approval" },
            { color: "rgba(219,165,37,.8)",  label: "Today" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: POA.textMuted }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </Card>

      <div style={{ fontSize: 12, color: POA.textMuted, fontStyle: "italic", textAlign: "center" }}>
        Tap any available date to pre-fill the request form. Red dates are unavailable — board sees booking details, members see availability only.
      </div>
    </div>
  );
}

/* ================================================================
   SCREEN ROUTER
   ================================================================ */
function MyProfile({ me }) {
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [err, setErr]           = useState('');
  const [actions, setActions]   = useState([]);
  const [requests, setRequests] = useState([]);
  const [responding, setResponding] = useState(null);
  const [replyText, setReplyText]   = useState('');
  const [replyBusy, setReplyBusy]   = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd]     = useState('');
  const [showAvail, setShowAvail]   = useState(false);
  const [f, setF] = useState({
    preferred_contact: me.preferred_contact || '',
    phone: me.phone || '',
    availability: me.availability_note ? (() => { try { return JSON.parse(me.availability_note); } catch { return { schedule: {}, blocked: [] }; } })() : { schedule: {}, blocked: [] },
  });

  useEffect(() => {
    // Load my open action items
    supabase.from('action_items')
      .select('*, members!action_items_owner_member_id_fkey(full_name)')
      .eq('department_id', me.department_id)
      .eq('owner_member_id', me.id)
      .eq('status', 'open')
      .order('due_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => setActions(data || []));

    // Load meeting requests addressed to me
    supabase.from('correspondence')
      .select('*, members!correspondence_member_id_fkey(full_name, phone)')
      .eq('department_id', me.department_id)
      .eq('kind', 'meeting_request')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRequests(data || []));
  }, [me.id]);

  async function saveProfile() {
    setSaving(true); setErr(''); setSaved(false);
    try {
      await supabase.from('members').update({
        availability_note: JSON.stringify(f.availability),
        preferred_contact: f.preferred_contact || null,
        phone: f.phone.trim() || null,
      }).eq('id', me.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function doRespond(req, status) {
    setReplyBusy(true);
    try {
      // Update the request status
      await supabase.from('correspondence').update({ status }).eq('id', req.id);
      // Send reply back to member
      const replyBody = status === 'confirmed'
        ? `Your meeting request has been accepted. ${replyText ? replyText : 'I\'ll be in touch to confirm the details.'}`
        : status === 'proposed'
        ? replyText || 'That time doesn\'t work for me — let me suggest an alternative.'
        : replyText || 'I\'m unable to meet at this time. Please reach out again if you need assistance.';
      await supabase.from('correspondence').insert({
        department_id: me.department_id,
        member_id: req.member_id,
        kind: 'reply',
        subject: `Re: ${req.subject}`,
        body: replyBody,
        thread_id: req.id,
        replied_by: me.id,
      });
      setResponding(null); setReplyText('');
      // Reload requests
      const { data } = await supabase.from('correspondence')
        .select('*, members!correspondence_member_id_fkey(full_name, phone)')
        .eq('department_id', me.department_id)
        .eq('kind', 'meeting_request')
        .order('created_at', { ascending: false });
      setRequests(data || []);
    } catch(e) { setErr(e.message); }
    finally { setReplyBusy(false); }
  }

  function formatAvailability(avail) {
    if (!avail?.schedule) return null;
    const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const fmt = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr-12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`; };
    const parts = DAYS.filter(d => avail.schedule[d]?.enabled)
      .map(d => { const slots = avail.schedule[d].slots || [{ start: avail.schedule[d].start, end: avail.schedule[d].end }]; return `${d} ${slots.map(s => `${fmt(s.start)}–${fmt(s.end)}`).join(', ')}`; });
    return parts.length > 0 ? parts.join(', ') : null;
  }

  const pendingRequests = requests.filter(r => !r.status || r.status === 'pending');
  const handledRequests = requests.filter(r => r.status && r.status !== 'pending');
  const today = new Date();
  const isOverdue = d => d && new Date(d) < today;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ ...PS.kicker, marginBottom: 4 }}>My Profile</p>
          <h1 style={{ fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: 0 }}>
            {me.full_name}
          </h1>
          <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 4 }}>
            {(me.access || []).filter(r => r !== 'Member' && r !== 'ProjectAdmin').join(' · ')}
            {me.badge ? ` · Badge ${me.badge}` : ''}
          </div>
        </div>
      </div>

      <ErrBox msg={err} />
      {saved && (
        <div style={{ background: 'rgba(70,199,147,.1)', border: '0.5px solid rgba(70,199,147,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: POA.greenText, marginBottom: 14 }}>
          ✓ Profile saved.
        </div>
      )}

      <Card style={{ marginBottom: 14 }}>
        <p style={{ ...PS.kicker, margin: '0 0 12px' }}>My availability</p>
        <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 12 }}>
          Members see these times when they request a meeting with you.
        </div>

        {/* Always visible — week preview */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 8 }}>Preview — this week</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {(() => {
              const today = new Date();
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
              const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
              const fmt = t => { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); return `${hr > 12 ? hr-12 : hr || 12}:${m}${hr >= 12 ? 'pm' : 'am'}`; };
              return DAYS.map((day, i) => {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const dayData = f.availability.schedule[day] || { enabled: false, slots: [] };
                const isBlocked = (f.availability.blocked || []).some(entry => {
                  if (entry.includes('/')) {
                    const [s, e] = entry.split('/');
                    return dateStr >= s && dateStr <= e;
                  }
                  return entry === dateStr;
                });
                const isToday = dateStr === today.toISOString().split('T')[0];
                return (
                  <div key={day} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? POA.accent : POA.textMuted, marginBottom: 4 }}>{day}</div>
                    <div style={{ fontSize: 11, color: isToday ? POA.accent : POA.textMuted, marginBottom: 6 }}>{date.getDate()}</div>
                    <div style={{ minHeight: 60, borderRadius: 6, border: `0.5px solid ${isBlocked ? 'rgba(239,106,100,.4)' : dayData.enabled ? 'rgba(219,165,37,.3)' : POA.hairline}`, background: isBlocked ? 'rgba(239,106,100,.1)' : dayData.enabled ? 'rgba(219,165,37,.08)' : 'transparent', padding: '4px 3px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {isBlocked ? (
                        <div style={{ fontSize: 9, color: POA.red, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>Blocked</div>
                      ) : dayData.enabled && (dayData.slots || []).map((slot, si) => (
                        <div key={si} style={{ background: 'rgba(219,165,37,.2)', border: '0.5px solid rgba(219,165,37,.4)', borderRadius: 3, padding: '2px 3px', fontSize: 8.5, color: POA.accent, fontWeight: 600, lineHeight: 1.3 }}>
                          {fmt(slot.start)}–{fmt(slot.end)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: POA.textMuted }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(219,165,37,.2)', border: '0.5px solid rgba(219,165,37,.4)' }} />
              Available
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: POA.textMuted }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239,106,100,.1)', border: '0.5px solid rgba(239,106,100,.4)' }} />
              Blocked
            </div>
          </div>
        </div>

        {/* Collapsible — schedule editor */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: '12px 0 0' }}
          onClick={() => setShowAvail(v => !v)}>
          <p style={{ ...PS.kicker, margin: 0 }}>Edit schedule</p>
          {showAvail ? <ChevronUp size={15} color={POA.textMuted} /> : <ChevronDown size={15} color={POA.textMuted} />}
        </div>

        {showAvail && (<>
        {/* Weekly schedule */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 8 }}>Weekly availability</div>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
            const dayData = f.availability.schedule[day] || { enabled: false, slots: [{ start: '09:00', end: '17:00' }] };
            const slots = dayData.slots || [{ start: dayData.start || '09:00', end: dayData.end || '17:00' }];
            return (
              <div key={day} style={{ marginBottom: 8, padding: '10px 12px', background: dayData.enabled ? 'rgba(219,165,37,.06)' : 'rgba(255,255,255,.02)', border: `0.5px solid ${dayData.enabled ? 'rgba(219,165,37,.25)' : POA.hairline}`, borderRadius: 8 }}>
                {/* Day header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: dayData.enabled ? 10 : 0 }}>
                  <div onClick={() => setF(x => {
                    const cur = x.availability.schedule[day] || { enabled: false, slots: [{ start: '09:00', end: '17:00' }] };
                    return { ...x, availability: { ...x.availability, schedule: { ...x.availability.schedule, [day]: { ...cur, enabled: !cur.enabled, slots: cur.slots || [{ start: '09:00', end: '17:00' }] } } } };
                  })} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${dayData.enabled ? POA.accent : POA.hairline2}`, background: dayData.enabled ? POA.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}>
                      {dayData.enabled && <CheckCircle2 size={12} color='#06090A' />}
                    </div>
                    <div style={{ width: 36, fontSize: 13, fontWeight: 700, color: dayData.enabled ? POA.textPrimary : POA.textMuted }}>{day}</div>
                  </div>
                  {!dayData.enabled && <div style={{ fontSize: 12, color: POA.textMuted, fontStyle: 'italic' }}>Unavailable</div>}
                  {dayData.enabled && (
                    <button onClick={() => setF(x => {
                      const cur = x.availability.schedule[day];
                      return { ...x, availability: { ...x.availability, schedule: { ...x.availability.schedule, [day]: { ...cur, slots: [...(cur.slots || []), { start: '09:00', end: '17:00' }] } } } };
                    })} style={{ ...PS.btn, fontSize: 11, padding: '3px 10px', marginLeft: 'auto' }}>
                      <Plus size={11} /> Add slot
                    </button>
                  )}
                </div>
                {/* Time slots */}
                {dayData.enabled && slots.map((slot, si) => (
                  <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: si < slots.length - 1 ? 6 : 0 }}>
                    <input type='time' value={slot.start}
                      onChange={e => setF(x => {
                        const cur = x.availability.schedule[day];
                        const newSlots = cur.slots.map((s, i) => i === si ? { ...s, start: e.target.value } : s);
                        return { ...x, availability: { ...x.availability, schedule: { ...x.availability.schedule, [day]: { ...cur, slots: newSlots } } } };
                      })}
                      style={{ ...PS.input, width: 120, fontSize: 13 }} />
                    <span style={{ fontSize: 12, color: POA.textMuted }}>to</span>
                    <input type='time' value={slot.end}
                      onChange={e => setF(x => {
                        const cur = x.availability.schedule[day];
                        const newSlots = cur.slots.map((s, i) => i === si ? { ...s, end: e.target.value } : s);
                        return { ...x, availability: { ...x.availability, schedule: { ...x.availability.schedule, [day]: { ...cur, slots: newSlots } } } };
                      })}
                      style={{ ...PS.input, width: 120, fontSize: 13 }} />
                    {slots.length > 1 && (
                      <button onClick={() => setF(x => {
                        const cur = x.availability.schedule[day];
                        return { ...x, availability: { ...x.availability, schedule: { ...x.availability.schedule, [day]: { ...cur, slots: cur.slots.filter((_, i) => i !== si) } } } };
                      })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: POA.textMuted, padding: '0 4px' }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Blocked dates */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 8 }}>Blocked dates</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {(f.availability.blocked || []).map((entry, i) => {
              const [start, end] = entry.includes('/') ? entry.split('/') : [entry, null];
              const fmtD = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const label = end ? `${fmtD(start)} – ${fmtD(end)}` : fmtD(start);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,106,100,.1)', border: '0.5px solid rgba(239,106,100,.3)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: POA.red }}>
                  {label}
                  <button onClick={() => setF(x => ({ ...x, availability: { ...x.availability, blocked: x.availability.blocked.filter((_, j) => j !== i) } }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: POA.red, fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 8, alignItems: 'center' }}>
            <input type='date' value={blockStart}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setBlockStart(e.target.value); if (blockEnd && e.target.value > blockEnd) setBlockEnd(''); }}
              style={{ ...PS.input, fontSize: 13 }} />
            <span style={{ fontSize: 12, color: POA.textMuted, textAlign: 'center' }}>to</span>
            <input type='date' value={blockEnd}
              min={blockStart || new Date().toISOString().split('T')[0]}
              onChange={e => setBlockEnd(e.target.value)}
              style={{ ...PS.input, fontSize: 13 }} />
            <button style={PS.btn} disabled={!blockStart}
              onClick={() => {
                const end = blockEnd || blockStart;
                const entry = blockStart === end ? blockStart : `${blockStart}/${end}`;
                if (!(f.availability.blocked || []).includes(entry)) {
                  setF(x => ({ ...x, availability: { ...x.availability, blocked: [...(x.availability.blocked || []), entry].sort() } }));
                }
                setBlockStart(''); setBlockEnd('');
              }}>
              <Plus size={13} /> Block
            </button>
          </div>
          <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4 }}>
            Pick one date or a start and end date to block a range.
          </div>
        </div>

        {/* Preferred contact */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Preferred contact</div>
            <select value={f.preferred_contact} onChange={e => setF(x => ({ ...x, preferred_contact: e.target.value }))} style={PS.input}>
              <option value=''>— No preference —</option>
              <option value='phone'>Phone call</option>
              <option value='text'>Text message</option>
              <option value='email'>Email</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Phone number</div>
            <input value={f.phone} onChange={e => setF(x => ({ ...x, phone: e.target.value }))}
              style={PS.input} placeholder='(817) 555-0100' type='tel' />
          </div>
        </div>

        <button style={PS.btnPrimary} disabled={saving} onClick={saveProfile}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        </>)}
      </Card>

      {/* Meeting requests */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ ...PS.kicker, margin: 0 }}>
          Meeting requests {pendingRequests.length > 0 && (
            <span style={{ background: POA.red, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, marginLeft: 6 }}>{pendingRequests.length}</span>
          )}
        </p>
      </div>

      {requests.length === 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ color: POA.textMuted, fontSize: 13.5 }}>No meeting requests yet.</div>
        </Card>
      ) : (
        <>
          {pendingRequests.map(req => (
            <Card key={req.id} style={{ marginBottom: 10, borderLeft: `3px solid ${POA.amber}`, borderRadius: '0 13px 13px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{req.members?.full_name || 'Member'}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                    {req.members?.phone && `${req.members.phone} · `}
                    {fmtDate(req.created_at)}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(240,180,74,.14)', color: POA.amber }}>Pending</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: POA.textPrimary, marginBottom: 4 }}>{req.subject}</div>
              {req.body && <div style={{ fontSize: 13, color: POA.textSecondary, lineHeight: 1.6, marginBottom: 12 }}>{req.body}</div>}

              {responding === req.id ? (
                <div>
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    style={{ ...PS.textarea, minHeight: 70, marginBottom: 8 }}
                    placeholder={
                      responding === req.id + '_propose'
                        ? 'Suggest an alternate time — e.g. "Friday after 6pm works for me, text me to confirm."'
                        : responding === req.id + '_decline'
                        ? 'Optional note — e.g. "Please reach out to the VP for this type of concern."'
                        : 'Optional message to send with your confirmation…'
                    } />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...PS.btnPrimary, fontSize: 12 }} disabled={replyBusy}
                      onClick={() => doRespond(req, responding.startsWith(req.id + '_propose') ? 'proposed' : responding.startsWith(req.id + '_decline') ? 'declined' : 'confirmed')}>
                      {replyBusy ? 'Sending…' : 'Send reply'}
                    </button>
                    <button style={{ ...PS.btn, fontSize: 12 }} onClick={() => { setResponding(null); setReplyText(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={{ ...PS.btnPrimary, fontSize: 12, background: 'rgba(70,199,147,.15)', color: POA.green, border: '0.5px solid rgba(70,199,147,.3)' }}
                    onClick={() => setResponding(req.id)}>
                    <CheckCircle2 size={12} /> Accept
                  </button>
                  <button style={{ ...PS.btn, fontSize: 12 }}
                    onClick={() => setResponding(req.id + '_propose')}>
                    <Clock size={12} /> Propose alternate time
                  </button>
                  <button style={{ ...PS.btn, fontSize: 12, color: POA.red }}
                    onClick={() => setResponding(req.id + '_decline')}>
                    Decline
                  </button>
                </div>
              )}
            </Card>
          ))}

          {handledRequests.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ ...PS.kicker, margin: '0 0 8px' }}>Handled</p>
              {handledRequests.map(req => (
                <div key={req.id} style={{ ...PS.card, padding: '11px 14px', marginBottom: 6, opacity: .65, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: POA.textPrimary }}>{req.subject}</div>
                    <div style={{ fontSize: 11, color: POA.textMuted }}>{req.members?.full_name} · {fmtDate(req.created_at)}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{req.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* My open action items */}
      <p style={{ ...PS.kicker, margin: '16px 0 8px' }}>My open action items ({actions.length})</p>
      {actions.length === 0 ? (
        <Card>
          <div style={{ color: POA.textMuted, fontSize: 13.5 }}>No open action items assigned to you.</div>
        </Card>
      ) : actions.map(a => (
        <div key={a.id} style={{ ...PS.card, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: POA.textPrimary }}>{a.title}</div>
            {a.due_date && (
              <div style={{ fontSize: 12, color: isOverdue(a.due_date) ? POA.red : POA.textMuted, marginTop: 3 }}>
                Due {fmtShort(a.due_date)}
              </div>
            )}
          </div>
          {isOverdue(a.due_date) && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(240,180,74,.14)', color: POA.amber, flexShrink: 0 }}>Overdue</span>
          )}
        </div>
      ))}
    </div>
  );
}

async function getVimeoThumb(url) {
  try {
    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&width=400`);
    const data = await res.json();
    return data.thumbnail_url || null;
  } catch { return null; }
}

function MemberVideos({ me, setView }) {
  const [videos, setVideos]   = useState(null);
  const [search, setSearch]   = useState('');
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    listVideos().then(async vids => {
      setVideos(vids);
      // Fetch thumbnails in background
      const withThumbs = await Promise.all(vids.map(async v => {
        if (v.thumbnail_url) return v;
        const thumb = await getVimeoThumb(v.vimeo_url);
        return { ...v, thumbnail_url: thumb };
      }));
      setVideos(withThumbs);
    }).catch(() => setVideos([]));
  }, []);

  const filtered = (videos || []).filter(v =>
    !search || v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.series_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  filtered.forEach(v => {
    const key = v.series_name || 'General';
    (grouped[key] = grouped[key] || []).push(v);
  });

  function vimeoEmbed(url) {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}?autoplay=1` : null;
  }

  return (
    <div>
      <button onClick={() => setView('m_dash')} style={{ ...PS.btn, marginBottom: 16 }}>
        <ArrowLeft size={13} /> Dashboard
      </button>
      <p style={{ ...PS.kicker, marginBottom: 4 }}>Video Hub</p>
      <h1 style={{ fontFamily: 'inherit', fontSize: 24, fontWeight: 700, color: POA.textPrimary, margin: '0 0 4px' }}>
        From your association
      </h1>
      <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 16 }}>
        Training videos, updates, and resources from your board.
      </div>

      {!videos ? <Spinner /> : (
        <>
          {videos.length > 0 && (
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder='Search videos…' style={{ ...PS.input, marginBottom: 16 }} />
          )}

          {filtered.length === 0 ? (
            <Card>
              <div style={{ color: POA.textMuted, fontSize: 13.5, textAlign: 'center', padding: '16px 0' }}>
                {search ? `No videos match '${search}'` : 'No videos yet. Check back soon.'}
              </div>
            </Card>
          ) : Object.entries(grouped).map(([series, seriesVideos]) => (
            <div key={series} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: POA.textMuted, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 1, width: 16, background: POA.accent, opacity: .4 }} />
                {series}
                <div style={{ height: 1, flex: 1, background: POA.hairline }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {seriesVideos.map(v => (
                  <div key={v.id} style={{ background: 'linear-gradient(160deg, #101828 0%, #0A1020 100%)', border: `0.5px solid ${POA.hairline2}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(0,0,0,.4)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                      onClick={() => setPlaying(playing === v.id ? null : v.id)}>
                      {playing === v.id && vimeoEmbed(v.vimeo_url) ? (
                        <iframe src={vimeoEmbed(v.vimeo_url)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow='autoplay; fullscreen' title={v.title} />
                      ) : (
                        <>
                          {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                          <div style={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', background: 'rgba(219,165,37,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 16px rgba(0,0,0,.5)' }}>
                            <Play size={20} color='#06090A' fill='#06090A' style={{ marginLeft: 3 }} />
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: POA.textPrimary, marginBottom: 2 }}>{v.title}</div>
                      {v.description && <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{v.description}</div>}
                      <button style={{ ...PS.btn, fontSize: 11, width: '100%', justifyContent: 'center' }}
                        onClick={() => window.open(v.vimeo_url, '_blank')}>
                        <Play size={11} /> Watch on Vimeo ↗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Video player modal */}
      {playing && (() => {
        const v = (videos || []).find(x => x.id === playing);
        const embedUrl = v ? vimeoEmbed(v.vimeo_url) : null;
        if (!embedUrl) return null;
        return (
          <div onClick={() => setPlaying(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 800 }}>
              <div style={{ aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden' }}>
                <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow='autoplay; fullscreen' title={v?.title} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: POA.textPrimary }}>{v?.title}</div>
                <button style={PS.btn} onClick={() => setPlaying(null)}><X size={14} /> Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function renderScreen(view, { me, org, setView, setViewAs }) {
  if (view.startsWith("m_")) {
    switch (view) {
      case "m_dash":     return <MemberDash me={me} org={org} setView={setView} />;
      case "m_videos":   return <MemberVideos me={me} setView={setView} />;
      case "m_call":     return <WhoToCall me={me} />;
      case "m_ask":      return <AskB4C me={me} org={org} />;
      case "m_card":     return <MyCard me={me} org={org} />;
      case "m_events":   return <MemberEvents me={me} setView={setView} />;
      case "m_partners": return <TrustedPartners />;
      case "m_community": return <Community me={me} />;
      case "m_benefits": return <Benefits me={me} setView={setView} />;
      case "m_vote":     return <VoteLink me={me} org={org} setView={setView} />;
      case "m_store":    return <Store me={me} />;
      case "m_booking":  return <EventSpaceBooking me={me} />;
      case "m_correspondence": return <MemberCorrespondence me={me} />;
      case "m_documents": return <MemberDocuments me={me} />;
      default:           return <ComingSoon label={view} />;
    }
  }
  switch (view) {
    case "b_dash":          return <BoardDash me={me} org={org} setView={setView} />;
    case "b_profile":       return <MyProfile me={me} />;
    case "b_meetings":      return <AgendaMinutes me={me} org={org} />;
    case "b_causes":        return <CausesBoard me={me} />;
    case "b_members":       return <MembersBoard me={me} />;
    case "b_documents":     return <BoardDocuments me={me} />;
    case "b_attendance":    return <MeetingAttendance me={me} />;
    case "b_stipend":       return <ComingSoon label="Stipend Log" />;
    case "b_fundraising":   return <Fundraising me={me} org={org} />;
    case "b_social":        return <SocialMedia me={me} org={org} />;
    case "b_building":      return <POABuilding me={me} org={org} />;
    case "b_continuity":    return <BoardContinuity me={me} org={org} />;
    case "b_correspondence":return <BoardCorrespondence me={me} />;
    case "b_community":     return <BoardCommunity me={me} />;
    case "b_ledger":        return <ValueLedger me={me} />;
    case "b_settings":      return <OrgSettings me={me} org={org} />;
    case "pa_dash":         return <PADash setView={setView} setViewAs={setViewAs} />;
    case "pa_orgs":         return <PADash />;
    case "pa_config":       return <PAOrgConfig />;
    case "pa_add":          return <PAAddOrg setView={setView} />;
    default:                return <ComingSoon label={view} />;
  }
}

/* ================================================================
   APP SHELL — sidebar layout (fire pattern)
   ================================================================ */
export default function App() {
  const [session, setSession]   = useState(null);
  const [ready, setReady]       = useState(false);
  const [me, setMe]             = useState(undefined);
  const [org, setOrg]           = useState(null);
  const [view, setViewRaw]      = useState(() => { try { return sessionStorage.getItem('b4c_last_view') || null; } catch { return null; } }); // null = role default; restored from sessionStorage
  function setView(v) {
    try { if (v) sessionStorage.setItem('b4c_last_view', v); else sessionStorage.removeItem('b4c_last_view'); } catch {}
    setViewRaw(v);
  }
  const [sideOpen, setSideOpen] = useState(false);
  const [viewAs, setViewAs]     = useState(null); // 'board' | 'member' — board users can preview the member view; null = role default
  const [features, setFeatures] = useState({});
  const [orgSettings, setOrgSettings] = useState({});
  const [showResetPw, setShowResetPw] = useState(
    () => new URLSearchParams(window.location.search).get("setpassword") === "true"
  );
  const [showAccountPw, setShowAccountPw] = useState(false);

  function clearSetPwParam() {
    const u = new URL(window.location.href);
    u.searchParams.delete("setpassword");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(undefined); return; }
    getMe().then(m => { setMe(m); }).catch(() => setMe(null)); // view is restored from sessionStorage + clamped below
  }, [session]);

  useEffect(() => {
    if (me?.id) {
      getMyOrg().then(setOrg).catch(() => null);
      getOrgFeatures().then(setFeatures).catch(() => null);
      getOrgSettings().then(setOrgSettings).catch(() => null);
    }
  }, [me]);

  const isPA = me ? hasAny(me.access, ["ProjectAdmin"]) : false;
  // which console to show — PA toggles pa/board/member; board users toggle board/member (viewAs); null = role default
  const curViewAs  = me ? (viewAs || (isPA ? "pa" : isBoard(me.access) ? "board" : "member")) : null;

  // build dynamic nav from org_features
  const filteredMemberNav = MEMBER_NAV.filter(n => features[n.id] !== false);
  const filteredBoardNav  = BOARD_NAV.filter(n => features[n.id] !== false);
  // PA + board modes get the board nav here; the PA_NAV section is rendered separately below the divider (PA mode only)
  const nav = !me ? [] : (curViewAs === "pa" || curViewAs === "board") ? filteredBoardNav : filteredMemberNav;

  // only mount screens the current user can actually reach (state-preserving keep-alive)
  const mountedViews = ALL_VIEWS.filter(viewId => {
    if (curViewAs === 'pa') return true; // PA mode sees everything (pa + board + shared)
    if (viewId.startsWith('pa_')) return false; // board/member modes never mount PA screens
    if (curViewAs === 'board') return viewId === 'm_vote' || !viewId.startsWith('m_'); // board view: board screens + shared VoteLink
    if (curViewAs === 'member') return !viewId.startsWith('b_'); // member view: member + no board
    return true;
  });

  // restored view (from sessionStorage) if the current user/mode can reach it, else the role/mode default
  const roleDefault = me ? (curViewAs === "pa" ? "pa_dash" : curViewAs === "board" ? "b_dash" : "m_dash") : null;
  const activeView  = (view && mountedViews.includes(view)) ? view : roleDefault;

  if (!ready) return <Loading />;
  if (!session) return <Login />;

  // Returning from a "set password" email link — let them set a password before entering the app.
  if (showResetPw) {
    let pending = "";
    try { pending = sessionStorage.getItem("b4c_pending_pw") || ""; } catch {}
    return (
      <PasswordSetModal
        title="Set your password"
        blurb="Choose a password for your account. You'll be able to sign in with it from now on."
        initialPw={pending}
        requireSet
        onSaved={() => { try { sessionStorage.removeItem("b4c_pending_pw"); } catch {} }}
        onClose={() => { setShowResetPw(false); clearSetPwParam(); }}
      />
    );
  }

  if (me === undefined) return <Loading />;
  if (me === null) return <NotOnRoster session={session} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "radial-gradient(ellipse 80% 60% at 50% -10%, #0D1830 0%, #04070F 60%)", fontFamily: "'Inter', system-ui, sans-serif", color: POA.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 0; }
        .nav-item:hover { background: rgba(219,165,37,.08) !important; }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .app-sidebar {
            position: fixed !important;
            left: -240px !important;
            top: 0 !important;
            height: 100vh !important;
            width: 240px !important;
            transition: left 0.25s ease !important;
            z-index: 100 !important;
            overflow-y: auto !important;
          }
          .app-sidebar.nav-open {
            left: 0 !important;
            box-shadow: 4px 0 24px rgba(0,0,0,.5) !important;
          }
          .nav-backdrop { display: block !important; }
          .app-main {
            margin-left: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            padding: 56px 14px 24px !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>

      <button
        onClick={() => setSideOpen(v => !v)}
        style={{ display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 200, background: POA.accent, color: '#06090A', border: 'none', borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,.4)' }}
        className='mobile-menu-btn'>
        {sideOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {sideOpen && (
        <div onClick={() => setSideOpen(false)}
          style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 99 }}
          className='nav-backdrop' />
      )}

      {/* ---- Sidebar ---- */}
      <aside className={`app-sidebar${sideOpen ? ' nav-open' : ''}`} style={{
        width: 220, flexShrink: 0,
        background: 'linear-gradient(180deg, #060B1A 0%, #030610 100%)',
        borderRight: '0.5px solid rgba(219,165,37,.12)',
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        zIndex: 100,
      }}>
        {/* Brand */}
        <div style={{ padding: "22px 18px 16px", borderBottom: '0.5px solid rgba(219,165,37,.10)', background: 'linear-gradient(180deg, rgba(219,165,37,.05) 0%, transparent 100%)', position: 'relative' }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '.06em', background: 'linear-gradient(135deg, #F0C84A 0%, #DBA525 50%, #A87A18 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1, marginBottom: 1, filter: 'drop-shadow(0 0 8px rgba(219,165,37,.3))' }}>B4C UNION</div>
          <div style={{ fontSize: 8, letterSpacing: '.2em', textTransform: 'uppercase', color: POA.textMuted, fontWeight: 600 }}>Before the Call</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: POA.textPrimary, marginTop: 8 }}>{org?.name || "POA"}</div>
          <div style={{ fontSize: 11, color: POA.textMuted }}>{orgSettings.org_short_name || ""}</div>
          <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 2 }}>{curViewAs === "pa" ? "PA Console" : curViewAs === "board" ? "Board Console" : "Member Hub"}</div>
        </div>

        {/* View-as toggle — board users preview member; PA switches pa/board/member */}
        {isBoard(me.access) && (
          <div style={{ padding: "12px 14px", borderBottom: `0.5px solid ${POA.hairline}`, display: "flex", gap: 6 }}>
            {(isPA
              ? [{ key: "member", label: "Member" }, { key: "board", label: "Board" }, { key: "pa", label: "PA" }]
              : [{ key: "member", label: "Member" }, { key: "board", label: "Board" }]
            ).map(opt => {
              const on = curViewAs === opt.key;
              return (
                <button key={opt.key}
                  onClick={() => { setViewAs(opt.key); setView(null); setSideOpen(false); }}
                  style={{ flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", borderRadius: 8, border: `0.5px solid ${on ? POA.accent : POA.btnBorder}`, background: on ? 'linear-gradient(135deg, rgba(219,165,37,.25), rgba(219,165,37,.10))' : "transparent", color: on ? POA.accent : POA.navLabel, boxShadow: on ? '0 1px 4px rgba(0,0,0,.4), inset 0 1px 0 rgba(219,165,37,.15)' : "none" }}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {nav.map(({ id, label, Icon }) => {
            const on = activeView === id;
            return (
              <button key={id} className="nav-item" onClick={() => { setView(id); setSideOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: on ? 600 : 400, color: on ? POA.accent : POA.navLabel, background: on ? 'linear-gradient(135deg, rgba(219,165,37,.18) 0%, rgba(219,165,37,.06) 100%)' : "transparent", marginBottom: 2, textAlign: "left", borderLeft: on ? '2px solid #DBA525' : "2px solid transparent", boxShadow: on ? 'inset 0 0 20px rgba(219,165,37,.05), 0 2px 8px rgba(0,0,0,.3)' : "none" }}>
                <Icon size={16} style={{ flexShrink: 0, opacity: on ? 1 : 0.7 }} />
                {label}
              </button>
            );
          })}
          {curViewAs === "pa" && (
            <>
              <div style={{ margin: "12px 0 6px", padding: "0 10px", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accentDim }}>
                Project Admin
              </div>
              {PA_NAV.map(({ id, label, Icon }) => {
                const on = activeView === id;
                return (
                  <button key={id} className="nav-item" onClick={() => { setView(id); setSideOpen(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: on ? 600 : 400, color: on ? POA.accent : POA.navLabel, background: on ? 'linear-gradient(135deg, rgba(219,165,37,.18) 0%, rgba(219,165,37,.06) 100%)' : "transparent", marginBottom: 2, textAlign: "left", borderLeft: on ? '2px solid #DBA525' : "2px solid transparent", boxShadow: on ? 'inset 0 0 20px rgba(219,165,37,.05), 0 2px 8px rgba(0,0,0,.3)' : "none" }}>
                    <Icon size={16} style={{ flexShrink: 0, opacity: on ? 1 : 0.7 }} />
                    {label}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User / sign-out */}
        <div style={{ padding: "12px 16px", borderTop: `0.5px solid ${POA.hairline}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: POA.textPrimary, marginBottom: 2 }}>{me.full_name}</div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginBottom: 10 }}>{(me.access || []).filter(r => r !== "Member").join(", ") || "Member"}</div>
          <button onClick={() => setShowAccountPw(true)}
            style={{ ...PS.btn, width: "100%", justifyContent: "center", marginBottom: 8 }}>
            <KeyRound size={13} /> Change password
          </button>
          <button onClick={() => supabase.auth.signOut()}
            style={{ ...PS.btn, width: "100%", justifyContent: "center" }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main className="app-main" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "32px 36px", maxWidth: 860, minWidth: 0, boxSizing: "border-box", background: 'radial-gradient(ellipse 60% 40% at 80% 0%, rgba(219,165,37,.04) 0%, transparent 60%)' }}>
        {mountedViews.map(viewId => (
          <div key={viewId} style={{ display: activeView === viewId ? "block" : "none" }}>
            {renderScreen(viewId, { me, org, setView, setViewAs })}
          </div>
        ))}
      </main>

      {showAccountPw && (
        <PasswordSetModal
          title="Change password"
          blurb="Set a new password for your account."
          onClose={() => setShowAccountPw(false)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}

/* ================================================================
   LOGIN
   ================================================================ */
function Login() {
  const [mode, setMode]   = useState("magic"); // magic | password | set
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [pw2, setPw2]     = useState("");
  const [sent, setSent]   = useState(false);
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);

  function switchMode(m) {
    setMode(m); setErr(""); setSent(false); setPw(""); setPw2("");
  }

  // ---- Magic link ----
  async function sendMagic() {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  // ---- Password sign-in ----
  async function signInPassword() {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr(error.message);
    // success → App's onAuthStateChange picks up the session
  }

  // ---- Set password (sends a reset email that lets them set one without being signed in) ----
  async function sendReset() {
    setErr("");
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2)    { setErr("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "?setpassword=true",
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    // stash the chosen password so the return modal can pre-fill it
    try { sessionStorage.setItem("b4c_pending_pw", pw); } catch {}
    setSent(true);
  }

  const TABS = [
    { key: "magic",    label: "Magic link" },
    { key: "password", label: "Password" },
    { key: "set",      label: "Set password" },
  ];

  const sentMsg =
    mode === "set"
      ? <>Check your email — click the link, and you'll be prompted to set your password on return. Sent to <strong>{email}</strong>.</>
      : <>Check your email — login link sent to <strong>{email}</strong>. Open it on this device.</>;

  return (
    <div style={{ minHeight: "100vh", background: POA.pageBg, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } body { margin: 0; }`}</style>
      <div style={{ background: POA.card, border: `0.5px solid ${POA.hairline}`, borderRadius: 18, padding: "36px 32px", width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: POA.accent, fontWeight: 700, marginBottom: 10 }}>Before the Call · POA</div>
        <h1 style={{ fontFamily: "inherit", fontSize: 26, fontWeight: 700, color: POA.textPrimary, margin: "0 0 8px" }}>Your association, in one place.</h1>
        <p style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.6, margin: "0 0 20px" }}>Sign in with your association email — magic link, password, or set one for the first time.</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {TABS.map(t => {
            const on = mode === t.key;
            return (
              <button key={t.key} onClick={() => switchMode(t.key)}
                style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", borderRadius: 8, border: `0.5px solid ${on ? POA.accent : POA.btnBorder}`, background: on ? POA.accent : "transparent", color: on ? POA.white : POA.navLabel }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {err && <ErrBox msg={err} />}

        {sent ? (
          <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 11, padding: "14px 16px", fontSize: 13.5, color: POA.greenText, lineHeight: 1.55 }}>
            {sentMsg}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>Association email</div>
            <input type="email" value={email} placeholder="you@department.org" style={{ ...PS.input, marginBottom: 12 }}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && mode === "magic" && email && sendMagic()} />

            {mode === "password" && (
              <>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>Password</div>
                <input type="password" value={pw} placeholder="Your password" style={{ ...PS.input, marginBottom: 12 }}
                  onChange={e => setPw(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && email && pw && signInPassword()} />
              </>
            )}

            {mode === "set" && (
              <>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>New password (min 8 characters)</div>
                <input type="password" value={pw} placeholder="Choose a password" style={{ ...PS.input, marginBottom: 12 }}
                  onChange={e => setPw(e.target.value)} />
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>Confirm password</div>
                <input type="password" value={pw2} placeholder="Re-enter password" style={{ ...PS.input, marginBottom: 12 }}
                  onChange={e => setPw2(e.target.value)} />
              </>
            )}

            {mode === "magic" && (
              <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={!email || busy} onClick={sendMagic}>
                {busy ? "Sending…" : "Send login link"}
              </button>
            )}
            {mode === "password" && (
              <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={!email || !pw || busy} onClick={signInPassword}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            )}
            {mode === "set" && (
              <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={!email || !pw || !pw2 || busy} onClick={sendReset}>
                {busy ? "Sending…" : "Email me a set-password link"}
              </button>
            )}

            <div style={{ fontSize: 11.5, color: POA.textMuted, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
              Only emails on your association's roster can sign in.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Shared password modal — used for the reset-return flow and the sidebar "Change password" action.
   Supabase's updateUser({ password }) sets the password for the current session's user. */
function PasswordSetModal({ title, blurb, initialPw = "", requireSet = false, onClose, onSaved }) {
  const [pw, setPw]     = useState(initialPw);
  const [pw2, setPw2]   = useState(initialPw);
  const [err, setErr]   = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    setErr("");
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== pw2)    { setErr("Passwords don't match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setDone(true);
    onSaved && onSaved();
  }

  return (
    <div onClick={requireSet ? undefined : onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "grid", placeItems: "center", padding: 20, zIndex: 200, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: POA.card, border: `0.5px solid ${POA.hairline}`, borderRadius: 16, padding: "28px 26px", width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}>
        <h2 style={{ fontFamily: "inherit", fontSize: 20, fontWeight: 700, color: POA.textPrimary, margin: "0 0 6px" }}>{title}</h2>
        {blurb && <p style={{ fontSize: 13, color: POA.textMuted, lineHeight: 1.55, margin: "0 0 18px" }}>{blurb}</p>}

        {done ? (
          <>
            <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 11, padding: "14px 16px", fontSize: 13.5, color: POA.greenText, lineHeight: 1.55, marginBottom: 16 }}>
              Password updated. You can sign in with it from now on.
            </div>
            <button style={{ ...PS.btnPrimary, width: "100%" }} onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            {err && <ErrBox msg={err} />}
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>New password (min 8 characters)</div>
            <input type="password" value={pw} placeholder="Choose a password" style={{ ...PS.input, marginBottom: 12 }}
              onChange={e => setPw(e.target.value)} />
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>Confirm password</div>
            <input type="password" value={pw2} placeholder="Re-enter password" style={{ ...PS.input, marginBottom: 16 }}
              onChange={e => setPw2(e.target.value)}
              onKeyDown={e => e.key === "Enter" && pw && pw2 && save()} />
            <div style={{ display: "flex", gap: 8 }}>
              {!requireSet && (
                <button style={{ ...PS.btn, flex: 1, justifyContent: "center" }} onClick={onClose}>Cancel</button>
              )}
              <button style={{ ...PS.btnPrimary, flex: 1 }} disabled={!pw || !pw2 || busy} onClick={save}>
                {busy ? "Saving…" : "Save password"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ minHeight: "100vh", background: POA.pageBg, display: "grid", placeItems: "center" }}>
    <Loader2 size={24} color={POA.accent} style={{ animation: "spin 1s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } } body { margin: 0; }`}</style>
  </div>;
}

function NotOnRoster({ session }) {
  return (
    <div style={{ minHeight: "100vh", background: POA.pageBg, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); body { margin: 0; }`}</style>
      <div style={{ background: POA.card, border: `0.5px solid ${POA.hairline}`, borderRadius: 18, padding: "36px 32px", maxWidth: 400, textAlign: "center" }}>
        <h2 style={{ fontFamily: "inherit", color: POA.textPrimary, margin: "0 0 10px" }}>Email not recognized.</h2>
        <p style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.6, margin: "0 0 22px" }}>{session.user.email} isn't on any association roster yet. Ask your board to add you, then sign in again.</p>
        <button style={{ ...PS.btn, justifyContent: "center", width: "100%" }} onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  );
}
