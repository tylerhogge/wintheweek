'use client'

import { useEffect, useRef } from 'react'

const REPLY_TEXT = "Launched the new onboarding flow, closed 3 enterprise deals, and shipped the mobile redesign 🚀"

export function DemoAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const restartRef = useRef<((scene: number) => void) | null>(null)

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = []
    const t = (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms)
      timeouts.push(id)
      return id
    }

    // Element refs
    const el = (id: string) => document.getElementById(id)

    function show(id: string) { const e = el(id); if (e) e.style.opacity = '1' }
    function hide(id: string) { const e = el(id); if (e) e.style.opacity = '0' }
    function addClass(id: string, cls: string) { el(id)?.classList.add(cls) }
    function removeClass(id: string, cls: string) { el(id)?.classList.remove(cls) }

    function reset() {
      // Phone
      hide('demo-notification')
      hide('demo-scene-email')
      hide('demo-scene-compose')
      hide('demo-scene-sent')
      hide('demo-phone-wrap')
      // Desktop
      hide('demo-desktop-wrap')
      // Profile
      hide('demo-profile-wrap')
      // Typing
      const typed = el('demo-typed')
      if (typed) typed.textContent = ''
      // Cursor
      const cursor = el('demo-cursor')
      if (cursor) cursor.style.opacity = '1'
      // Dots
      ;[0,1,2,3,4].forEach(i => {
        const d = el(`demo-dot-${i}`)
        if (d) { d.style.background = 'rgba(255,255,255,0.2)'; d.style.transform = 'scale(1)' }
      })
    }

    function setDot(active: number) {
      ;[0,1,2,3,4].forEach(i => {
        const d = el(`demo-dot-${i}`)
        if (!d) return
        d.style.background = i === active ? '#22c55e' : 'rgba(255,255,255,0.2)'
        d.style.transform = i === active ? 'scale(1.3)' : 'scale(1)'
      })
    }

    function typeText(text: string, targetId: string, onDone: () => void) {
      let i = 0
      const target = el(targetId)
      if (!target) { onDone(); return }
      function next() {
        if (i < text.length) {
          target!.textContent = text.slice(0, i + 1)
          i++
          const id = setTimeout(next, 38)
          timeouts.push(id)
        } else {
          onDone()
        }
      }
      next()
    }

    function playFromScene(scene: number) {
      timeouts.forEach(clearTimeout)
      timeouts = []
      reset()

      if (scene === 0) {
        // Scene 0: notification (visible ~3s)
        t(() => { show('demo-phone-wrap'); setDot(0) }, 300)
        t(() => { show('demo-notification') }, 800)
        t(() => { hide('demo-notification'); show('demo-scene-email'); setDot(1) }, 3800)
        // Scene 1: email open (visible ~3.2s)
        t(() => { hide('demo-scene-email'); show('demo-scene-compose'); setDot(2); startTyping() }, 7000)
      } else if (scene === 1) {
        // Scene 1: email open
        show('demo-phone-wrap'); setDot(1); show('demo-scene-email')
        t(() => { hide('demo-scene-email'); show('demo-scene-compose'); setDot(2); startTyping() }, 3000)
      } else if (scene === 2) {
        // Scene 2: compose + typing
        show('demo-phone-wrap'); setDot(2); show('demo-scene-compose')
        startTyping()
      } else if (scene === 3) {
        // Scene 3: dashboard → then profile
        show('demo-desktop-wrap'); setDot(3)
        t(() => { hide('demo-desktop-wrap'); show('demo-profile-wrap'); setDot(4) }, 5000)
        t(() => playFromScene(0), 10000)
      } else if (scene === 4) {
        // Scene 4: employee profile
        show('demo-profile-wrap'); setDot(4)
        t(() => playFromScene(0), 5000)
      }
    }

    function startTyping() {
      t(() => {
        typeText(REPLY_TEXT, 'demo-typed', () => {
          const cursor = el('demo-cursor')
          if (cursor) cursor.style.opacity = '0'
          t(() => { hide('demo-scene-compose'); show('demo-scene-sent'); setDot(3) }, 800)
          t(() => { hide('demo-phone-wrap'); show('demo-desktop-wrap') }, 1800)
          // Dashboard → Profile → Loop
          t(() => { hide('demo-desktop-wrap'); show('demo-profile-wrap'); setDot(4) }, 1800 + 5000)
          t(() => playFromScene(0), 1800 + 5000 + 5000)
        })
      }, 400)
    }

    function runLoop() { playFromScene(0) }

    restartRef.current = playFromScene
    runLoop()

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative flex justify-center items-center py-4" style={{ minHeight: 520 }}>

      {/* ── PHONE ── */}
      <div
        id="demo-phone-wrap"
        style={{
          opacity: 0,
          transition: 'opacity 0.4s ease',
          width: 260,
          position: 'relative',
        }}
      >
        {/* Phone shell */}
        <div style={{
          background: '#18181b',
          border: '2px solid rgba(255,255,255,0.12)',
          borderRadius: 36,
          padding: '12px 8px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Notch */}
          <div style={{ display:'flex', justifyContent:'center', marginBottom: 8 }}>
            <div style={{ width: 80, height: 6, background: '#27272a', borderRadius: 99 }} />
          </div>

          {/* Screen */}
          <div style={{ background: '#09090b', borderRadius: 24, overflow: 'hidden', position: 'relative', height: 400 }}>

            {/* Lock screen base */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg, #0f172a 0%, #09090b 60%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40,
            }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: '0.08em' }}>MONDAY 9:02 AM</p>
              <p style={{ color: '#fff', fontSize: 48, fontWeight: 700, lineHeight: 1 }}>9:02</p>
            </div>

            {/* Notification */}
            <div
              id="demo-notification"
              style={{
                opacity: 0,
                transition: 'opacity 0.3s ease, transform 0.4s cubic-bezier(.22,.68,0,1.2)',
                position: 'absolute', bottom: 20, left: 12, right: 12,
                background: 'rgba(30,30,34,0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 16,
                padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, background: '#22c55e', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 2 }}>WIN THE WEEK</p>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>What did you get done this week? 👊</p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Just hit reply to share your wins</p>
                </div>
              </div>
            </div>

            {/* Scene: Email open */}
            <div
              id="demo-scene-email"
              style={{
                opacity: 0,
                transition: 'opacity 0.3s ease',
                position: 'absolute', inset: 0,
                background: '#09090b',
                padding: '16px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, background: '#22c55e', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p style={{ color: '#fafafa', fontSize: 12, fontWeight: 600 }}>Win The Week</p>
                  <p style={{ color: '#71717a', fontSize: 10 }}>hello@wintheweek.co</p>
                </div>
              </div>
              <p style={{ color: '#fafafa', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>What did you get done this week? 👊</p>
              <p style={{ color: '#a1a1aa', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>Hey Alex,</p>
              <p style={{ color: '#a1a1aa', fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>What did you accomplish this week? Big or small — we want to hear it.</p>
              <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ color: '#a1a1aa', fontSize: 11 }}>👆 <strong style={{ color: '#fafafa' }}>Just hit Reply</strong> — no login needed</p>
              </div>
            </div>

            {/* Scene: Compose */}
            <div
              id="demo-scene-compose"
              style={{
                opacity: 0,
                transition: 'opacity 0.3s ease',
                position: 'absolute', inset: 0,
                background: '#09090b',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ color: '#71717a', fontSize: 11, marginBottom: 2 }}>To: hello@wintheweek.co</p>
                <p style={{ color: '#71717a', fontSize: 11 }}>Re: What did you get done this week?</p>
              </div>
              <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden' }}>
                <span id="demo-typed" style={{ color: '#fafafa', fontSize: 12, lineHeight: 1.7 }} />
                <span id="demo-cursor" style={{ display: 'inline-block', width: 2, height: 14, background: '#22c55e', marginLeft: 1, verticalAlign: 'middle', transition: 'opacity 0.2s' }} />
              </div>
              {/* Keyboard */}
              <div style={{ background: '#18181b', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 6px 12px' }}>
                {[
                  ['Q','W','E','R','T','Y','U','I','O','P'],
                  ['A','S','D','F','G','H','J','K','L'],
                  ['Z','X','C','V','B','N','M'],
                ].map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                    {row.map(k => (
                      <div key={k} style={{ background: '#27272a', borderRadius: 5, width: 22, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fafafa', fontWeight: 500 }}>
                        {k}
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 2 }}>
                  <div style={{ background: '#27272a', borderRadius: 5, width: 44, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#a1a1aa' }}>123</div>
                  <div style={{ background: '#27272a', borderRadius: 5, flex: 1, maxWidth: 100, height: 28 }} />
                  <div style={{ background: '#22c55e', borderRadius: 5, width: 44, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#000', fontWeight: 700 }}>Send</div>
                </div>
              </div>
            </div>

            {/* Scene: Sent */}
            <div
              id="demo-scene-sent"
              style={{
                opacity: 0,
                transition: 'opacity 0.3s ease',
                position: 'absolute', inset: 0,
                background: '#09090b',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
              }}
            >
              <div style={{ width: 52, height: 52, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#fafafa', fontSize: 15, fontWeight: 700 }}>Reply sent!</p>
                <p style={{ color: '#71717a', fontSize: 12, marginTop: 4 }}>Your wins are on the board 🏆</p>
              </div>
            </div>

          </div>
          {/* Home indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99 }} />
          </div>
        </div>
      </div>

      {/* ── DESKTOP ── */}
      <div
        id="demo-desktop-wrap"
        style={{
          opacity: 0,
          transition: 'opacity 0.5s ease',
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 12px',
        }}
      >
        {/* Browser chrome */}
        <div style={{ background: '#18181b', borderRadius: '12px 12px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <div style={{ flex: 1, background: '#27272a', borderRadius: 4, height: 18, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
            <span style={{ color: '#52525b', fontSize: 10 }}>app.wintheweek.co/dashboard</span>
          </div>
        </div>
        {/* Dashboard window */}
        <div style={{
          flex: 1,
          background: '#09090b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          display: 'flex',
        }}>
          {/* Sidebar */}
          <div style={{ width: 44, background: '#111113', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: '#22c55e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            {[1,2,3].map(i => <div key={i} style={{ width: 20, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />)}
          </div>
          {/* Main content */}
          <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ color: '#fafafa', fontSize: 12, fontWeight: 700 }}>Week of Mar 3 – 7</p>
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '2px 8px' }}>
                <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 600 }}>4/5 replied</span>
              </div>
            </div>
            {/* AI CEO briefing strip */}
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>
              <p style={{ color: '#22c55e', fontSize: 10, fontWeight: 600, marginBottom: 3 }}>✦ AI CEO BRIEFING</p>
              <p style={{ color: '#a1a1aa', fontSize: 11, lineHeight: 1.5 }}>Strong week — major product launch, 3 enterprise deals closed, mobile redesign shipped.</p>
            </div>
            {/* Reply cards */}
            {[
              { name: 'Alex K.', team: 'Eng', text: 'Launched the new onboarding flow and shipped mobile redesign 🚀', color: '#6366f1' },
              { name: 'Sam R.', team: 'Sales', text: 'Closed 3 enterprise deals and hit Q1 quota early 🎯', color: '#f59e0b' },
            ].map((r, i) => (
              <div key={i} style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 10px', marginBottom: 7, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                    {r.name[0]}
                  </div>
                  <span style={{ color: '#fafafa', fontSize: 11, fontWeight: 600 }}>{r.name}</span>
                  <span style={{ background: 'rgba(255,255,255,0.06)', color: '#71717a', fontSize: 9, padding: '1px 5px', borderRadius: 4 }}>{r.team}</span>
                </div>
                <p style={{ color: '#a1a1aa', fontSize: 11, lineHeight: 1.5 }}>{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROFILE ── */}
      <div
        id="demo-profile-wrap"
        style={{
          opacity: 0,
          transition: 'opacity 0.5s ease',
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 12px',
        }}
      >
        {/* Browser chrome */}
        <div style={{ background: '#18181b', borderRadius: '12px 12px 0 0', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <div style={{ flex: 1, background: '#27272a', borderRadius: 4, height: 18, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
            <span style={{ color: '#52525b', fontSize: 10 }}>app.wintheweek.co/team/alex</span>
          </div>
        </div>
        {/* Profile window */}
        <div style={{
          flex: 1,
          background: '#09090b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          display: 'flex',
        }}>
          {/* Sidebar */}
          <div style={{ width: 44, background: '#111113', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: '#22c55e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            {[1,2,3].map(i => <div key={i} style={{ width: 20, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />)}
          </div>
          {/* Profile content */}
          <div style={{ flex: 1, padding: '12px 14px', overflow: 'hidden' }}>
            {/* Header: avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>
                A
              </div>
              <div>
                <p style={{ color: '#fafafa', fontSize: 13, fontWeight: 700 }}>Alex Kim</p>
                <p style={{ color: '#71717a', fontSize: 10 }}>Engineering · 8w streak 🔥</p>
              </div>
            </div>
            {/* Mini stats row */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { label: 'Reply rate', value: '92%' },
                { label: 'Streak', value: '8w' },
                { label: 'Avg response', value: '4h' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '5px 7px', textAlign: 'center' }}>
                  <p style={{ color: '#fafafa', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ color: '#52525b', fontSize: 8, marginTop: 2 }}>{s.label}</p>
                </div>
              ))}
            </div>
            {/* AI Insights */}
            <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>
              <p style={{ color: '#a78bfa', fontSize: 10, fontWeight: 600, marginBottom: 3 }}>✦ AI INSIGHTS</p>
              <p style={{ color: '#a1a1aa', fontSize: 10, lineHeight: 1.5 }}>Alex has been consistently high-performing, leading the onboarding redesign and mobile launch. Key themes: shipping velocity, cross-team collaboration.</p>
            </div>
            {/* Themes */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
              {['Product launches', 'Mobile', 'Cross-team', 'Onboarding'].map(tag => (
                <span key={tag} style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>
                  {tag}
                </span>
              ))}
            </div>
            {/* Sentiment */}
            <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ color: '#71717a', fontSize: 9 }}>SENTIMENT</span>
                <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 700 }}>Positive</span>
              </div>
              <div style={{ height: 4, background: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: '88%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: 2 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
        {[0,1,2,3,4].map(i => (
          <button
            key={i}
            id={`demo-dot-${i}`}
            onClick={() => restartRef.current?.(i)}
            title={['Notification', 'Email', 'Reply', 'Dashboard', 'Profile'][i]}
            style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', transition: 'background 0.3s, transform 0.3s', border: 'none', padding: 0, cursor: 'pointer' }}
          />
        ))}
      </div>
    </div>
  )
}
