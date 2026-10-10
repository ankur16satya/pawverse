import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'

const PET_TYPES = ['🐶 Dog','🐱 Cat','🐇 Rabbit','🦜 Bird','🐠 Fish','🐹 Hamster','🐍 Reptile','🐢 Turtle','🐾 Other']
const VET_SPECIALIZATIONS = ['🩺 All Specialist', '🩺 General Vet', '🦷 Pet Surgeon', '🦴 Orthopedics', '🐕 Behavioral Expert', '🍎 Nutritionist', '🦎 Exotic Pets', '💉 Vaccination Clinic', '🏥 Hospital']
const SUPPLIER_CATEGORIES = ['📦 All Categories', '🦴 Food & Nutrition', '🧶 Toys & Fun', '🧼 Grooming & Hygiene', '💊 Health & Meds', '🛌 Bedding & Furniture', '🎀 Accessories', '📦 Bulk Supplier']

const PET_EMOJIS = { '🐶 Dog':'🐶','🐱 Cat':'🐱','🐇 Rabbit':'🐇','🦜 Bird':'🦜','🐠 Fish':'🐠','🐹 Hamster':'🐹','🐍 Reptile':'🐍','🐢 Turtle':'🐢','🐾 Other':'🐾' }
const PAWS = Array.from({ length: 14 }, (_, i) => i)

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)

  const [role, setRole] = useState('parent') // parent (has pet), lover (no pet), vet, supplier
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
  const [showPassword, setShowPassword] = useState(false)
  const [signupStep, setSignupStep] = useState('form') // form → otp
  const [signupOtp, setSignupOtp] = useState('')
  const [resetStep, setResetStep] = useState('email') // email → otp
  const [resetOtp, setResetOtp] = useState('')
  const [verifyOtpSent, setVerifyOtpSent] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [otpCooldown, setOtpCooldown] = useState(0)

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(window.location.search)

    if (hash.includes('type=recovery') || params.get('mode') === 'reset_password') {
      setMode('update_password')
      setAuthChecking(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Small delay so page renders before redirect — prevents blank flash
        // Send them home — the public feed page recognises logged-in users and renders the personalised feed
        setTimeout(() => router.push(router.query.next || '/'), 100)
      } else {
        setAuthChecking(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update_password')
        setAuthChecking(false)
      } else if (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery')) {
        setMode('update_password')
        setAuthChecking(false)
      }
    })
    setMounted(true)
    return () => subscription.unsubscribe()
  }, [])

  // Calls one of our /api/auth/* routes (OTP emails go through our own SMTP, not Supabase's limited mailer)
  const callAuthApi = async (path, body) => {
    const res = await fetch(`/api/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Something went wrong. Please try again.')
    return json
  }

  const sendOtp = async (targetEmail, purpose) => {
    await callAuthApi('send-otp', { email: targetEmail, purpose })
    setOtpCooldown(60)
  }

  useEffect(() => {
    if (otpCooldown <= 0) return
    const t = setTimeout(() => setOtpCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [otpCooldown])

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    const cleanEmail = email.trim().toLowerCase()

    // Step 1: validate the form and email a verification code
    if (signupStep === 'form') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      setLoading(true)
      try {
        await sendOtp(cleanEmail, 'signup')
        setSignupOtp('')
        setSignupStep('otp')
        setSuccess(`📧 We sent a 6-digit code to ${cleanEmail}`)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
      return
    }

    // Step 2: verify the code and create the account
    setLoading(true)
    try {
      const emoji = PET_EMOJIS[petType] || '🐾'
      await callAuthApi('signup', {
        email: cleanEmail,
        password,
        otp: signupOtp,
        profile: { ownerName, role, petName, petType, petBreed, emoji },
      })

      localStorage.setItem('pending_pet', JSON.stringify({
        owner_name: ownerName,
        pet_name: petName,
        pet_type: petType,
        pet_breed: petBreed,
        emoji,
      }))

      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (loginErr) {
        setSuccess('🎉 Account created! You can now sign in.')
        setMode('login')
        return
      }

      router.push(router.query.next || '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkNameAvailability = async (name) => {
    if (!name || name.length < 2) { setNameSuggestions([]); return }
    setCheckingName(true)
    const { data } = await supabase.from('pets').select('owner_name').ilike('owner_name', name).eq('is_health_pet', false)
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
    setError(''); setSuccess('')
    const cleanEmail = resetEmail.trim().toLowerCase()
    setLoading(true)
    try {
      if (resetStep === 'email') {
        await sendOtp(cleanEmail, 'reset')
        setResetOtp('')
        setResetStep('otp')
        setSuccess(`📧 If an account exists for ${cleanEmail}, we've sent it a 6-digit code.`)
        return
      }
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match!')
      if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.')
      await callAuthApi('reset-password', { email: cleanEmail, otp: resetOtp, newPassword })
      setSuccess('✅ Password updated! You can now sign in with your new password.')
      setLoginEmail(cleanEmail)
      setNewPassword(''); setConfirmPassword(''); setResetOtp(''); setResetStep('email')
      setMode('login')
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

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return
    setResendLoading(true)
    try {
      await sendOtp(unconfirmedEmail, 'verify')
      setVerifyOtpSent(true)
      setVerifyCode('')
      setSuccess(`📧 We sent a 6-digit code to ${unconfirmedEmail}`)
      setError('')
    } catch (err) {
      setError('Could not send code: ' + err.message)
    } finally {
      setResendLoading(false)
    }
  }

  // Confirms an older, never-verified account with the emailed code, then signs in.
  const handleVerifyExistingEmail = async () => {
    setError(''); setResendLoading(true)
    try {
      await callAuthApi('verify-email', { email: unconfirmedEmail, otp: verifyCode })
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: unconfirmedEmail, password: loginPassword })
      if (loginErr) throw loginErr
      router.push(router.query.next || '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setResendLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setUnconfirmedEmail(''); setVerifyOtpSent(false); setLoading(true)
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword
      })
      if (authErr) {
        // Email not confirmed — very common issue, handle gracefully
        const msg = authErr.message || ''
        if (
          msg.toLowerCase().includes('email not confirmed') ||
          msg.toLowerCase().includes('email_not_confirmed') ||
          msg.toLowerCase().includes('not confirmed')
        ) {
          setUnconfirmedEmail(loginEmail.trim().toLowerCase())
          setError('Your email is not confirmed yet. Verify it with a one-time code below.')
          setLoading(false)
          return
        }
        // Invalid credentials — give a friendlier message
        if (
          msg.toLowerCase().includes('invalid login') ||
          msg.toLowerCase().includes('invalid credentials') ||
          msg.toLowerCase().includes('wrong password') ||
          msg.toLowerCase().includes('user not found')
        ) {
          setError('❌ Incorrect email or password. Please check and try again, or use "Forgot Password" to reset.')
          setLoading(false)
          return
        }
        throw authErr
      }
      router.push(router.query.next || '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Standard hydration-safe loading state
  if (authChecking || !mounted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF0E8 0%, #F0EBFF 50%, #E8F8FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: '3.5rem', animation: 'pulse 1.2s infinite' }}>🐾</div>
        <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.5rem', background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PawVerse</div>
      </div>
    )
  }
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF0E8 0%, #F0EBFF 50%, #E8F8FF 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' }}>
      <SEO 
        title="Sign In or Create Account | PawVerse"
        description="Sign in to PawVerse, India's pet social network. New here? Create a free account in 30 seconds — pet parents, pet lovers, vets and suppliers welcome."
        keywords="PawVerse login, pet social network signup, create pet account India"
        canonical="https://pawversesocial.com/login"
      />
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
            <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.8rem', marginBottom: 8 }}>Pet parent, pet lover, vet or supplier — everyone is welcome! ❤️</p>
            {error && <div style={{ background: '#FFDCE0', color: '#FF4757', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ background: '#E8F8E8', color: '#22C55E', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{success}</div>}
            <form onSubmit={handleSignup}>
              {signupStep === 'otp' ? (
                <OtpField
                  email={email.trim().toLowerCase()}
                  value={signupOtp}
                  onChange={setSignupOtp}
                  cooldown={otpCooldown}
                  onResend={async () => { setError(''); try { await sendOtp(email.trim().toLowerCase(), 'signup'); setSuccess('📧 New code sent!') } catch (err) { setError(err.message) } }}
                  onChangeEmail={() => { setSignupStep('form'); setSignupOtp(''); setSuccess(''); setError('') }}
                />
              ) : (<>
              <label className="label">Account Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
                {[
                  { key: 'parent', label: 'Pet Parent', icon: '🐾' },
                  { key: 'lover',  label: 'Pet Lover', icon: '❤️' },
                  { key: 'vet',    label: 'Vet',        icon: '🩺' },
                  { key: 'supplier', label: 'Supplier', icon: '📦' },
                ].map(r => (
                  <div key={r.key} onClick={() => { 
                    setRole(r.key); 
                    setPetType(
                      r.key === 'vet' ? VET_SPECIALIZATIONS[0] :
                      r.key === 'supplier' ? SUPPLIER_CATEGORIES[0] :
                      r.key === 'lover' ? '🐾 Pet Lover' :
                      PET_TYPES[0]
                    );
                  }}
                    style={{
                      padding: '10px 4px', borderRadius: 12, border: '2px solid',
                      borderColor: role === r.key ? '#6C4BF6' : '#EDE8FF',
                      background: role === r.key ? '#F3F0FF' : '#fff',
                      textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{r.icon}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: role === r.key ? '#6C4BF6' : '#6B7280' }}>{r.label}</div>
                  </div>
                ))}
              </div>

              {role === 'vet' && (
                <div style={{ background: '#F0EBFF', border: '1px solid #6C4BF6', padding: '10px 12px', borderRadius: 8, fontSize: '0.78rem', marginBottom: 12, color: '#4C1D95' }}>
                  🩺 <strong>Two-step vet activation:</strong> after signup you'll need to (1) confirm your email and (2) upload your veterinary license / registration certificate. Once both are done, your vet dashboard unlocks automatically — no waiting.
                </div>
              )}

              {(() => {
                const labels = {
                  parent: { owner: 'User name', pet: "Your Pet's Name 🐾", type: "Pet Type", breed: "Pet Breed", petPlaceholder: "e.g. Whiskers", breedPlaceholder: "e.g. Persian, Labrador..." },
                  lover:  { owner: 'User name', pet: null, type: null, breed: "About You (Optional)", petPlaceholder: "", breedPlaceholder: "e.g. I love rescuing strays, dog photography enthusiast..." },
                  vet:    { owner: "Doctor's Name", pet: "Clinic/Hospital Name 🏥", type: "Primary Speciality", breed: "Qualifications / Education", petPlaceholder: "e.g. City Pet Clinic", breedPlaceholder: "e.g. BVSc & AH, Surgeon..." },
                  supplier: { owner: "Contact Person", pet: "Shop/Business Name 📦", type: "Business Category", breed: "Operating Since / License No.", petPlaceholder: "e.g. PawVerse Supplies", breedPlaceholder: "e.g. Est. 2015, Lic #1234..." }
                }[role];

                return (
                  <>
                    <label className="label">{labels.owner}</label>
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
                    <label className="label">{labels.pet}</label>
                    {labels.pet && (
                      <>
                        <input className="input" value={petName} onChange={e => setPetName(e.target.value)} placeholder={labels.petPlaceholder} required={role !== 'lover'} />
                        <label className="label">{labels.type}</label>
                        <select className="input" value={petType} onChange={e => setPetType(e.target.value)}>
                          {role === 'parent' ? PET_TYPES.map(t => <option key={t}>{t}</option>) :
                           role === 'vet' ? VET_SPECIALIZATIONS.map(t => <option key={t}>{t}</option>) :
                           SUPPLIER_CATEGORIES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </>
                    )}
                    <label className="label">{labels.breed}</label>
                    <input className="input" value={petBreed} onChange={e => setPetBreed(e.target.value)} placeholder={labels.breedPlaceholder} />
                  </>
                )
              })()}
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              </>)}
              <button type="submit" className="btn-primary" disabled={loading || (signupStep === 'otp' && signupOtp.length !== 6)} style={{ width: '100%', marginTop: 16, padding: 12, fontSize: '0.95rem', borderRadius: 12, textAlign: 'center' }}>
                {signupStep === 'form'
                  ? (loading ? 'Sending code...' : 'Continue — Verify Email 📧')
                  : (loading ? 'Creating...' : 'Verify & Create Pet Profile 🐾')}
              </button>
              <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.72rem', color: '#9CA3AF', lineHeight: 1.5 }}>
                By creating an account, you agree to our{' '}
                <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" style={{ color: '#6C4BF6', fontWeight: 700 }}>Terms</a> and{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#6C4BF6', fontWeight: 700 }}>Privacy Policy</a>.
              </p>
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
            {unconfirmedEmail && (
              <div style={{ background: '#FFF8E1', border: '1px solid #FFC107', padding: '10px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 6 }}>📧 Email not confirmed yet</div>
                {!verifyOtpSent ? (
                  <>
                    <div style={{ color: '#78350F', marginBottom: 8 }}>We'll send a 6-digit code to <strong>{unconfirmedEmail}</strong></div>
                    <button type="button" onClick={handleResendConfirmation} disabled={resendLoading}
                      style={{ background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                      {resendLoading ? 'Sending...' : '📨 Send Verification Code'}
                    </button>
                  </>
                ) : (
                  <>
                    <OtpField
                      email={unconfirmedEmail}
                      value={verifyCode}
                      onChange={setVerifyCode}
                      cooldown={otpCooldown}
                      onResend={handleResendConfirmation}
                    />
                    <button type="button" onClick={handleVerifyExistingEmail} disabled={resendLoading || verifyCode.length !== 6}
                      style={{ width: '100%', marginTop: 10, background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: verifyCode.length === 6 ? 1 : 0.6 }}>
                      {resendLoading ? 'Verifying...' : '✅ Verify & Sign In'}
                    </button>
                  </>
                )}
              </div>
            )}
            {success && <div style={{ background: '#E8F8E8', color: '#22C55E', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{success}</div>}
            <form onSubmit={handleLogin}>
              <label className="label">Email</label>
              <input className="input" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@email.com" required />
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Your password" required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
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
            <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.8rem', marginBottom: 12 }}>
              {resetStep === 'email' ? "Enter your email and we'll send you a 6-digit code" : 'Enter the code and choose a new password'}
            </p>
            {error && <div style={{ background: '#FFDCE0', color: '#FF4757', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ background: '#E8F8E8', color: '#22C55E', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 8 }}>{success}</div>}
            <form onSubmit={handleForgotPassword}>
              {resetStep === 'email' ? (
                <>
                  <label className="label">Your Email</label>
                  <input className="input" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="you@email.com" required />
                </>
              ) : (
                <>
                  <OtpField
                    email={resetEmail.trim().toLowerCase()}
                    value={resetOtp}
                    onChange={setResetOtp}
                    cooldown={otpCooldown}
                    onResend={async () => { setError(''); try { await sendOtp(resetEmail.trim().toLowerCase(), 'reset'); setSuccess('📧 New code sent!') } catch (err) { setError(err.message) } }}
                    onChangeEmail={() => { setResetStep('email'); setResetOtp(''); setSuccess(''); setError('') }}
                  />
                  <label className="label">New Password</label>
                  <input className="input" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" required />
                  <label className="label">Confirm New Password</label>
                  <input className="input" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" required />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', marginTop: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show passwords
                  </label>
                </>
              )}
              <button type="submit" className="btn-primary" disabled={loading || (resetStep === 'otp' && resetOtp.length !== 6)} style={{ width: '100%', marginTop: 16, padding: 12, fontSize: '0.95rem', borderRadius: 12 }}>
                {resetStep === 'email'
                  ? (loading ? 'Sending...' : '📧 Send Reset Code')
                  : (loading ? 'Updating...' : '✅ Reset Password')}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: '#6B7280' }}>
              <span onClick={() => { setMode('login'); setError(''); setSuccess(''); setResetStep('email') }} style={{ color: '#FF6B35', fontWeight: 700, cursor: 'pointer' }}>← Back to Sign In</span>
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
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input className="input" type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 6 characters" required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              <label className="label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 0 }}>
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
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
// 6-digit email code input used by signup, password reset and email verification.
function OtpField({ email, value, onChange, cooldown, onResend, onChangeEmail }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.2rem', marginBottom: 4 }}>📬</div>
      <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: '0 0 10px' }}>
        Enter the 6-digit code sent to <strong style={{ color: '#1E1347' }}>{email}</strong>
        <br /><span style={{ fontSize: '0.74rem' }}>Can't find it? Check your spam folder.</span>
      </p>
      <input
        className="input"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="••••••"
        aria-label="Verification code"
        style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '0.5em', paddingLeft: '0.5em' }}
      />
      <div style={{ display: 'flex', justifyContent: onChangeEmail ? 'space-between' : 'center', marginTop: 8, fontSize: '0.78rem' }}>
        {onChangeEmail && (
          <span onClick={onChangeEmail} style={{ color: '#6B7280', fontWeight: 700, cursor: 'pointer' }}>← Change email</span>
        )}
        {cooldown > 0
          ? <span style={{ color: '#9CA3AF', fontWeight: 700 }}>Resend code in {cooldown}s</span>
          : <span onClick={onResend} style={{ color: '#6C4BF6', fontWeight: 700, cursor: 'pointer' }}>Resend code</span>}
      </div>
    </div>
  )
}
