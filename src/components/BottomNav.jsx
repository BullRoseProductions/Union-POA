const I = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  meetings: <><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M4 9h16M8 2v4M16 2v4M8 14h6" /></>,
  actions: <><path d="M9 11l3 3 8-8" /><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" /></>,
  profile: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
}
const TABS = [['home', 'Home'], ['meetings', 'Meetings'], ['actions', 'My Actions'], ['profile', 'Profile']]

export default function BottomNav({ tab, setTab }) {
  const active = tab === 'meeting' ? 'meetings' : tab
  return (
    <nav className="bnav">
      {TABS.map(([id, label]) => (
        <button key={id} className={active === id ? 'on' : ''} onClick={() => setTab(id)}>
          <svg viewBox="0 0 24 24">{I[id]}</svg>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
