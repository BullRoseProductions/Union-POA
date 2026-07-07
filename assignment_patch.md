# Assignment patch — apply to src/App.jsx

## Step 1 — Add two new data functions after listEvents()

Add these two functions right after the `listEvents` async function:

```javascript
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
```

---

## Step 2 — Update listEvents() to include assignments + new columns

FIND:
```javascript
async function listEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*, event_attendance(member_id, checked_in_at)")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return data || [];
}
```

REPLACE WITH:
```javascript
async function listEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*, event_attendance(member_id, checked_in_at), event_assignments(member_id)")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return data || [];
}
```

---

## Step 3 — Update newEvt state to include assignment fields

FIND:
```javascript
const [newEvt, setNewEvt] = useState({
    title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all",
  });
```

REPLACE WITH:
```javascript
const [newEvt, setNewEvt] = useState({
    title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "",
    visibility: "all", attendance_mode: "qr", assign_all: true, assigned_ids: [],
  });
```

---

## Step 4 — Update doCreate() to save new fields + call updateEventAssignments

FIND:
```javascript
      await createEvent({
        department_id: me.department_id,
        title: newEvt.title.trim(),
        kind: newEvt.kind,
        event_date: newEvt.event_date,
        event_time: newEvt.event_time || null,
        location: newEvt.location.trim() || null,
        notes: newEvt.notes.trim() || null,
        visibility: newEvt.visibility,
        created_by: me.id,
      });
```

REPLACE WITH:
```javascript
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
```

---

## Step 5 — Update the reset after create

FIND:
```javascript
setNewEvt({ title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all" });
```

REPLACE WITH:
```javascript
setNewEvt({ title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all", attendance_mode: "qr", assign_all: true, assigned_ids: [] });
```

---

## Step 6 — Add attendance mode + assignment UI to the add event form

FIND the closing div after the visibility selector in the add event form:
```javascript
            </div>
          </div>
          <ErrBox msg={err} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doCreate}>{busy ? "Saving…" : "Save event"}</button>
            <button style={PS.btn} onClick={() => { setAdding(false); setErr(""); }}>Cancel</button>
          </div>
```

REPLACE WITH:
```javascript
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
          </div>
          <ErrBox msg={err} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={PS.btnPrimary} disabled={busy} onClick={doCreate}>{busy ? "Saving…" : "Save event"}</button>
            <button style={PS.btn} onClick={() => { setAdding(false); setErr(""); }}>Cancel</button>
          </div>
```

---

## Step 7 — Update the attendance detail panel to respect assignment + attendance_mode

FIND in the detail panel where the QR sign-in section starts:
```javascript
        {/* ---- QR sign-in panel (board only, event not done) ---- */}
        {manage && !detail.done && (
```

REPLACE WITH:
```javascript
        {/* ---- QR sign-in panel (board only, event not done, mode=qr) ---- */}
        {manage && !detail.done && detail.attendance_mode === "qr" && (
```

---

## Step 8 — Update the attendance roll to filter by assignment

FIND:
```javascript
          {members.map(m => {
            const present = att.some(a => a.member_id === m.id);
            return (
```

REPLACE WITH:
```javascript
          {(detail.assign_all
            ? members
            : members.filter(m => (detail.event_assignments || []).some(a => a.member_id === m.id))
          ).map(m => {
            const present = att.some(a => a.member_id === m.id);
            return (
```

Also update the roll header count — FIND:
```javascript
          <p style={{ ...PS.kicker, marginBottom: 10 }}>Attendance roll ({att.length} / {members.length})</p>
```
REPLACE WITH:
```javascript
          {(() => {
            const roster = detail.assign_all ? members : members.filter(m => (detail.event_assignments || []).some(a => a.member_id === m.id));
            return <p style={{ ...PS.kicker, marginBottom: 10 }}>Attendance roll ({att.length} / {roster.length}){detail.assign_all ? "" : " · assigned only"}</p>;
          })()}
```

---

## Step 9 — Show attendance_mode badge on the detail panel header

FIND the detail panel status badge:
```javascript
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: detail.done ? "rgba(70,199,147,.14)" : POA.accentSoft, color: detail.done ? POA.green : POA.accent }}>
            {detail.done ? "Done" : "Open"}
          </span>
```

REPLACE WITH:
```javascript
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: detail.done ? "rgba(70,199,147,.14)" : POA.accentSoft, color: detail.done ? POA.green : POA.accent }}>
              {detail.done ? "Done" : "Open"}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: POA.track, color: POA.textMuted }}>
              {detail.attendance_mode === "qr" ? "QR" : detail.attendance_mode === "manual" ? "Manual" : "No tracking"}
            </span>
          </div>
```

---

## Step 10 — Update the upcoming list count to use assigned roster

FIND:
```javascript
                <div style={{ fontSize: 12, color: POA.textMuted }}>
                  {(e.event_attendance || []).length} / {members.length}
                </div>
```

REPLACE WITH:
```javascript
                <div style={{ fontSize: 12, color: POA.textMuted }}>
                  {(e.event_attendance || []).length} / {e.assign_all ? members.length : (e.event_assignments || []).length}
                </div>
```

---

## Final steps:
```
npm run build
git add -A && git commit -m "feat: per-event assignment + attendance mode (QR/manual/none)" && git push
```
