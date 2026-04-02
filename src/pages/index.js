import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const PET_TYPES = ['🐶 Dog','🐱 Cat','🐇 Rabbit','🦜 Bird','🐠 Fish','🐹 Hamster','🐍 Reptile','🐢 Turtle']
const PET_EMOJIS = { '🐶 Dog':'🐶','🐱 Cat':'🐱','🐇 Rabbit':'🐇','🦜 Bird':'🦜','🐠 Fish':'🐠','🐹 Hamster':'🐹','🐍 Reptile':'🐍','🐢 Turtle':'🐢' }
const PAWS = Array.from({ length: 14 }, (_, i) => i)

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [ownerName, setOwnerName] = useState('')
  const [nameSuggestions, setNameSuggestions] = useState([])
  const [checkingName, setCheckingName] = useState(false)
  const [petName, setPetName] = useState('')
  const [petType, setPetType] = useState('🐶 Dog')
  const [petBreed, setPetBreed] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check if user came from password reset link
        const hash = window.location.hash
        const params = new URLSearchParams(window.location.search)
        if (hash.includes('type=recovery') || params.get('mode') === 'reset_password') {
          setMode('update_password')
        } else {
          router.push('/feed')
        }
      }
    })
    // Handle auth state change for password reset
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update_password')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signUp({ email, password })
      if (authErr) throw authErr

      // Save pet details to localStorage so profile page can use them
      localStorage.setItem('pending_pet', JSON.stringify({
        owner_name: ownerName,
        pet_name: petName,
        pet_type: petType,
        pet_breed: petBreed,
        emoji: PET_EMOJIS[petType] || '🐾',
      }))

      // Try to save pet profile immediately
      const emoji = PET_EMOJIS[petType] || '🐾'
      const { error: dbErr } = await supabase.from('pets').insert({
        user_id: data.user.id,
        owner_name: ownerName,
        pet_name: petName,
        pet_type: petType,
        pet_breed: petBreed,
        emoji,
        paw_coins: 150,
        bio: `Hi, I'm ${petName}! 🐾`,
        location: 'India',
      })

      // Even if db insert fails (email not confirmed yet), we saved to localStorage
      // so profile page will auto-create it after login
      if (dbErr) {
        setSuccess('📧 Account created! Please check your email and click the confirmation link, then come back to sign in.')
      } else {
        setSuccess('🎉 Account created! Please check your email to confirm, then sign in.')
      }
      setMode('login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkNameAvailability = async (name) => {
    if (!name || name.length < 2) { setNameSuggestions([]); return }
    setCheckingName(true)
    const { data } = await supabase.from('pets').select('owner_name').ilike('owner_name', name)
    const taken = (data || []).some(p => p.owner_name.toLowerCase() === name.toLowerCase())
    if (taken) {
      const num = () => Math.floor(1000 + Math.random() * 9000)
      setNameSuggestions([`${name}${num()}`, `${name}_pet`, `${name}${num()}`, `${name}official`])
    } else {
      setNameSuggestions([])
    }
    setCheckingName(false)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `https://pawversesocial.com/?mode=reset_password`
      })
      if (err) throw err
      setSuccess('📧 Password reset email sent! Check your inbox and click the link.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError('Passwords do not match!'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword })
      if (err) throw err
      setSuccess('✅ Password updated successfully! You can now sign in with your new password.')
      setMode('login')
      setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: loginEmail, password: loginPassword
      })
      if (authErr) throw authErr
      router.push('/feed')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF0E8 0%, #F0EBFF 50%, #E8F8FF 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' }}>
      {PAWS.map(i => (
        <span key={i} className="paw-float" style={{ left: `${(i * 7.2) % 100}%`, animationDuration: `${9 + (i % 5) * 1.8}s`, animationDelay: `${(i * 0.6) % 7}s`, fontSize: `${1.2 + (i % 4) * 0.5}rem`, opacity: 0.15 }}>🐾</span>
      ))}

      <div style={{ textAlign: 'center', zIndex: 1, width: '100%', maxWidth: 440 }}>
        <div className="float-anim" style={{ fontSize: '4rem', marginBottom: 6 }}>🐾</div>
        <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '2.8rem', background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>PawVerse</h1>
        <p style={{ color: '#6B7280', fontWeight: 600, marginBottom: 24, fontSize: '1rem' }}>The social universe for your fur family 🐶🐱🐇🦜🐠</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
          {['🐾 Pet Profiles','📸 Social Feed','🛍️ Marketplace','🩺 Health Records','💬 Pet Chat','🏠 Adopt','🪙 PawCoins'].map(f => (
            <span key={f} style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, color: '#1E1347', border: '1px solid rgba(255,255,255,0.8)' }}>{f}</span>
          ))}
        </div>

        {!mode && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setMode('signup')} className="btn-primary" style={{ fontSize: '1rem', padding: '12px 28px', borderRadius: 50 }}>🐾 Join PawVerse</button>
            <button onClick={() => setMode('login')} className="btn-secondary" style={{ fontSize: '1rem', padding: '12px 28px', borderRadius: 50 }}>Sign In →</button>
          </div>
        )}

        {mode === 'signup' && (
          <div className="card" style={{ marginTop: 16, textAlign: 'left' }}>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.35rem', textAlign: 'center', marginBottom: 4 }}>🐾 Create Your Account</h2>
            <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.8rem', marginBottom: 8 }}>A pet is required — because that's the whole point! ❤️</p>
            {error && <div style={{ background: '#FFDCE0', color: '#FF4757', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ background: '#E8F8E8', color: '#22C55E', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{success}</div>}
            <form onSubmit={handleSignup}>
              <label className="label">User name</label>
              <input className="input" value={ownerName} onChange={e => { setOwnerName(e.target.value); clearTimeout(window._nameTimer); window._nameTimer = setTimeout(() => checkNameAvailability(e.target.value), 600) }} placeholder="e.g. Priya Sharma" required />
              {checkingName && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>Checking availability...</div>}
              {nameSuggestions.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: '0.72rem', color: '#FF4757', fontWeight: 700, marginBottom: 4 }}>⚠️ This name is taken! Try one of these:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {nameSuggestions.map(s => (
                      <span key={s} onClick={() => { setOwnerName(s); setNameSuggestions([]) }}
                        style={{ background: '#F0EBFF', border: '1px solid #6C4BF6', borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#6C4BF6', cursor: 'pointer' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <label className="label">Your Pet's Name 🐾</label>
              <input className="input" value={petName} onChange={e => setPetName(e.target.value)} placeholder="e.g. Whiskers" required />
              <label className="label">Pet Type</label>
              <select className="input" value={petType} onChange={e => setPetType(e.target.value)}>
                {PET_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <label className="label">Pet Breed</label>
              <input className="input" value={petBreed} onChange={e => setPetBreed(e.target.value)} placeholder="e.g. Persian, Labrador..." />
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 16, padding: 12, fontSize: '0.95rem', borderRadius: 12, textAlign: 'center' }}>
                {loading ? 'Creating...' : 'Create Pet Profile 🐾'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: '#6B7280' }}>
              Already have an account?{' '}
              <span onClick={() => { setMode('login'); setError('') }} style={{ color: '#FF6B35', fontWeight: 700, cursor: 'pointer' }}>Sign in</span>
            </p>
          </div>
        )}

        {mode === 'login' && (
          <div className="card" style={{ marginTop: 16, textAlign: 'left' }}>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.35rem', textAlign: 'center', marginBottom: 16 }}>Welcome Back 🐾</h2>
            {error && <div style={{ background: '#FFDCE0', color: '#FF4757', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ background: '#E8F8E8', color: '#22C55E', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{success}</div>}
            <form onSubmit={handleLogin}>
              <label className="label">Email</label>
              <input className="input" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@email.com" required />
              <label className="label">Password</label>
              <input className="input" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Your password" required />
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 16, padding: 12, fontSize: '0.95rem', borderRadius: 12 }}>
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.78rem' }}>
              <span onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} style={{ color: '#6C4BF6', fontWeight: 700, cursor: 'pointer' }}>🔑 Forgot Password?</span>
            </p>
            <p style={{ textAlign: 'center', marginTop: 4, fontSize: '0.78rem', color: '#6B7280' }}>
              New here?{' '}
              <span onClick={() => { setMode('signup'); setError('') }} style={{ color: '#FF6B35', fontWeight: 700, cursor: 'pointer' }}>Create account</span>
            </p>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="card" style={{ marginTop: 16, textAlign: 'left' }}>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.35rem', textAlign: 'center', marginBottom: 8 }}>🔑 Reset Password</h2>
            <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.8rem', marginBottom: 12 }}>Enter your email and we'll send you a reset link</p>
            {error && <div style={{ background: '#FFDCE0', color: '#FF4757', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ background: '#E8F8E8', color: '#22C55E', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{success}</div>}
            <form onSubmit={handleForgotPassword}>
              <label className="label">Your Email</label>
              <input className="input" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="you@email.com" required />
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 16, padding: 12, fontSize: '0.95rem', borderRadius: 12 }}>
                {loading ? 'Sending...' : '📧 Send Reset Link'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: '#6B7280' }}>
              <span onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{ color: '#FF6B35', fontWeight: 700, cursor: 'pointer' }}>← Back to Sign In</span>
            </p>
          </div>
        )}

        {mode === 'update_password' && (
          <div className="card" style={{ marginTop: 16, textAlign: 'left' }}>
            <h2 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.35rem', textAlign: 'center', marginBottom: 8 }}>🔐 Set New Password</h2>
            <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.8rem', marginBottom: 12 }}>Choose a strong new password for your account</p>
            {error && <div style={{ background: '#FFDCE0', color: '#FF4757', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ background: '#E8F8E8', color: '#22C55E', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{success}</div>}
            <form onSubmit={handleUpdatePassword}>
              <label className="label">New Password</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" required />
              <label className="label">Confirm New Password</label>
              <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" required />
              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 16, padding: 12, fontSize: '0.95rem', borderRadius: 12 }}>
                {loading ? 'Updating...' : '✅ Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}