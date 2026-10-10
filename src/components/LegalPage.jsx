import { useEffect, useRef } from 'react'
import Link from 'next/link'
import SEO from './SEO'

// Shared layout for the legal / policy pages (privacy, terms, refund, delete account).
export const LEGAL_LINKS = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund Policy' },
  { href: '/delete-account', label: 'Delete Account' },
]

export const SUPPORT_EMAIL = 'support@pawversesocial.com'

export default function LegalPage({ title, subtitle, lastUpdated, seo, sections = [], current, children }) {
  const switcherRef = useRef(null)

  // On narrow screens the switcher scrolls horizontally; keep the active tab visible.
  useEffect(() => {
    const bar = switcherRef.current
    const active = bar && bar.querySelector('[data-active="true"]')
    if (active) bar.scrollLeft = active.offsetLeft - (bar.clientWidth - active.clientWidth) / 2
  }, [current])

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh', paddingBottom: 80 }}>
      <SEO {...seo} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1E1347, #6C4BF6)', padding: '70px 20px 50px', textAlign: 'center' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', textDecoration: 'none', marginBottom: 18, fontWeight: 800 }}>
          <span style={{ fontSize: '1.4rem' }}>🐾</span>
          <span style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem' }}>PawVerse</span>
        </Link>
        <h1 style={{ fontFamily: "'Baloo 2', cursive", fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#fff', margin: '0 0 12px', lineHeight: 1.15 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.02rem', maxWidth: 560, margin: '0 auto' }}>{subtitle}</p>
        )}
        {lastUpdated && (
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', marginTop: 14 }}>Last updated: {lastUpdated}</p>
        )}
      </div>

      {/* Policy switcher */}
      <div style={{ maxWidth: 860, margin: '-22px auto 0', padding: '0 16px' }}>
        <div ref={switcherRef} style={{ background: '#fff', borderRadius: 50, border: '1.5px solid #EDE8FF', boxShadow: '0 6px 20px rgba(30,19,71,0.06)', padding: 6, display: 'flex', gap: 4, overflowX: 'auto' }}>
          {LEGAL_LINKS.map(l => (
            <Link key={l.href} href={l.href} data-active={current === l.href}
              style={{
                flex: '1 0 auto', textAlign: 'center', padding: '9px 14px', borderRadius: 50, whiteSpace: 'nowrap',
                fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none',
                background: current === l.href ? '#6C4BF6' : 'transparent',
                color: current === l.href ? '#fff' : '#6B7280',
              }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 16px 0' }}>
        {/* Table of contents */}
        {sections.length > 0 && (
          <nav style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #EDE8FF', padding: '18px 22px', marginBottom: 24 }}>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#1E1347', marginBottom: 8 }}>On this page</div>
            <ol style={{ margin: 0, paddingLeft: 20, columns: '2 240px', columnGap: 24 }}>
              {sections.map(s => (
                <li key={s.id} style={{ marginBottom: 6, breakInside: 'avoid' }}>
                  <a href={`#${s.id}`} style={{ color: '#6C4BF6', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700 }}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {children}

        {sections.map((s, idx) => (
          <section key={s.id} id={s.id}
            style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #EDE8FF', padding: '22px 24px', marginBottom: 14, scrollMarginTop: 20 }}>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', color: '#1E1347', margin: '0 0 10px', fontWeight: 800 }}>
              {idx + 1}. {s.title}
            </h2>
            <div className="legal-body" style={{ color: '#4B5563', lineHeight: 1.75, fontSize: '0.96rem' }}>
              {s.body}
            </div>
          </section>
        ))}

        {/* Contact CTA */}
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ color: '#6B7280', marginBottom: 16 }}>Questions about this page? We're happy to help.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`}
            style={{ background: '#6C4BF6', color: '#fff', padding: '14px 32px', borderRadius: 50, fontWeight: 800, fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}>
            Contact Support →
          </a>
          <p style={{ color: '#9CA3AF', fontSize: '0.82rem', marginTop: 24 }}>
            © {new Date().getFullYear()} PawVerse Social · Dehradun, Uttarakhand, India
          </p>
        </div>
      </div>

      <style jsx global>{`
        .legal-body p { margin: 0 0 10px; }
        .legal-body p:last-child { margin-bottom: 0; }
        .legal-body ul { margin: 6px 0 10px; padding-left: 20px; }
        .legal-body li { margin-bottom: 6px; }
        .legal-body strong { color: #1E1347; }
        .legal-body a { color: #6C4BF6; font-weight: 700; }
      `}</style>
    </div>
  )
}
