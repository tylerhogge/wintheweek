import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Win the Week — The CEO\'s Weekly Operating System'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#22c55e',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span style={{ color: '#fafafa', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em' }}>
            Win the Week
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            color: '#fafafa',
            fontSize: '64px',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            margin: 0,
            marginBottom: '24px',
            maxWidth: '800px',
          }}
        >
          What did your company get done{' '}
          <span style={{ color: '#22c55e' }}>this week?</span>
        </h1>

        {/* Subline */}
        <p
          style={{
            color: '#a1a1aa',
            fontSize: '24px',
            lineHeight: 1.5,
            margin: 0,
            maxWidth: '700px',
          }}
        >
          The CEO&apos;s weekly operating system. AI-powered briefings on what your company accomplished and what it needs from you.
        </p>

        {/* URL */}
        <p
          style={{
            color: '#52525b',
            fontSize: '18px',
            position: 'absolute',
            bottom: '40px',
            left: '80px',
          }}
        >
          wintheweek.co
        </p>
      </div>
    ),
    { ...size },
  )
}
