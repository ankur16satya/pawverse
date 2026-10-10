import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import LegalPage, { SUPPORT_EMAIL } from '../components/LegalPage'

const REASONS = [
  'I no longer have a pet',
  'I have privacy concerns',
  'I created another account',
  'I don\'t find PawVerse useful',
  'Too many notifications',
  'Other',
]

const STEPS = [
  { icon: '📝', title: 'Submit request', text: 'Fill in the form below with your registered email.' },
  { icon: '🔐', title: 'Verification', text: 'We may email you to confirm you own the account.' },
  { icon: '🗑️', title: 'Permanent deletion', text: 'Your data is deleted within 30 days and we email you once done.' },
]

const sections = [
  {
    id: 'what-is-deleted',
    title: 'What Gets Deleted',
    body: (
      <ul>
        <li>Your account, login credentials and profile (name, email, role, bio, avatar).</li>
        <li>All pet profiles, including health passport pets.</li>
        <li>Posts, reels, photos, videos, comments and likes.</li>
        <li>Chat conversations and messages you sent (they are removed or anonymised for the other person).</li>
        <li>Friend connections and friend requests.</li>
        <li>Pet health records — vaccinations, weight logs and vet visit history.</li>
        <li>Adoption listings, marketplace listings, cart items and vet clinic listings.</li>
        <li>Vet license documents, notifications, push subscriptions and PawCoins balance.</li>
        <li>Uploaded media files stored with our hosting providers.</li>
      </ul>
    ),
  },
  {
    id: 'what-is-retained',
    title: 'What We May Retain',
    body: (
      <>
        <p>Some limited information may be kept after deletion, only where necessary:</p>
        <ul>
          <li><strong>Payment and appointment records</strong> (amount, date, Razorpay order/payment ID) — up to 8 years, as required by Indian tax and accounting laws.</li>
          <li><strong>Records needed for legal reasons</strong> — e.g. to resolve an open dispute, prevent fraud, or comply with a legal request.</li>
          <li><strong>Encrypted backups</strong> — residual copies are overwritten automatically within 90 days.</li>
          <li><strong>A record of this deletion request</strong> — so we can prove the request was completed.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'timeline',
    title: 'Timeline',
    body: (
      <p>
        We acknowledge every request immediately by email and complete verified requests within <strong>30 days</strong>.
        Deletion is <strong>permanent and cannot be undone</strong> — once your account is deleted, you will not be able to
        recover your posts, pets, messages or PawCoins. You are free to create a new account later.
      </p>
    ),
  },
  {
    id: 'other-options',
    title: 'Other Options',
    body: (
      <ul>
        <li>Just want to remove a post, reel or listing? You can delete it directly from your <Link href="/profile">profile</Link>.</li>
        <li>Too many alerts? Turn off push notifications in your browser or phone settings.</li>
        <li>Can't access the form? Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`}>{SUPPORT_EMAIL}</a> from your registered email address with the subject "Delete my account".</li>
        <li>Read how we handle your data in our <Link href="/privacy-policy">Privacy Policy</Link>.</li>
      </ul>
    ),
  },
]

const labelStyle = { display: 'block', fontWeight: 800, fontSize: '0.86rem', color: '#1E1347', marginBottom: 6 }
const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #EDE8FF',
  fontSize: '0.95rem', fontFamily: 'Nunito, sans-serif', color: '#1E1347', background: '#fff', outline: 'none',
}

export default function DeleteAccount() {
  const [session, setSession] = useState(null)
  const [form, setForm] = useState({ email: '', name: '', requestType: 'full_account', reason: '', details: '', confirmed: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setSession(session)
      setForm(f => ({ ...f, email: f.email || session.user.email || '' }))
      supabase.from('pets').select('owner_name').eq('user_id', session.user.id).eq('is_health_pet', false).maybeSingle()
        .then(({ data }) => { if (data?.owner_name) setForm(f => ({ ...f, name: f.name || data.owner_name })) })
    })
  }, [])

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.confirmed) { setError('Please confirm that you understand the deletion is permanent.'); return }
    if (form.requestType === 'specific_data' && !form.details.trim()) { setError('Please describe which data you want deleted.'); return }

    setSubmitting(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
      const res = await fetch('/api/delete-account-request', { method: 'POST', headers, body: JSON.stringify(form) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.')
      setResult(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <LegalPage
      current="/delete-account"
      title="Delete Your Account"
      subtitle="Request permanent deletion of your PawVerse account and the data associated with it."
      sections={sections}
      seo={{
        title: 'Delete Account & Data | PawVerse',
        description: 'Request permanent deletion of your PawVerse account and personal data. Learn what is deleted, what is retained, and how long it takes.',
        keywords: 'delete PawVerse account, PawVerse data deletion, remove my data, account deletion request',
        canonical: 'https://pawversesocial.com/delete-account',
      }}
    >
      {/* Steps */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div key={s.title} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #EDE8FF', padding: 18 }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#1E1347', fontSize: '1rem' }}>
              {i + 1}. {s.title}
            </div>
            <div style={{ color: '#6B7280', fontSize: '0.88rem', lineHeight: 1.55 }}>{s.text}</div>
          </div>
        ))}
      </div>

      {/* Form / success */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #EDE8FF', padding: '26px 24px', marginBottom: 28, boxShadow: '0 6px 24px rgba(108,75,246,0.08)' }}>
        {result ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>✅</div>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", color: '#1E1347', margin: '0 0 8px' }}>
              {result.duplicate ? 'Request already in progress' : 'Request received'}
            </h2>
            <p style={{ color: '#6B7280', lineHeight: 1.65, maxWidth: 480, margin: '0 auto' }}>
              {result.duplicate
                ? 'We already have a pending deletion request for this email. Our team is working on it and will contact you soon.'
                : 'We\'ve received your deletion request. We may email you to verify account ownership, and your request will be completed within 30 days.'}
            </p>
            {result.requestId && (
              <p style={{ marginTop: 14, fontSize: '0.85rem', color: '#6B7280' }}>
                Reference ID: <strong style={{ color: '#1E1347', fontFamily: 'monospace' }}>{result.requestId}</strong>
              </p>
            )}
            <Link href="/" style={{ display: 'inline-block', marginTop: 18, color: '#6C4BF6', fontWeight: 800, textDecoration: 'none' }}>← Back to PawVerse</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", color: '#1E1347', margin: '0 0 4px', fontSize: '1.35rem' }}>Deletion request form</h2>
            <p style={{ color: '#6B7280', fontSize: '0.88rem', margin: '0 0 20px' }}>
              {session
                ? <>You're signed in as <strong style={{ color: '#1E1347' }}>{session.user.email}</strong>, so we can verify your request faster.</>
                : <>You don't need to be signed in. Use the email address registered with your PawVerse account.</>}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div>
                <label style={labelStyle} htmlFor="del-email">Registered email *</label>
                <input id="del-email" type="email" required value={form.email} onChange={e => update('email', e.target.value)}
                  placeholder="you@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle} htmlFor="del-name">Your name</label>
                <input id="del-name" type="text" value={form.name} onChange={e => update('name', e.target.value)}
                  placeholder="Name on your account" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={labelStyle}>What would you like to delete? *</span>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { value: 'full_account', title: 'My entire account and all data', text: 'Permanently delete your account, pets, posts, messages, health records and everything else.' },
                  { value: 'specific_data', title: 'Only specific data', text: 'Keep your account but delete certain data, e.g. health records or a listing.' },
                ].map(opt => (
                  <label key={opt.value}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 14px', borderRadius: 12,
                      border: `1.5px solid ${form.requestType === opt.value ? '#6C4BF6' : '#EDE8FF'}`,
                      background: form.requestType === opt.value ? '#F6F3FF' : '#fff',
                    }}>
                    <input type="radio" name="requestType" value={opt.value} checked={form.requestType === opt.value}
                      onChange={e => update('requestType', e.target.value)} style={{ marginTop: 4, accentColor: '#6C4BF6' }} />
                    <span>
                      <span style={{ display: 'block', fontWeight: 800, color: '#1E1347', fontSize: '0.92rem' }}>{opt.title}</span>
                      <span style={{ display: 'block', color: '#6B7280', fontSize: '0.84rem', lineHeight: 1.5 }}>{opt.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="del-reason">Reason (optional)</label>
              <select id="del-reason" value={form.reason} onChange={e => update('reason', e.target.value)} style={inputStyle}>
                <option value="">Select a reason</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="del-details">
                {form.requestType === 'specific_data' ? 'Which data should we delete? *' : 'Anything else we should know? (optional)'}
              </label>
              <textarea id="del-details" rows={4} maxLength={2000} value={form.details} onChange={e => update('details', e.target.value)}
                placeholder={form.requestType === 'specific_data' ? 'e.g. Delete all health records for my dog Bruno' : 'Optional feedback'}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', background: '#FFF4EE', border: '1.5px solid #FFD9C7', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <input type="checkbox" checked={form.confirmed} onChange={e => update('confirmed', e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: '#FF6B35', flexShrink: 0 }} />
              <span style={{ fontSize: '0.86rem', color: '#7C2D12', lineHeight: 1.55 }}>
                I understand that deletion is <strong>permanent and cannot be undone</strong>, and that any unused PawCoins will be lost.
              </span>
            </label>

            {error && (
              <div style={{ background: '#FFDCE0', color: '#B91C1C', padding: '10px 14px', borderRadius: 10, fontSize: '0.86rem', marginBottom: 14 }}>{error}</div>
            )}

            <button type="submit" disabled={submitting}
              style={{
                width: '100%', padding: 14, border: 'none', borderRadius: 12, cursor: submitting ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg,#FF4757,#FF6B35)', color: '#fff', fontFamily: 'Nunito, sans-serif',
                fontWeight: 800, fontSize: '1rem', opacity: submitting ? 0.7 : 1,
              }}>
              {submitting ? 'Submitting…' : '🗑️ Submit Deletion Request'}
            </button>
          </form>
        )}
      </div>
    </LegalPage>
  )
}
