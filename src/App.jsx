import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Phone, MessageSquare, Handshake, TrendingUp, Shield,
  Calendar, CreditCard, Vote, ShoppingBag, AlertTriangle, Bell,
  CalendarCheck, ClipboardList, DollarSign, Heart, Megaphone,
  BookOpen, Mail, Users, BarChart3, LogOut, Menu, X, ChevronRight,
  Sparkles, CheckCircle2, Clock, Loader2, Send, Building2,
  Plus, Pencil, Trash2, ArrowLeft, RefreshCw, FileText, QrCode,
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
];

const BOARD_NAV = [
  { id: "b_dash",         label: "Dashboard",        Icon: LayoutDashboard },
  { id: "b_attendance",   label: "Meeting Attendance",Icon: CalendarCheck },
  { id: "b_meetings",     label: "Agenda & Minutes",  Icon: ClipboardList },
  { id: "b_stipend",      label: "Stipend Log",       Icon: DollarSign },
  { id: "b_causes",       label: "Causes",            Icon: Heart },
  { id: "b_fundraising",  label: "Fundraising",       Icon: Megaphone },
  { id: "b_social",       label: "Social & Media",    Icon: BarChart3 },
  { id: "b_continuity",   label: "Board Continuity",  Icon: BookOpen },
  { id: "b_correspondence",label: "Correspondence",   Icon: Mail },
  { id: "b_members",      label: "Members",           Icon: Users },
  { id: "b_ledger",       label: "Value Ledger",      Icon: TrendingUp },
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
function MemberDash({ me, org, setView }) {
  const [next, setNext] = useState(null);
  const [openCount, setOpenCount] = useState(null);
  useEffect(() => {
    listMeetings().then(ms => setNext(ms.filter(m => m.status === "open")[0] || null));
    myActionItems(me.id).then(items => setOpenCount(items.filter(i => i.status === "open").length));
  }, [me.id]);

  const first = me.full_name?.split(" ").slice(-1)[0] || me.full_name;
  return (
    <div>
      {/* Critical incident banner — always visible */}
      <div style={{ background: "rgba(239,106,100,.08)", border: `0.5px solid rgba(239,106,100,.3)`, borderRadius: 12, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
        <AlertTriangle size={16} color={POA.red} />
        <div style={{ flex: 1, fontSize: 13 }}><span style={{ fontWeight: 700, color: POA.redText }}>No active incidents.</span> <span style={{ color: POA.textMuted }}>Your board will post here if something needs your attention.</span></div>
      </div>

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
    .select("*, event_attendance(member_id, checked_in_at)")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return data || [];
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
    title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all", attendance_mode: "qr", assign_all: true,
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
      await createEvent({
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
      setAdding(false);
      setNewEvt({ title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all", attendance_mode: "qr", assign_all: true });
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
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: detail.done ? "rgba(70,199,147,.14)" : POA.accentSoft, color: detail.done ? POA.green : POA.accent }}>
            {detail.done ? "Done" : "Open"}
          </span>
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
          <p style={{ ...PS.kicker, marginBottom: 10 }}>Attendance roll ({att.length} / {members.length})</p>
          <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 10 }}>
            {manage && !detail.done ? "Tap a name to toggle — or use the QR code above for self-serve." : "Attendance record."}
          </div>
          {members.map(m => {
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
            <div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Who's invited</div>
              <select value={newEvt.assign_all ? "all" : "specific"} onChange={e => setNewEvt({ ...newEvt, assign_all: e.target.value === "all" })} style={PS.input}>
                <option value="all">All members</option>
                <option value="specific">Specific members</option>
              </select>
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
                  {(e.event_attendance || []).length} / {members.length}
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
      case "m_partners": return <ComingSoon label="Trusted Partners" />;
      case "m_value":    return <ComingSoon label="My Value" />;
      case "m_benefits": return <ComingSoon label="Benefits" />;
      case "m_vote":     return <ComingSoon label="VoteLink" />;
      case "m_store":    return <ComingSoon label="Store" />;
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
    case "b_fundraising":   return <ComingSoon label="Fundraising" />;
    case "b_social":        return <ComingSoon label="Social & Media" />;
    case "b_continuity":    return <ComingSoon label="Board Continuity" />;
    case "b_correspondence":return <ComingSoon label="Correspondence" />;
    case "b_ledger":        return <ComingSoon label="Value Ledger" />;
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
    if (me?.id) getMyOrg().then(setOrg).catch(() => null);
  }, [me]);

  // default view by role
  const activeView = view || (me ? (isBoard(me.access) ? "b_dash" : "m_dash") : null);
  const nav        = me ? (isBoard(me.access) ? BOARD_NAV : MEMBER_NAV) : [];

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
          <div style={{ fontSize: 11, color: POA.textMuted, marginTop: 2 }}>{isBoard(me.access) ? "Board Console" : "Member Hub"}</div>
        </div>

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
