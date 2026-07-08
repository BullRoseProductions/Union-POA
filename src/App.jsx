import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Phone, MessageSquare, Handshake, TrendingUp, Shield,
  Calendar, CreditCard, Vote, ShoppingBag, AlertTriangle, Bell,
  CalendarCheck, ClipboardList, DollarSign, Heart, Megaphone,
  BookOpen, Mail, Users, BarChart3, LogOut, Menu, X, ChevronRight, ChevronDown, ChevronUp,
  Sparkles, CheckCircle2, Clock, Loader2, Send, Building2,
  Plus, Pencil, Trash2, ArrowLeft, RefreshCw, FileText, QrCode, Settings,
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
  pageBg: "radial-gradient(130% 100% at 100% 0%, #130D1F 0%, #0C0A14 42%, #090810 100%)",
  sidebar: "#09080F",
  card: "#120E1E",
  hairline: "rgba(255,255,255,.06)",
  cardShadow: "0 10px 30px rgba(0,0,0,.4)",
  cardRadius: 14,
  textPrimary: "#F4F1FA",
  textSecondary: "#B0A8C8",
  textMuted: "#7A7296",
  textMuted2: "#9890B0",
  accent: "#9B6BE6",       // primary violet
  accentDim: "#5a3f8c",
  accentSoft: "rgba(155,107,230,.14)",
  accentBright: "#B48AEF",
  green: "#46C793",
  greenText: "#7AD8B0",
  amber: "#F0B44A",
  amberText: "#D6A95E",
  red: "#EF6A64",
  redText: "#E58A90",
  track: "rgba(255,255,255,.06)",
  btnBg: "rgba(255,255,255,.04)",
  btnBorder: "rgba(255,255,255,.10)",
  inputBorder: "rgba(255,255,255,.12)",
  btnText: "#E4DFF4",
  btnIcon: "#9890B0",
  navLabel: "#C4BCDA",
  white: "#fff",
};

/* ---------- Style recipes (same shape as fire's FS) ---------- */
const PS = {
  kicker: { fontSize: 10, textTransform: "uppercase", letterSpacing: ".18em", color: POA.accent, fontWeight: 700, margin: 0 },
  card: { background: POA.card, border: `0.5px solid ${POA.hairline}`, borderRadius: POA.cardRadius, boxShadow: POA.cardShadow },
  btn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, background: POA.btnBg, border: `0.5px solid ${POA.btnBorder}`, borderRadius: 9, color: POA.btnText, cursor: "pointer", fontFamily: "inherit" },
  btnPrimary: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: POA.accent, color: POA.white, border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  input: { border: `0.5px solid ${POA.inputBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: POA.card, color: POA.textPrimary, colorScheme: "dark", width: "100%" },
  textarea: { border: `0.5px solid ${POA.inputBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", background: POA.card, color: POA.textPrimary, colorScheme: "dark", width: "100%", minHeight: 130, resize: "vertical", lineHeight: 1.55 },
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
  { id: "m_value",    label: "My Value",         Icon: TrendingUp },
  { id: "m_benefits", label: "Benefits",         Icon: Shield },
  { id: "m_events",   label: "Events",           Icon: Calendar },
  { id: "m_card",     label: "My Card",          Icon: CreditCard },
  { id: "m_vote",     label: "VoteLink",         Icon: Vote },
  { id: "m_store",    label: "Store",            Icon: ShoppingBag },
  { id: "m_correspondence", label: "Correspondence", Icon: Mail },
];

const BOARD_NAV = [
  { id: "b_dash",         label: "Dashboard",        Icon: LayoutDashboard },
  { id: "b_attendance",   label: "Meeting Attendance",Icon: CalendarCheck },
  { id: "b_meetings",     label: "Agenda & Minutes",  Icon: ClipboardList },
  { id: "b_stipend",      label: "Stipend Log",       Icon: DollarSign },
  { id: "b_causes",       label: "Causes",            Icon: Heart },
  { id: "b_fundraising",  label: "Fundraising",       Icon: Megaphone },
  { id: "b_social",       label: "Social & Media",    Icon: BarChart3 },
  { id: "b_building",     label: "POA Building",      Icon: Building2 },
  { id: "b_continuity",   label: "Board Continuity",  Icon: BookOpen },
  { id: "b_correspondence",label: "Correspondence",   Icon: Mail },
  { id: "b_members",      label: "Members",           Icon: Users },
  { id: "b_ledger",       label: "Value Ledger",      Icon: TrendingUp },
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
  const { data, error } = await supabase.from("causes")
    .select("*, cause_entries(*)")
    .order("sort", { ascending: true });
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
function Card({ children, style }) {
  return <div style={{ ...PS.card, padding: "16px 18px", marginBottom: 10, ...style }}>{children}</div>;
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
  const [next, setNext] = useState(null);
  const [openCount, setOpenCount] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  useEffect(() => {
    listMeetings().then(ms => setNext(ms.filter(m => m.status === "open")[0] || null));
    myActionItems(me.id).then(items => setOpenCount(items.filter(i => i.status === "open").length));
  }, [me.id]);
  useEffect(() => { getActiveAlert().then(setActiveAlert).catch(() => null); }, []);

  const first = me.full_name?.split(" ").slice(-1)[0] || me.full_name;
  return (
    <div>
      {activeAlert && (
        <div style={{ background: "rgba(239,106,100,.1)", border: "1px solid rgba(239,106,100,.4)", borderRadius: 12, padding: "14px 16px", marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <AlertTriangle size={18} color={POA.red} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, color: POA.red, fontSize: 13, marginBottom: 3 }}>CRITICAL ALERT</div>
            <div style={{ fontWeight: 700, color: POA.textPrimary, marginBottom: 3 }}>{activeAlert.subject}</div>
            <div style={{ fontSize: 13, color: POA.textSecondary, lineHeight: 1.55 }}>{activeAlert.body}</div>
          </div>
        </div>
      )}
      <PageTitle sub={`${org?.name || "Your Association"} · Member Hub`}>Good day, {first}.</PageTitle>

      <StatRow stats={[
        { n: openCount, label: "Your open actions", color: POA.accent },
        { n: me.standing || "Good", label: "Standing", color: POA.green },
        { n: me.badge || "—", label: "Badge" },
      ]} />

      {next && (
        <div>
          <SectionTitle>Next meeting</SectionTitle>
          <Card style={{ cursor: "pointer", borderColor: POA.accentDim }} onClick={() => setView("m_events")}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>{next.title}</div>
                <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 3 }}>{fmtDate(next.scheduled_at)}{next.location ? ` · ${next.location}` : ""}</div>
              </div>
              <ChevronRight size={16} color={POA.textMuted} />
            </div>
          </Card>
        </div>
      )}

      <SectionTitle>Quick access</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {[
          { id: "m_call", label: "Who to Call", Icon: Phone },
          { id: "m_ask",  label: "Ask B4C",     Icon: MessageSquare },
          { id: "m_card", label: "My Card",      Icon: CreditCard },
          { id: "m_benefits", label: "Benefits", Icon: Shield },
        ].map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setView(id)}
            style={{ ...PS.card, padding: "14px 15px", border: `0.5px solid ${POA.hairline}`, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon size={18} color={POA.accent} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: POA.textPrimary }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Recent videos from the association */}
      <RecentVideos deptId={me.department_id} />
    </div>
  );
}

function WhoToCall({ org }) {
  const contacts = [
    { role: "Association President", note: "General questions, member support" },
    { role: "Legal Defense Rep", note: "Officer in need of counsel" },
    { role: "Member Welfare Chair", note: "Personal crisis, family support" },
    { role: "PAC / Political Chair", note: "Endorsements, political activity" },
    { role: "Treasurer", note: "Dues, reimbursements, financial" },
  ];
  return (
    <div>
      <PageTitle sub="Direct lines for what matters">Who to Call</PageTitle>
      <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
        Your association's contact directory. Numbers and emails are managed by your board — if something's missing, flag it in Correspondence.
      </div>
      {contacts.map(c => (
        <Card key={c.role}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: POA.textPrimary }}>{c.role}</div>
          <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 3 }}>{c.note}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button style={PS.btn}><Phone size={13} /> Call</button>
            <button style={PS.btn}><Mail size={13} /> Email</button>
          </div>
        </Card>
      ))}
      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>Contact details are set by your board in the Members section.</div>
    </div>
  );
}

function AskB4C({ me, org }) {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  async function ask() {
    if (!q.trim()) return;
    const question = q.trim();
    setQ("");
    setMsgs(m => [...m, { role: "user", text: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ask-b4c", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, org: org?.name }),
      });
      const data = await res.json().catch(() => ({}));
      setMsgs(m => [...m, { role: "assistant", text: data.answer || "AI isn't configured yet — add ANTHROPIC_API_KEY in Vercel to enable grounded Q&A." }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", text: "Couldn't reach the AI endpoint. Check that ANTHROPIC_API_KEY is set in Vercel." }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      <PageTitle sub="Grounded answers from your association's own documents">Ask B4C</PageTitle>
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
        {msgs.length === 0 && (
          <Card><div style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.6 }}>
            Ask anything about your CBA, bylaws, benefits, or member handbook. B4C answers from your association's own uploaded documents — never fabricates.
          </div></Card>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", background: m.role === "user" ? POA.accentSoft : POA.card, border: `0.5px solid ${POA.hairline}`, borderRadius: 12, padding: "10px 14px", fontSize: 13.5, color: POA.textPrimary, lineHeight: 1.6 }}>
              {m.text}
            </div>
          </div>
        ))}
        {busy && <div style={{ display: "flex", gap: 8, padding: "10px 14px", color: POA.textMuted, fontSize: 13 }}><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && !busy && ask()}
          placeholder="Ask about your CBA, benefits, bylaws…" style={{ ...PS.input, flex: 1 }} />
        <button onClick={ask} disabled={!q.trim() || busy} style={{ ...PS.btnPrimary, padding: "10px 14px" }}><Send size={15} /></button>
      </div>
    </div>
  );
}

function MyCard({ me, org }) {
  return (
    <div>
      <PageTitle sub="Your digital membership card">My Card</PageTitle>
      <div style={{ ...PS.card, padding: "28px 24px", marginBottom: 16, background: `linear-gradient(135deg, #1a1030, #2a1860)`, border: `1px solid ${POA.accentDim}` }}>
        <div style={{ ...PS.kicker, marginBottom: 14 }}>{org?.name || "Association"}</div>
        <div style={{ fontWeight: 700, fontSize: 22, color: POA.textPrimary, marginBottom: 4 }}>{me.full_name}</div>
        <div style={{ fontSize: 13, color: POA.textSecondary, marginBottom: 18 }}>
          Badge {me.badge || "—"}{me.district ? ` · District ${me.district}` : ""} · {(me.access || ["Member"]).filter(r => r !== "Member")[0] || "Member"}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 10, color: POA.textMuted, textTransform: "uppercase", letterSpacing: ".1em" }}>Standing</div>
            <div style={{ fontWeight: 700, color: POA.green, fontSize: 15 }}>{me.standing || "Good"}</div>
          </div>
          <div style={{ fontSize: 11, color: POA.textMuted }}>B4C · POA</div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: POA.textMuted, textAlign: "center", fontStyle: "italic" }}>Show this screen to verify membership at association events.</div>
    </div>
  );
}

function MemberEvents() {
  const [meetings, setMeetings] = useState(null);
  useEffect(() => { listMeetings().then(setMeetings); }, []);
  if (!meetings) return <Spinner />;
  return (
    <div>
      <PageTitle sub="Upcoming meetings and association events">Events</PageTitle>
      {meetings.filter(m => m.visibility !== "board").length === 0 && (
        <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No upcoming meetings scheduled yet.</div></Card>
      )}
      {meetings.filter(m => m.visibility !== "board").map(m => (
        <Card key={m.id}>
          <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>{m.title}</div>
          <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 3 }}>
            {fmtDate(m.scheduled_at)}{m.location ? ` · ${m.location}` : ""}
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{m.kind}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ================================================================
   BOARD SCREENS
   ================================================================ */
function BoardDash({ me, org }) {
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [causes, setCauses] = useState([]);
  useEffect(() => {
    listMeetings().then(setMeetings);
    listMembers().then(setMembers);
    listCauses().then(setCauses);
  }, []);

  const openMeetings  = meetings.filter(m => m.status === "open").length;
  const activeCauses  = causes.filter(c => c.status === "active").length;
  const activeMembers = members.filter(m => m.status === "active").length;

  return (
    <div>
      <PageTitle sub={`${org?.name || "Association"} · Board Console`}>
        Board Dashboard
      </PageTitle>
      <StatRow stats={[
        { n: activeMembers, label: "Active members", color: POA.accent },
        { n: openMeetings,  label: "Open meetings",  color: POA.amber },
        { n: activeCauses,  label: "Active causes",  color: POA.green },
      ]} />

      <SectionTitle>Open meetings</SectionTitle>
      {meetings.filter(m => m.status === "open").length === 0
        ? <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No open meetings.</div></Card>
        : meetings.filter(m => m.status === "open").map(m => (
          <Card key={m.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: POA.textPrimary }}>{m.title}</div>
                <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 2 }}>{fmtDate(m.scheduled_at)}{m.location ? ` · ${m.location}` : ""}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{m.kind}</span>
            </div>
          </Card>
        ))
      }

      <SectionTitle>Active causes</SectionTitle>
      {causes.filter(c => c.status === "active").length === 0
        ? <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No active causes — add one in Causes.</div></Card>
        : causes.filter(c => c.status === "active").map(c => {
          const raised = (c.cause_entries || []).filter(e => e.kind === "contribution" && e.amount).reduce((s, e) => s + Number(e.amount), 0);
          return (
            <Card key={c.id}>
              <div style={{ fontWeight: 700, color: POA.textPrimary }}>{c.name}</div>
              {c.tagline && <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 2 }}>{c.tagline}</div>}
              {(raised > 0 || c.goal_amount) && (
                <div style={{ fontSize: 12.5, color: POA.greenText, marginTop: 5 }}>
                  Raised {money(raised)}{c.goal_amount ? ` of ${money(c.goal_amount)} goal` : ""}
                </div>
              )}
            </Card>
          );
        })
      }
    </div>
  );
}

function AgendaMinutes({ me }) {
  const [meetings, setMeetings] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState("");
  const [err, setErr]           = useState("");
  const [busy, setBusy]         = useState(false);

  useEffect(() => { listMeetings().then(setMeetings); }, []);

  async function load(id) {
    const m = await getMeeting(id);
    setDetail(m);
    setDraft(m.minutes_body || "");
  }

  async function saveMinutes() {
    setBusy(true); setErr("");
    try { await fileMinutes(detail.id, draft); setEditing(false); await load(detail.id); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doComplete() {
    if (!confirm("Mark this meeting completed? This starts the 14-day archive grace period.")) return;
    setBusy(true); setErr("");
    try { await completeMeeting(detail.id); await load(detail.id); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function toggleAction(item) {
    setErr("");
    try { await setActionStatus(item.id, item.status === "done" ? "open" : "done"); await load(detail.id); }
    catch (e) { setErr(e.message); }
  }

  if (!meetings) return <Spinner />;

  if (detail) {
    const actions = detail.action_items || [];
    return (
      <div>
        <button onClick={() => { setDetail(null); setEditing(false); }} style={{ ...PS.btn, marginBottom: 16 }}>
          <ArrowLeft size={13} /> Back to meetings
        </button>
        <ErrBox msg={err} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <p style={PS.kicker}>{detail.kind} meeting</p>
            <h2 style={{ fontFamily: "inherit", fontSize: 22, fontWeight: 700, color: POA.textPrimary, margin: "4px 0" }}>{detail.title}</h2>
            <div style={{ fontSize: 13, color: POA.textMuted }}>{fmtDate(detail.scheduled_at)}{detail.location ? ` · ${detail.location}` : ""}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: POA.accentSoft, color: POA.accent, flexShrink: 0 }}>{detail.status}</span>
        </div>

        <SectionTitle>Agenda</SectionTitle>
        {(detail.agenda_items || []).length === 0
          ? <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No agenda items.</div></Card>
          : (detail.agenda_items || []).map(a => (
            <Card key={a.id}>
              <div style={{ fontWeight: 600, color: POA.textPrimary }}>{a.position}. {a.title}</div>
              {a.notes && <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 4 }}>{a.notes}</div>}
            </Card>
          ))
        }

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 18 }}>
          <p style={{ ...PS.kicker, margin: 0 }}>Minutes</p>
          {!editing && canManage(me.access) && (
            <button style={PS.btn} onClick={() => setEditing(true)}>
              <Pencil size={12} /> {detail.minutes_body ? "Revise" : "File minutes"}
            </button>
          )}
        </div>

        {editing ? (
          <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              placeholder="Type rough notes — AI can help draft, but a human files." style={PS.textarea} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={PS.btnPrimary} disabled={busy} onClick={saveMinutes}>{busy ? "Filing…" : "File minutes"}</button>
              <button style={PS.btn} onClick={() => setEditing(false)}>Cancel</button>
            </div>
            <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
              Filing bumps the version and re-stamps the time on the server. AI drafts; a human files.
            </div>
          </>
        ) : detail.minutes_body ? (
          <>
            <div style={{ background: POA.sidebar, border: `0.5px solid ${POA.hairline}`, borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 10px 10px 0", padding: "14px 16px", fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
              {detail.minutes_body}
            </div>
            <div style={{ fontSize: 11.5, color: POA.green, marginTop: 6 }}>
              v{detail.minutes_version} · filed {fmtDate(detail.minutes_filed_at)}
            </div>
          </>
        ) : (
          <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>Minutes not filed yet.</div></Card>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, marginTop: 18 }}>
          <p style={{ ...PS.kicker, margin: 0 }}>Action items</p>
        </div>
        {actions.length === 0
          ? <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No action items from this meeting.</div></Card>
          : actions.map(a => {
            const over = isOverdue(a.due_date, a.status);
            return (
              <div key={a.id} style={{ ...PS.card, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 11 }}>
                <button onClick={() => toggleAction(a)}
                  style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${a.status === "done" ? POA.green : POA.accentDim}`, background: a.status === "done" ? POA.green : "transparent", flexShrink: 0, marginTop: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {a.status === "done" && <CheckCircle2 size={12} color="#052b1e" />}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: a.status === "done" ? POA.textMuted : POA.textPrimary, textDecoration: a.status === "done" ? "line-through" : "none" }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 3 }}>
                    {a.members?.full_name || "Unassigned"}{a.due_date ? ` · due ${fmtShort(a.due_date)}` : ""}
                  </div>
                </div>
                {over && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(240,180,74,.14)", color: POA.amber, flexShrink: 0 }}>Overdue</span>}
              </div>
            );
          })
        }

        {canManage(me.access) && detail.status === "open" && (
          <button style={{ ...PS.btnPrimary, marginTop: 16, width: "100%" }} disabled={busy} onClick={doComplete}>
            Complete meeting
          </button>
        )}
        {detail.status === "completed" && detail.archive_after && (
          <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 10, fontStyle: "italic" }}>
            Completed · archives after {fmtDate(detail.archive_after)} (14-day grace)
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageTitle sub="Agendas, filed minutes, and action items — the proof spine">Agenda & Minutes</PageTitle>
      {meetings.length === 0 && <Card><div style={{ color: POA.textMuted }}>No meetings yet.</div></Card>}
      {meetings.map(m => (
        <Card key={m.id} style={{ cursor: "pointer" }} onClick={() => load(m.id)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: POA.textPrimary }}>{m.title}</div>
              <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 2 }}>{fmtDate(m.scheduled_at)}{m.location ? ` · ${m.location}` : ""}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{m.status}</span>
            <ChevronRight size={15} color={POA.textMuted} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function CausesBoard({ me }) {
  const [rows, setRows]       = useState(null);
  const [detail, setDetail]   = useState(null);
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState(false);
  const [err, setErr]         = useState("");
  const [f, setF]             = useState({ name: "", tagline: "", external_url: "", goal_amount: "", description: "", status: "active" });
  const [ef, setEf]           = useState({});
  const [addEntry, setAddEntry] = useState(false);
  const [en, setEn]           = useState({ kind: "contribution", label: "", amount: "", occurred_on: "" });

  async function load() { setRows(await listCauses()); }
  async function loadDetail(id) {
    const updated = await listCauses();
    setRows(updated);
    setDetail(updated.find(c => c.id === id) || null);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr("");
    const { data, error } = await supabase.from("causes").insert({ department_id: me.department_id, name: f.name.trim(), tagline: f.tagline || null, external_url: f.external_url || null, goal_amount: f.goal_amount ? Number(f.goal_amount) : null, description: f.description || null }).select().single();
    if (error) { setErr(error.message); return; }
    setAdding(false); setF({ name: "", tagline: "", external_url: "", goal_amount: "", description: "", status: "active" }); await load();
  }
  async function update() {
    setErr("");
    const { error } = await supabase.from("causes").update({ name: ef.name, tagline: ef.tagline || null, external_url: ef.external_url || null, goal_amount: ef.goal_amount ? Number(ef.goal_amount) : null, description: ef.description || null, status: ef.status }).eq("id", detail.id);
    if (error) { setErr(error.message); return; }
    setEditing(false); await loadDetail(detail.id);
  }
  async function remove() {
    // DeptAdmin = hard delete; Board = soft archive (same pattern as fire cancel)
    if (isDeptAdmin(me.access)) {
      if (!confirm("Permanently delete this cause? This cannot be undone.")) return;
      await supabase.from("causes").delete().eq("id", detail.id);
      setDetail(null);
    } else {
      if (!confirm("Archive this cause? It can be restored by your Department Admin.")) return;
      await supabase.from("causes").update({ status: "archived" }).eq("id", detail.id);
      setDetail(prev => ({ ...prev, status: "archived" }));
    }
    await load();
  }
  async function addCauseEntry() {
    setErr("");
    const { error } = await supabase.from("cause_entries").insert({ cause_id: detail.id, department_id: me.department_id, kind: en.kind, label: en.label.trim(), amount: en.amount ? Number(en.amount) : null, occurred_on: en.occurred_on || null });
    if (error) { setErr(error.message); return; }
    setAddEntry(false); setEn({ kind: "contribution", label: "", amount: "", occurred_on: "" }); await loadDetail(detail.id);
  }

  if (!rows) return <Spinner />;

  if (detail) {
    const entries = detail.cause_entries || [];
    const raised  = entries.filter(e => e.kind === "contribution" && e.amount).reduce((s, e) => s + Number(e.amount), 0);
    return (
      <div>
        <button onClick={() => { setDetail(null); setEditing(false); setAddEntry(false); }} style={{ ...PS.btn, marginBottom: 16 }}><ArrowLeft size={13} /> Causes</button>
        <ErrBox msg={err} />
        {editing ? (
          <Card>
            {["name","tagline","description","external_url","goal_amount"].map(k => (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4, textTransform: "capitalize" }}>{k.replace(/_/g," ")}</div>
                {k === "description"
                  ? <textarea value={ef[k] || ""} onChange={e => setEf({ ...ef, [k]: e.target.value })} style={{ ...PS.textarea, minHeight: 80 }} />
                  : <input value={ef[k] || ""} onChange={e => setEf({ ...ef, [k]: e.target.value })} style={PS.input} />
                }
              </div>
            ))}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Status</div>
              <select value={ef.status} onChange={e => setEf({ ...ef, status: e.target.value })} style={{ ...PS.input }}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={PS.btnPrimary} onClick={update}>Save</button>
              <button style={PS.btn} onClick={() => setEditing(false)}>Cancel</button>
              <button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }} onClick={remove}>
                {isDeptAdmin(me.access) ? "Delete" : "Archive"}
              </button>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={PS.kicker}>Cause</p>
                <h2 style={{ fontFamily: "inherit", fontSize: 22, fontWeight: 700, color: POA.textPrimary, margin: "4px 0" }}>{detail.name}</h2>
                {detail.tagline && <div style={{ fontSize: 13.5, color: POA.textMuted }}>{detail.tagline}</div>}
              </div>
              <button style={PS.btn} onClick={() => { setEf({ name: detail.name, tagline: detail.tagline || "", description: detail.description || "", external_url: detail.external_url || "", goal_amount: detail.goal_amount ?? "", status: detail.status }); setEditing(true); }}>
                <Pencil size={12} /> Edit
              </button>
            </div>
            {detail.description && <Card><div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.65 }}>{detail.description}</div></Card>}
            {(raised > 0 || detail.goal_amount) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <Card><div style={{ fontWeight: 700, fontSize: 22, color: POA.green }}>{money(raised) || "$0"}</div><div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4 }}>RAISED (TRACKED)</div></Card>
                <Card><div style={{ fontWeight: 700, fontSize: 22, color: POA.accent }}>{money(detail.goal_amount) || "—"}</div><div style={{ fontSize: 11, color: POA.textMuted, marginTop: 4 }}>GOAL</div></Card>
              </div>
            )}
            {detail.external_url && (
              <a href={detail.external_url} target="_blank" rel="noreferrer" style={{ ...PS.btnPrimary, textDecoration: "none", marginBottom: 14, display: "inline-flex" }}>Support this cause ↗</a>
            )}
          </>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 8px" }}>
          <p style={{ ...PS.kicker, margin: 0 }}>Activity</p>
          {!addEntry && <button style={PS.btn} onClick={() => setAddEntry(true)}><Plus size={12} /> Add entry</button>}
        </div>
        {addEntry && (
          <Card>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Type</div>
              <select value={en.kind} onChange={e => setEn({ ...en, kind: e.target.value })} style={PS.input}>
                {["contribution","participation","outcome","update"].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>What happened</div>
              <input value={en.label} onChange={e => setEn({ ...en, label: e.target.value })} style={PS.input} placeholder="e.g. Toy drive at Station 4" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Amount</div>
                <input value={en.amount} onChange={e => setEn({ ...en, amount: e.target.value })} style={PS.input} placeholder="optional" inputMode="numeric" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Date</div>
                <input type="date" value={en.occurred_on} onChange={e => setEn({ ...en, occurred_on: e.target.value })} style={PS.input} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={PS.btnPrimary} onClick={addCauseEntry}>Save entry</button>
              <button style={PS.btn} onClick={() => setAddEntry(false)}>Cancel</button>
            </div>
          </Card>
        )}
        {entries.length === 0 && !addEntry && <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No activity recorded yet.</div></Card>}
        {entries.map(e => (
          <Card key={e.id}>
            <div style={{ fontWeight: 600, color: POA.textPrimary }}>{e.label}{e.amount ? ` · ${money(e.amount)}` : ""}</div>
            <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 3 }}>{e.kind}{e.occurred_on ? ` · ${fmtShort(e.occurred_on)}` : ""}</div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
        <PageTitle sub="C4K · ATO and every cause your association stands behind" />
        <button style={PS.btn} onClick={() => setAdding(!adding)}><Plus size={13} /> Add cause</button>
      </div>
      <PageTitle sub="C4K · ATO and every cause your association stands behind">Causes</PageTitle>
      <ErrBox msg={err} />
      {adding && (
        <Card>
          {["name","tagline","external_url","goal_amount"].map(k => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4, textTransform: "capitalize" }}>{k.replace(/_/g," ")}</div>
              <input value={f[k] || ""} onChange={e => setF({ ...f, [k]: e.target.value })} style={PS.input} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} onClick={create}>Save</button>
            <button style={PS.btn} onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>Causes are data — every association adds their own. Nothing is hardcoded.</div>
        </Card>
      )}
      {rows.length === 0 && !adding && <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No causes yet. Add your association's first initiative.</div></Card>}
      {rows.map(c => {
        const raised = (c.cause_entries || []).filter(e => e.kind === "contribution" && e.amount).reduce((s, e) => s + Number(e.amount), 0);
        return (
          <Card key={c.id} style={{ cursor: "pointer" }} onClick={() => { setDetail(c); setEditing(false); setAddEntry(false); }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: POA.textPrimary }}>{c.name}</div>
                {c.tagline && <div style={{ fontSize: 12.5, color: POA.textMuted, marginTop: 2 }}>{c.tagline}</div>}
                {raised > 0 && <div style={{ fontSize: 12, color: POA.greenText, marginTop: 4 }}>Raised {money(raised)}{c.goal_amount ? ` of ${money(c.goal_amount)}` : ""}</div>}
              </div>
              {c.status === "archived" && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: POA.track, color: POA.textMuted }}>Archived</span>}
              <ChevronRight size={15} color={POA.textMuted} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MembersBoard({ me }) {
  const [members, setMembers] = useState(null);
  const [q, setQ]             = useState("");
  useEffect(() => { listMembers().then(setMembers); }, []);
  if (!members) return <Spinner />;
  const filtered = members.filter(m => !q || m.full_name?.toLowerCase().includes(q.toLowerCase()) || m.email?.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle sub={isDeptAdmin(me.access) ? "Full roster — you can add and edit members" : "Your association's full roster"}>Members</PageTitle>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or email…" style={{ ...PS.input, marginBottom: 14 }} />
      {filtered.map(m => (
        <Card key={m.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: POA.accentSoft, color: POA.accent, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{initials(m.full_name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{m.full_name}</div>
              <div style={{ fontSize: 12, color: POA.textMuted }}>{m.email}{m.badge ? ` · Badge ${m.badge}` : ""}</div>
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
              {detail.attendance_mode === "qr" ? "QR" : detail.attendance_mode === "manual" ? "Manual" : "No tracking"}
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
            return <p style={{ ...PS.kicker, marginBottom: 10 }}>Attendance roll ({att.length} / {roster.length}){detail.assign_all ? "" : " · assigned only"}</p>;
          })()}
          <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 10 }}>
            {manage && !detail.done ? "Tap a name to toggle — or use the QR code above for self-serve." : "Attendance record."}
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
                  {present ? "PRESENT" : "ABSENT"}
                </span>
              </div>
            );
          })}
        </div>

        {manage && !detail.done && (
          <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={busy} onClick={() => doComplete(detail)}>
            <CalendarCheck size={15} /> Mark event done — lock attendance
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
          <p style={{ ...PS.kicker, marginBottom: 4 }}>Meeting Attendance</p>
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
                <option value="qr">QR scan (tamper-proof)</option>
                <option value="manual">Manual roll (board marks)</option>
                <option value="none">No tracking</option>
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
  const items = [
    { label: "Legal defense cases supported", n: 0, unit: "cases", color: POA.accent },
    { label: "Legal defense fund used", n: "$0", unit: "", color: POA.accent },
    { label: "Negotiated raise (CBA)", n: "+$1,850", unit: "/yr", color: POA.green },
    { label: "Meetings attended this year", n: 0, unit: "of 4", color: POA.amber },
    { label: "Benefits accessed", n: 2, unit: "programs", color: POA.green },
  ];
  return (
    <div>
      <PageTitle sub="Your dues at work — countable and honest">My Value</PageTitle>
      <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 18, lineHeight: 1.6 }}>
        What your membership has delivered. These numbers come from your association's own records — never fabricated.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        {items.map(item => (
          <div key={item.label} style={{ ...PS.card, padding: "14px 16px" }}>
            <div style={{ fontFamily: "inherit", fontWeight: 700, fontSize: 22, color: item.color, lineHeight: 1 }}>{item.n}<span style={{ fontSize: 13, fontWeight: 400, color: POA.textMuted }}>{item.unit}</span></div>
            <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 6, lineHeight: 1.4 }}>{item.label}</div>
          </div>
        ))}
      </div>
      <Card>
        <div style={{ fontSize: 13, color: POA.textSecondary, lineHeight: 1.65 }}>
          Your association negotiates your contract, defends your rights, and fights for your family.
          This screen will populate as your board records activity. <span style={{ color: POA.accent, fontWeight: 600 }}>Proof, not promises.</span>
        </div>
      </Card>
    </div>
  );
}

function Benefits({ me }) {
  const benefits = [
    { title: "Legal Defense Fund", status: "Active", desc: "Up to $500K in legal representation for on-duty incidents. Contact your rep before speaking to investigators.", tag: "Core" },
    { title: "Death & Disability", status: "Active", desc: "Association-negotiated supplemental coverage on top of department benefits.", tag: "Core" },
    { title: "Scholarship Fund", status: "Active", desc: "Annual scholarships for members' children. Applications open each spring.", tag: "Education" },
    { title: "Member Assistance Program", status: "Active", desc: "Free confidential counseling — mental health, financial, family. No records shared with the department.", tag: "Wellness" },
    { title: "Retirement Support", status: "Active", desc: "Peer advisors who've navigated the pension system. Call before you sign anything.", tag: "Financial" },
  ];
  return (
    <div>
      <PageTitle sub="What your membership covers">Benefits</PageTitle>
      {benefits.map(b => (
        <Card key={b.title}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>{b.title}</div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: "rgba(70,199,147,.14)", color: POA.green }}>{b.status}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{b.tag}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: POA.textMuted, lineHeight: 1.55 }}>{b.desc}</div>
          <button style={{ ...PS.btn, marginTop: 10 }}><Phone size={13} /> Get help with this</button>
        </Card>
      ))}
      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
        Benefits are managed by your board. Contact your rep if something looks wrong.
      </div>
    </div>
  );
}

function VoteLink() {
  const votes = [
    { title: "CBA Ratification Vote", status: "open", desc: "Vote on the proposed collective bargaining agreement. Closes July 31.", url: "#" },
    { title: "Board Election — District 4 Rep", status: "upcoming", desc: "Nominations close August 15. Election opens September 1.", url: null },
    { title: "Bylaw Amendment — Article 7", status: "closed", desc: "Amendment passed 87% in favor. Effective immediately.", url: null },
  ];
  const statusColor = { open: POA.green, upcoming: POA.amber, closed: POA.textMuted };
  return (
    <div>
      <PageTitle sub="Association votes and elections">VoteLink</PageTitle>
      <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
        Official votes are conducted on your association's secure voting platform. B4C links you there — we don't process votes.
      </div>
      {votes.map(v => (
        <Card key={v.title}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>{v.title}</div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: `rgba(${v.status === "open" ? "70,199,147" : v.status === "upcoming" ? "240,180,74" : "122,114,150"},.14)`, color: statusColor[v.status], flexShrink: 0, textTransform: "uppercase" }}>{v.status}</span>
          </div>
          <div style={{ fontSize: 13, color: POA.textMuted, lineHeight: 1.55, marginBottom: 10 }}>{v.desc}</div>
          {v.url && <a href={v.url} style={{ ...PS.btnPrimary, textDecoration: "none", display: "inline-flex" }}><Vote size={14} /> Cast your vote ↗</a>}
        </Card>
      ))}
      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 8, fontStyle: "italic" }}>
        Vote links and deadlines are posted by your board. Active votes show here automatically.
      </div>
    </div>
  );
}

function Store() {
  const items = [
    { name: "Association Polo", desc: "Embroidered logo, moisture-wicking. Sizes S–4XL.", price: "$42", tag: "Apparel" },
    { name: "Challenge Coin", desc: "Solid brass, association seal. Limited run.", price: "$18", tag: "Collectible" },
    { name: "Duty Bag", desc: "Tactical backpack with patch. Association branded.", price: "$65", tag: "Gear" },
    { name: "Decal Set", desc: "3-pack window decals. Association + FOP logos.", price: "$8", tag: "Accessories" },
  ];
  return (
    <div>
      <PageTitle sub="Association gear and merchandise">Store</PageTitle>
      <div style={{ fontSize: 13, color: POA.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
        Orders go through the association's store — B4C links you there. Proceeds support the association's programs.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map(item => (
          <div key={item.name} style={{ ...PS.card, padding: "14px 15px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: POA.accent, marginBottom: 6 }}>{item.tag}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary, marginBottom: 4 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.45, marginBottom: 10 }}>{item.desc}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, color: POA.accent, fontSize: 15 }}>{item.price}</div>
              <button style={{ ...PS.btn, padding: "5px 10px", fontSize: 11.5 }}>Order ↗</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 14, fontStyle: "italic" }}>
        Store catalog is managed by your board. Items and prices update automatically.
      </div>
    </div>
  );
}

function BoardContinuity({ me }) {
  const [positions, setPositions] = useState(null);
  const [members, setMembers]     = useState([]);
  const [editing, setEditing]     = useState(null);
  const [adding, setAdding]       = useState(false);
  const [err, setErr]             = useState("");
  const [busy, setBusy]           = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const blank = { title: "", holder_member_id: "", holder_name: "", term_start: "", term_end: "", status: "active", succession_notes: "", sort: 0 };
  const [f, setF] = useState(blank);

  const manage  = canManage(me.access);
  const isAdmin = canAdmin(me.access);

  async function load() {
    const [pos, mem] = await Promise.all([listBoardPositions(), listMembers()]);
    setPositions(pos); setMembers(mem);
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
        const holderName = p.holder_member_id
          ? (p.members?.full_name || "Member")
          : (p.holder_name || null);
        const expanded = expandedId === p.id;
        return (
          <Card key={p.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 3 }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 13, color: holderName ? POA.textSecondary : POA.textMuted }}>
                  {holderName || "Vacant"}
                  {p.members?.badge ? ` · Badge ${p.members.badge}` : ""}
                </div>
                {(p.term_start || p.term_end) && (
                  <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 2 }}>
                    Term {p.term_start ? fmtDate(p.term_start) : "?"} — {p.term_end ? fmtDate(p.term_end) : "ongoing"}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: statusBg[p.status] || POA.accentSoft, color: statusColor[p.status] || POA.accent, textTransform: "uppercase" }}>
                  {p.status}
                </span>
                {manage && (
                  <button style={{ ...PS.btn, padding: "5px 9px", fontSize: 11.5 }}
                    onClick={() => startEdit(p)}>
                    <Pencil size={11} />
                  </button>
                )}
              </div>
            </div>
            {p.succession_notes && (
              <>
                <div onClick={() => setExpandedId(expanded ? null : p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, cursor: "pointer", color: POA.textMuted, fontSize: 12 }}>
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  Succession notes
                </div>
                {expanded && (
                  <div style={{ marginTop: 8, background: POA.sidebar, border: `0.5px solid ${POA.hairline}`, borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 9px 9px 0", padding: "11px 14px", fontSize: 13, color: POA.textSecondary, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    {p.succession_notes}
                  </div>
                )}
              </>
            )}
          </Card>
        );
      })}
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
    .select("*, sender:members!correspondence_member_id_fkey(full_name), replies:correspondence!thread_id(*)")
    .eq("kind", "message")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
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
async function listStoreItems() {
  const { data, error } = await supabase.from("store_items")
    .select("*").eq("status", "active")
    .order("sort").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function createStoreItem(row) {
  const { data, error } = await supabase.from("store_items")
    .insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateStoreItem(id, patch) {
  const { data, error } = await supabase.from("store_items")
    .update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
async function archiveStoreItem(id) {
  const { error } = await supabase.from("store_items")
    .update({ status: "archived" }).eq("id", id);
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
    try { await archiveStoreItem(id); await load(); }
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
    } catch(e) { setErr(e.message); }
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
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#fff" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}` }}>
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
                        style={{ ...PS.btn, background: f.image_mode === mode ? POA.accent : POA.btnBg, color: f.image_mode === mode ? "#fff" : POA.btnText, border: f.image_mode === mode ? "none" : `0.5px solid ${POA.btnBorder}` }}>
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

function PADash() {
  const [depts, setDepts] = useState(null);
  useEffect(() => { listAllDepts().then(setDepts); }, []);
  if (!depts) return <Spinner />;
  return (
    <div>
      <PageTitle sub="Before the Call · Project Admin">PA Dashboard</PageTitle>
      <StatRow stats={[
        { n: depts.length, label: 'Organizations', color: POA.accent },
        { n: depts.filter(d => d.org_type === 'poa').length, label: 'POA', color: POA.green },
        { n: depts.filter(d => d.org_type === 'fire').length, label: 'Fire/EMS', color: POA.amber },
      ]} />
      <SectionTitle>All organizations</SectionTitle>
      {depts.map(d => (
        <Card key={d.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: POA.textPrimary }}>{d.name}</div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>{d.org_type}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: POA.accentSoft, color: POA.accent }}>{d.org_type}</span>
          </div>
        </Card>
      ))}
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
    { key: 'm_value', label: 'My Value', group: 'Member' },
    { key: 'm_benefits', label: 'Benefits', group: 'Member' },
    { key: 'm_events', label: 'Events', group: 'Member' },
    { key: 'm_card', label: 'My Card', group: 'Member' },
    { key: 'm_vote', label: 'VoteLink', group: 'Member' },
    { key: 'm_store', label: 'Store', group: 'Member' },
    { key: 'b_attendance', label: 'Meeting Attendance', group: 'Board' },
    { key: 'b_meetings', label: 'Agenda & Minutes', group: 'Board' },
    { key: 'b_stipend', label: 'Stipend Log', group: 'Board' },
    { key: 'b_causes', label: 'Causes', group: 'Board' },
    { key: 'b_fundraising', label: 'Fundraising', group: 'Board' },
    { key: 'b_social', label: 'Social & Media', group: 'Board' },
    { key: 'b_building', label: 'POA Building', group: 'Board' },
    { key: 'b_continuity', label: 'Board Continuity', group: 'Board' },
    { key: 'b_correspondence', label: 'Correspondence', group: 'Board' },
    { key: 'b_members', label: 'Members', group: 'Board' },
    { key: 'b_ledger', label: 'Value Ledger', group: 'Board' },
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

function PAAddOrg() {
  return <ComingSoon label="Add Organization — coming next" />;
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

  async function load() {
    const [ann, msgs, act] = await Promise.all([
      listAnnouncements(), listMessages(), getActiveAlert()
    ]);
    setAnnouncements(ann);
    setMessages(msgs);
    setAlert(act);
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
        const updated = await listMessages();
        setMessages(updated);
        setSelectedMsg(updated.find(m => m.id === threadId) || null);
      }
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const TABS = [
    { id: "inbox", label: "Inbox" },
    { id: "announce", label: "Post Announcement" },
    { id: "alert", label: "🚨 Alert" },
  ];

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
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#fff" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}` }}>
            {t.label}
            {t.id === "inbox" && messages && messages.length > 0 && (
              <span style={{ background: POA.accentSoft, color: POA.accent, borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{messages.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* INBOX */}
      {tab === "inbox" && (
        <div>
          {!messages ? <Spinner /> : messages.length === 0 ? (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No messages from members yet.</div></Card>
          ) : selectedMsg ? (
            <div>
              <button onClick={() => setSelectedMsg(null)} style={{ ...PS.btn, marginBottom: 16 }}><ArrowLeft size={13} /> Inbox</button>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary, marginBottom: 4 }}>{selectedMsg.subject}</div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 10 }}>
                  From {selectedMsg.sender?.full_name || "Member"} · {fmtDate(selectedMsg.created_at)}
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
                <button style={{ ...PS.btnPrimary, marginTop: 8 }} disabled={busy || !replyText[selectedMsg.id]?.trim()} onClick={() => doReply(selectedMsg.id)}>
                  <Send size={14} /> Send reply
                </button>
              </div>
            </div>
          ) : (
            messages.map(m => (
              <Card key={m.id} style={{ cursor: "pointer" }} onClick={() => setSelectedMsg(m)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{m.subject || "Message"}</div>
                    <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                      {m.sender?.full_name || "Member"} · {fmtDate(m.created_at)}
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

  async function load() {
    const [ann, msgs] = await Promise.all([listAnnouncements(), listMessages()]);
    setAnnouncements(ann);
    setMessages(msgs.filter(m => m.member_id === me.id));
  }
  useEffect(() => { load(); }, [me.id]);

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
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSent(false); setErr(''); }}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? '#fff' : POA.btnText, border: tab === t.id ? 'none' : `0.5px solid ${POA.btnBorder}` }}>
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
  const [narrative, setNarrative] = useState("");
  const [savedNarrative, setSavedNarrative] = useState("");
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [aiBusy, setAiBusy]     = useState(false);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState("");

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
    // For now save to localStorage — will move to DB in next iteration
    const key = `narrative_${activeStart}_${activeEnd}`;
    localStorage.setItem(key, narrative);
    setSavedNarrative(narrative);
    setEditingNarrative(false);
    setBusy(false);
  }

  // Load saved narrative when period changes
  useEffect(() => {
    const key = `narrative_${activeStart}_${activeEnd}`;
    const saved = localStorage.getItem(key) || "";
    setSavedNarrative(saved);
    setNarrative(saved);
    setEditingNarrative(false);
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

      {/* Period selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => { setPeriod(i); setShowCustom(false); }}
            style={{ ...PS.btn, background: !showCustom && period === i ? POA.accent : POA.btnBg, color: !showCustom && period === i ? "#fff" : POA.btnText, border: !showCustom && period === i ? "none" : `0.5px solid ${POA.btnBorder}` }}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setShowCustom(true)}
          style={{ ...PS.btn, background: showCustom ? POA.accent : POA.btnBg, color: showCustom ? "#fff" : POA.btnText, border: showCustom ? "none" : `0.5px solid ${POA.btnBorder}` }}>
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
                  <button style={PS.btnPrimary} disabled={busy} onClick={saveNarrative}>
                    {busy ? "Saving…" : "File narrative"}
                  </button>
                  <button style={{ ...PS.btn }} disabled={aiBusy} onClick={draftNarrative}>
                    <Sparkles size={13} /> {aiBusy ? "Drafting…" : "Draft with AI"}
                  </button>
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
                <button style={{ ...PS.btn, marginTop: 12 }} onClick={() => setEditingNarrative(true)}>
                  <Pencil size={12} /> Edit narrative
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.6, marginBottom: 14 }}>
                  No narrative filed yet. Write a 2-3 sentence summary of what this period meant — or let AI draft from the numbers above.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={PS.btnPrimary} onClick={() => setEditingNarrative(true)}>
                    <FileText size={14} /> Write narrative
                  </button>
                  <button style={PS.btn} disabled={aiBusy} onClick={draftNarrative}>
                    <Sparkles size={13} /> {aiBusy ? "Drafting…" : "Draft with AI"}
                  </button>
                </div>
              </>
            )}
          </Card>

          <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 16, lineHeight: 1.6, fontStyle: "italic" }}>
            All numbers pull from your association's live records — meetings, attendance, causes, correspondence. Nothing is fabricated. If data isn't recorded, it shows as —.
          </div>
        </>
      )}
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
async function callClaudeAI(systemPrompt, userContent) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, content: userContent }),
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
  const [newCat, setNewCat]     = useState({ label: "", color: "#9B6BE6", default_text: "" });
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
      setNewCat({ label: "", color: "#9B6BE6", default_text: "" });
      setShowAddCat(false);
      await loadAll();
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doAddVideo() {
    if (!newVid.title.trim() || !newVid.vimeo_url.trim()) { setErr("Title and Vimeo URL required."); return; }
    setBusy(true); setErr("");
    try {
      await addVideo({
        department_id: me.department_id,
        title: newVid.title.trim(),
        description: newVid.description.trim() || null,
        vimeo_url: newVid.vimeo_url.trim(),
        series_name: newVid.series_name.trim() || null,
        posted_by: me.id,
      });
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
                  <div key={i} style={{ minHeight: 64, background: isToday(d) ? "rgba(155,107,230,.12)" : "transparent", border: `0.5px solid ${isToday(d) ? POA.accent : POA.hairline}`, borderRadius: 7, padding: "4px 5px" }}>
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

function Fundraising({ me, org }) {
  const [tab, setTab]         = useState("planner");
  const [log, setLog]         = useState([]);
  const [drafts, setDrafts]   = useState([]);
  const [openDraft, setOpenDraft] = useState(null);
  const [addingLog, setAddingLog] = useState(false);
  const [ln, setLn]           = useState("");
  const [ld, setLd]           = useState("");
  const [la, setLa]           = useState("");
  const [detail, setDetail]   = useState("");
  const [goalAmt, setGoalAmt] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [out, setOut]         = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  const totalRaised = log.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const IDEA_BANK = [
    { title: "Golf scramble", desc: "Strong sponsor tie-ins and bigger checks. Great for annual events." },
    { title: "Fundraising dinner / banquet", desc: "Ticket sales + sponsor tables. The association's signature annual event." },
    { title: "PAC fundraiser", desc: "Political action committee fundraising within state regulations." },
    { title: "Memorial / honor event", desc: "5K, golf, or dinner honoring fallen or retired officers." },
    { title: "Community raffle", desc: "Check your state's raffle rules. Strong earner with low overhead." },
    { title: "Charity auction", desc: "Live or silent — experiences and donated items work well." },
    { title: "Poker run / motorcycle event", desc: "Member engagement + community visibility." },
    { title: "Sporting clays / shooting event", desc: "Popular with first-responder community and sponsors." },
    { title: "Concert or comedy night", desc: "Ticket sales + bar — works well with a local venue partner." },
    { title: "Fill-the-boot / roadside drive", desc: "Visible, low-cost, quick to organize." },
  ];

  async function loadAll() {
    const [l, d] = await Promise.all([
      listFundraiserLog(),
      listAIOutputs("fundraiser"),
    ]);
    setLog(l); setDrafts(d);
  }
  useEffect(() => { loadAll(); }, []);

  async function doGenerate() {
    if (!detail.trim()) { setErr("Tell us about the fundraiser first."); return; }
    setLoading(true); setErr(""); setOut("");
    const sys = `You help a police officers' association plan a fundraiser. Given their event idea, return a practical plain-text plan the association board can actually run: a one-line goal, a simple timeline/checklist, the roles needed, a few promotion steps, and a realistic money target. Then the most important part — an in-depth Sponsorship Packages section tailored to THIS specific event: three or four headline tiers (Title/Presenting, Gold, Silver, Bronze) each with a suggested dollar amount and exactly what that sponsor gets. An a-la-carte list of individual sponsorship items with suggested prices. One short ready-to-send outreach line the association can text or email to a local business. Keep dollar amounts realistic. Use clear short headings and dash bullets. Aim for 450-650 words.`;
    const user = `Association: ${org?.name || "Police Officers' Association"}\nEvent idea: ${detail}\nGoal amount: ${goalAmt || "not specified"}\nTarget date: ${targetDate || "flexible"}\nToday's date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
    try {
      const t = await callClaudeAI(sys, user);
      setOut(t);
      setSaveTitle(detail.trim().slice(0, 60));
    } catch(e) { setErr("AI planning failed. Check ANTHROPIC_API_KEY in Vercel."); }
    finally { setLoading(false); }
  }

  async function doSaveDraft() {
    if (!out || !saveTitle.trim()) return;
    setSaving(true);
    try {
      await saveAIDraft({
        department_id: me.department_id,
        feature: "fundraiser",
        title: saveTitle.trim(),
        ai_text: out,
        created_by: me.id,
      });
      await loadAll();
      setOut(""); setDetail(""); setGoalAmt(""); setTargetDate(""); setSaveTitle("");
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function doAddLog() {
    if (!ln.trim()) return;
    try {
      await addFundraiserLog({
        department_id: me.department_id,
        name: ln.trim(),
        event_when: ld.trim() || null,
        amount: Number(String(la).replace(/[^0-9.]/g, "")) || 0,
        created_by: me.id,
      });
      setLn(""); setLd(""); setLa(""); setAddingLog(false);
      await loadAll();
    } catch(e) { setErr(e.message); }
  }

  async function doRemoveLog(id) {
    if (!confirm("Remove this entry?")) return;
    try { await removeFundraiserLog(id); await loadAll(); }
    catch(e) { setErr(e.message); }
  }

  async function doDeleteDraft(id) {
    if (!confirm("Delete this draft?")) return;
    try { await deleteAIDraft(id); await loadAll(); }
    catch(e) { setErr(e.message); }
  }

  const TABS = [
    { id: "planner", label: "Fundraiser Planner" },
    { id: "log", label: "Fundraiser Log" },
    { id: "drafts", label: `Saved Drafts${drafts.length ? ` (${drafts.length})` : ""}` },
  ];

  return (
    <div>
      <PageTitle sub="Plan fundraisers, write the appeals, line up sponsors">Fundraising</PageTitle>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setOpenDraft(null); }}
            style={{ ...PS.btn, background: tab === t.id ? POA.accent : POA.btnBg, color: tab === t.id ? "#fff" : POA.btnText, border: tab === t.id ? "none" : `0.5px solid ${POA.btnBorder}` }}>
            {t.label}
          </button>
        ))}
      </div>
      <ErrBox msg={err} />

      {/* PLANNER */}
      {tab === "planner" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${POA.accent}`, borderRadius: "0 14px 14px 0", marginBottom: 16 }}>
            <SectionTitle>Fundraiser Planner</SectionTitle>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Tell us about it</div>
              <textarea value={detail} onChange={e => setDetail(e.target.value)}
                placeholder="e.g. A golf scramble to raise money for the legal defense fund and officer scholarships."
                style={{ ...PS.textarea, minHeight: 80 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Goal amount</div>
                <input value={goalAmt} onChange={e => setGoalAmt(e.target.value)} style={PS.input} placeholder="$10,000" />
              </div>
              <div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Target date</div>
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={PS.input} />
              </div>
            </div>
            <button style={PS.btnPrimary} disabled={loading || !detail.trim()} onClick={doGenerate}>
              <Sparkles size={14} /> {loading ? "Building the plan…" : "Get a plan + sponsorship packages"}
            </button>
          </Card>

          {out && (
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionTitle>Your fundraiser plan</SectionTitle>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={PS.btn} onClick={() => navigator.clipboard.writeText(out)}>Copy</button>
                  <button style={{ ...PS.btnPrimary }} disabled={saving} onClick={doSaveDraft}>
                    {saving ? "Saving…" : "Save draft"}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{out}</div>
              <div style={{ fontSize: 11.5, color: POA.textMuted, marginTop: 12, fontStyle: "italic" }}>AI drafts the plan — your board runs it. Review before sharing.</div>
            </Card>
          )}

          <SectionTitle>Event ideas</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {IDEA_BANK.map(idea => (
              <div key={idea.title} style={{ ...PS.card, padding: "13px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: POA.textPrimary, marginBottom: 4 }}>{idea.title}</div>
                <div style={{ fontSize: 12, color: POA.textMuted, lineHeight: 1.45, marginBottom: 10 }}>{idea.desc}</div>
                <button style={{ ...PS.btn, width: "100%", justifyContent: "center" }}
                  onClick={() => { setDetail(`A ${idea.title.toLowerCase()} to raise money for the association.`); setTab("planner"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <Sparkles size={12} /> Plan this
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FUNDRAISER LOG */}
      {tab === "log" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: POA.textPrimary }}>Recent fundraisers</div>
              <div style={{ fontSize: 13, color: POA.textMuted, marginTop: 2 }}>What you've run and what it brought in.</div>
            </div>
            <button style={PS.btn} onClick={() => setAddingLog(!addingLog)}><Plus size={13} /> Log one</button>
          </div>

          {addingLog && (
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>Log a fundraiser</SectionTitle>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Event name</div>
                <input value={ln} onChange={e => setLn(e.target.value)} style={PS.input} placeholder="e.g. Annual Golf Scramble" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>When</div>
                  <input value={ld} onChange={e => setLd(e.target.value)} style={PS.input} placeholder="e.g. June 2026" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Amount raised</div>
                  <input value={la} onChange={e => setLa(e.target.value)} style={PS.input} placeholder="$12,500" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={PS.btnPrimary} disabled={!ln.trim()} onClick={doAddLog}>Save</button>
                <button style={PS.btn} onClick={() => setAddingLog(false)}>Cancel</button>
              </div>
            </Card>
          )}

          {log.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: POA.textMuted }}>Total tracked</div>
                <div style={{ fontWeight: 700, color: POA.green, fontSize: 15 }}>${totalRaised.toLocaleString()}</div>
              </div>
            </Card>
          )}

          {log.length === 0 && !addingLog && (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>Nothing logged yet. Add a fundraiser to start tracking.</div></Card>
          )}
          {log.map(e => (
            <Card key={e.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                    {e.event_when || "Recent"}{e.amount > 0 ? ` · $${Number(e.amount).toLocaleString()} raised` : ""}
                  </div>
                </div>
                <button style={{ ...PS.btn, color: POA.red, fontSize: 12 }} onClick={() => doRemoveLog(e.id)}>Remove</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* SAVED DRAFTS */}
      {tab === "drafts" && (
        <div>
          {drafts.length === 0 && (
            <Card><div style={{ color: POA.textMuted, fontSize: 13.5 }}>No saved drafts yet. Generate a plan and save it.</div></Card>
          )}
          {openDraft ? (
            <div>
              <button onClick={() => setOpenDraft(null)} style={{ ...PS.btn, marginBottom: 14 }}><ArrowLeft size={13} /> All drafts</button>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 16, color: POA.textPrimary, marginBottom: 4 }}>{openDraft.title}</div>
                <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 14 }}>{fmtDate(openDraft.created_at)}</div>
                <div style={{ fontSize: 13.5, color: POA.textSecondary, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{openDraft.ai_text}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button style={PS.btn} onClick={() => navigator.clipboard.writeText(openDraft.ai_text)}>Copy</button>
                  <button style={{ ...PS.btn, color: POA.red }} onClick={() => { doDeleteDraft(openDraft.id); setOpenDraft(null); }}>Delete</button>
                </div>
              </Card>
            </div>
          ) : (
            drafts.map(d => (
              <Card key={d.id} style={{ cursor: "pointer" }} onClick={() => setOpenDraft(d)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: POA.textPrimary }}>{d.title}</div>
                    <div style={{ fontSize: 12, color: POA.textMuted, marginTop: 2 }}>
                      {d.members?.full_name || "Board"} · {fmtDate(d.created_at)}
                    </div>
                  </div>
                  <ChevronRight size={15} color={POA.textMuted} />
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SCREEN ROUTER
   ================================================================ */
function renderScreen(view, { me, org, setView }) {
  if (view.startsWith("m_")) {
    switch (view) {
      case "m_dash":     return <MemberDash me={me} org={org} setView={setView} />;
      case "m_call":     return <WhoToCall org={org} />;
      case "m_ask":      return <AskB4C me={me} org={org} />;
      case "m_card":     return <MyCard me={me} org={org} />;
      case "m_events":   return <MemberEvents />;
      case "m_partners": return <TrustedPartners />;
      case "m_value":    return <MyValue me={me} />;
      case "m_benefits": return <Benefits me={me} />;
      case "m_vote":     return <VoteLink />;
      case "m_store":    return <Store />;
      case "m_correspondence": return <MemberCorrespondence me={me} />;
      default:           return <ComingSoon label={view} />;
    }
  }
  switch (view) {
    case "b_dash":          return <BoardDash me={me} org={org} />;
    case "b_meetings":      return <AgendaMinutes me={me} />;
    case "b_causes":        return <CausesBoard me={me} />;
    case "b_members":       return <MembersBoard me={me} />;
    case "b_attendance":    return <MeetingAttendance me={me} />;
    case "b_stipend":       return <ComingSoon label="Stipend Log" />;
    case "b_fundraising":   return <Fundraising me={me} org={org} />;
    case "b_social":        return <SocialMedia me={me} org={org} />;
    case "b_building":      return <POABuilding me={me} org={org} />;
    case "b_continuity":    return <BoardContinuity me={me} />;
    case "b_correspondence":return <BoardCorrespondence me={me} />;
    case "b_ledger":        return <ValueLedger me={me} />;
    case "pa_dash":         return <PADash />;
    case "pa_orgs":         return <PADash />;
    case "pa_config":       return <PAOrgConfig />;
    case "pa_add":          return <PAAddOrg />;
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
  const [view, setView]         = useState(null); // null = use default for role
  const [sideOpen, setSideOpen] = useState(false);
  const [viewAs, setViewAs]     = useState(null); // 'board' | 'member' — board users can preview the member view; null = role default
  const [features, setFeatures] = useState({});
  const [orgSettings, setOrgSettings] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(undefined); return; }
    getMe().then(m => { setMe(m); setView(null); }).catch(() => setMe(null));
  }, [session]);

  useEffect(() => {
    if (me?.id) {
      getMyOrg().then(setOrg).catch(() => null);
      getOrgFeatures().then(setFeatures).catch(() => null);
      getOrgSettings().then(setOrgSettings).catch(() => null);
    }
  }, [me]);

  // which console to show — board users can toggle to preview the member view (viewAs); null = role default
  const curViewAs  = me ? (viewAs || (isBoard(me.access) ? "board" : "member")) : null;
  const isPA = me ? hasAny(me.access, ["ProjectAdmin"]) : false;
  const activeView = view || (me ? (isPA ? "pa_dash" : curViewAs === "board" ? "b_dash" : "m_dash") : null);

  // build dynamic nav from org_features
  const filteredMemberNav = MEMBER_NAV.filter(n => features[n.id] !== false);
  const filteredBoardNav  = BOARD_NAV.filter(n => features[n.id] !== false);
  // PA gets the board nav here; the PA_NAV section is rendered separately below the divider
  const nav = !me ? [] : (isPA || curViewAs === "board") ? filteredBoardNav : filteredMemberNav;

  if (!ready) return <Loading />;
  if (!session) return <Login />;
  if (me === undefined) return <Loading />;
  if (me === null) return <NotOnRoster session={session} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: POA.pageBg, fontFamily: "'Inter', system-ui, sans-serif", color: POA.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 0; }
        .nav-item:hover { background: rgba(155,107,230,.08) !important; }
      `}</style>

      {/* ---- Sidebar ---- */}
      <aside style={{
        width: 220, flexShrink: 0, background: POA.sidebar,
        borderRight: `0.5px solid ${POA.hairline}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        {/* Brand */}
        <div style={{ padding: "22px 18px 16px", borderBottom: `0.5px solid ${POA.hairline}` }}>
          <div style={{ fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: POA.accent, fontWeight: 700, marginBottom: 3 }}>Before the Call</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: POA.textPrimary }}>{org?.name || "POA"}</div>
          <div style={{ fontSize: 11, color: POA.textMuted }}>{orgSettings.org_short_name || ""}</div>
          <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 2 }}>{curViewAs === "board" ? "Board Console" : "Member Hub"}</div>
        </div>

        {/* View-as toggle — board users can preview the member experience */}
        {isBoard(me.access) && (
          <div style={{ padding: "12px 14px", borderBottom: `0.5px solid ${POA.hairline}`, display: "flex", gap: 6 }}>
            {[
              { key: "member", label: "Member" },
              { key: "board",  label: "Board" },
            ].map(opt => {
              const on = curViewAs === opt.key;
              return (
                <button key={opt.key}
                  onClick={() => { setViewAs(opt.key); setView(null); setSideOpen(false); }}
                  style={{ flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", borderRadius: 8, border: `0.5px solid ${on ? POA.accent : POA.btnBorder}`, background: on ? POA.accent : "transparent", color: on ? POA.white : POA.navLabel }}>
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
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: on ? 600 : 400, color: on ? POA.white : POA.navLabel, background: on ? POA.accent : "transparent", marginBottom: 2, textAlign: "left", borderLeft: on ? `3px solid ${POA.accentBright}` : "3px solid transparent" }}>
                <Icon size={16} style={{ flexShrink: 0, opacity: on ? 1 : 0.7 }} />
                {label}
              </button>
            );
          })}
          {isPA && (
            <>
              <div style={{ margin: "12px 0 6px", padding: "0 10px", fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: POA.accentDim }}>
                Project Admin
              </div>
              {PA_NAV.map(({ id, label, Icon }) => {
                const on = activeView === id;
                return (
                  <button key={id} className="nav-item" onClick={() => { setView(id); setSideOpen(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: on ? 600 : 400, color: on ? POA.white : POA.navLabel, background: on ? POA.accent : "transparent", marginBottom: 2, textAlign: "left", borderLeft: on ? `3px solid ${POA.accentBright}` : "3px solid transparent" }}>
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
          <button onClick={() => supabase.auth.signOut()}
            style={{ ...PS.btn, width: "100%", justifyContent: "center" }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* ---- Main content ---- */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 36px", maxWidth: 860 }}>
        {renderScreen(activeView, { me, org, setView })}
      </main>
    </div>
  );
}

/* ================================================================
   LOGIN
   ================================================================ */
function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);

  async function send() {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: POA.pageBg, display: "grid", placeItems: "center", padding: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } body { margin: 0; }`}</style>
      <div style={{ background: POA.card, border: `0.5px solid ${POA.hairline}`, borderRadius: 18, padding: "36px 32px", width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}>
        <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: POA.accent, fontWeight: 700, marginBottom: 10 }}>Before the Call · POA</div>
        <h1 style={{ fontFamily: "inherit", fontSize: 26, fontWeight: 700, color: POA.textPrimary, margin: "0 0 8px" }}>Your association, in one place.</h1>
        <p style={{ fontSize: 13.5, color: POA.textMuted, lineHeight: 1.6, margin: "0 0 22px" }}>Sign in with your association email — no password needed. We'll send you a one-tap login link.</p>
        {err && <ErrBox msg={err} />}
        {sent ? (
          <div style={{ background: "rgba(70,199,147,.1)", border: "0.5px solid rgba(70,199,147,.3)", borderRadius: 11, padding: "14px 16px", fontSize: 13.5, color: POA.greenText, lineHeight: 1.55 }}>
            Check your email — login link sent to <strong>{email}</strong>. Open it on this device.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 6 }}>Association email</div>
            <input type="email" value={email} placeholder="you@department.org" style={{ ...PS.input, marginBottom: 12 }}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && email && send()} />
            <button style={{ ...PS.btnPrimary, width: "100%" }} disabled={!email || busy} onClick={send}>
              {busy ? "Sending…" : "Send login link"}
            </button>
            <div style={{ fontSize: 11.5, color: POA.textMuted, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
              Only emails on your association's roster can sign in.
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
