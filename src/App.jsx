import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import * as api from './lib/api'
import PhoneFrame from './components/PhoneFrame'
import BottomNav from './components/BottomNav'
import SignIn from './components/SignIn'
import Home from './screens/Home'
import Meetings from './screens/Meetings'
import MeetingDetail from './screens/MeetingDetail'
import ActionItems from './screens/ActionItems'
import Profile from './screens/Profile'

export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [me, setMe] = useState(undefined) // undefined = loading, null = no member row
  const [tab, setTab] = useState('home')
  const [meetingId, setMeetingId] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setMe(undefined); return }
    api.getMe().then(setMe).catch(() => setMe(null))
  }, [session])

  if (!ready) return <PhoneFrame><div className="loading">Loading…</div></PhoneFrame>
  if (!session) return <PhoneFrame><SignIn /></PhoneFrame>
  if (me === undefined) return <PhoneFrame><div className="loading">Loading…</div></PhoneFrame>
  if (me === null) return (
    <PhoneFrame>
      <div className="signin screen">
        <div className="brand"><b>Before the Call</b><span className="badge">POA</span></div>
        <h1>We don't recognize this email.</h1>
        <p>{session.user.email} isn't on an association roster yet. Ask your board to add you, then sign in again.</p>
        <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </PhoneFrame>
  )

  function openMeeting(id) { setMeetingId(id); setTab('meeting') }
  function navigate(t) { setMeetingId(null); setTab(t) }

  const screens = {
    home: <Home me={me} onOpenMeeting={openMeeting} go={navigate} />,
    meetings: <Meetings onOpen={openMeeting} />,
    meeting: <MeetingDetail id={meetingId} me={me} back={() => navigate('meetings')} />,
    actions: <ActionItems me={me} />,
    profile: <Profile me={me} />,
  }

  return (
    <PhoneFrame>
      <div className="screen-wrap">{screens[tab] || screens.home}</div>
      <BottomNav tab={tab} setTab={navigate} />
    </PhoneFrame>
  )
}
