# Role-gating patch — apply to src/App.jsx

## 1. Replace the role constants block (lines 64-69)

FIND:
```
/* ---------- Role helpers (exact shape from fire) ---------- */
const hasAny = (rs, set) => Array.isArray(rs) && rs.some(r => set.includes(r));
const BOARD_ROLES   = ["Board", "DeptAdmin", "ProjectAdmin"];
const MANAGE_ROLES  = ["Board", "DeptAdmin", "Officer", "ProjectAdmin"];
const isBoard       = rs => hasAny(rs, BOARD_ROLES);
const canManage     = rs => hasAny(rs, MANAGE_ROLES);
```

REPLACE WITH:
```
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
```

---

## 2. Fix MemberEvents to only show visibility='all' events

FIND in MemberEvents function:
```
{meetings.filter(m => m.status === "open").map(m => (
```

REPLACE WITH:
```
{meetings.filter(m => m.visibility !== "board").map(m => (
```

Also FIND the empty state check:
```
{meetings.filter(m => m.status === "open").length === 0 && (
```
REPLACE WITH:
```
{meetings.filter(m => m.visibility !== "board").length === 0 && (
```

---

## 3. Fix CausesBoard — soft-archive instead of hard delete

In the CausesBoard remove() function, FIND:
```
async function remove() {
    if (!confirm("Delete this cause?")) return;
    await supabase.from("causes").delete().eq("id", detail.id);
    setDetail(null); await load();
  }
```

REPLACE WITH:
```
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
```

Also FIND the delete button in the edit form:
```
<button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }} onClick={remove}>Delete</button>
```
REPLACE WITH:
```
<button style={{ ...PS.btn, color: POA.red, marginLeft: "auto" }} onClick={remove}>
  {isDeptAdmin(me.access) ? "Delete" : "Archive"}
</button>
```

---

## 4. Add visibility selector to the Add Event form in MeetingAttendance

FIND in the newEvt state initialization:
```
const [newEvt, setNewEvt] = useState({
    title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "",
  });
```
REPLACE WITH:
```
const [newEvt, setNewEvt] = useState({
    title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all",
  });
```

FIND the kind select in the add event form:
```
<div>
              <div style={{ fontSize: 12, color: POA.textMuted, marginBottom: 4 }}>Type</div>
              <select value={newEvt.kind} onChange={e => setNewEvt({ ...newEvt, kind: e.target.value })} style={PS.input}>
                {["meeting","board","training","community","general","other"].map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
```
REPLACE WITH:
```
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
```

FIND in doCreate():
```
notes: newEvt.notes.trim() || null,
        created_by: me.id,
```
REPLACE WITH:
```
notes: newEvt.notes.trim() || null,
        visibility: newEvt.visibility,
        created_by: me.id,
```

Also reset visibility on cancel — FIND:
```
setNewEvt({ title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "" });
```
REPLACE WITH:
```
setNewEvt({ title: "", kind: "meeting", event_date: "", event_time: "", location: "", notes: "", visibility: "all" });
```

---

## 5. Members roster — DeptAdmin-only controls

In MembersBoard, FIND:
```
<PageTitle sub="Your association's full roster">Members</PageTitle>
```
REPLACE WITH:
```
<PageTitle sub={isDeptAdmin(me.access) ? "Full roster — you can add and edit members" : "Your association's full roster"}>Members</PageTitle>
```

---

## 6. Run the visibility migration in Supabase SQL Editor (separate step):
```sql
alter table events add column if not exists visibility text not null default 'all' check (visibility in ('all', 'board'));
```

---

After applying all patches:
npm run build
git add -A && git commit -m "feat: three-tier role gating (Member / Board / DeptAdmin)" && git push
