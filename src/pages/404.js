import Link from 'next/link'

export default function Custom404() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', fontFamily: "'Baloo 2', cursive, sans-serif",
      background: '#FFFBF7', textAlign: 'center', padding: 20
    }}>
      <div style={{ fontSize: '4rem', marginBottom: 10 }}>🐾</div>
      <h1 style={{ fontSize: '1.8rem', color: '#1E1347', fontWeight: 800 }}>Page Not Found (404)</h1>
      <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: 8 }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/feed" style={{
        marginTop: 18, padding: '10px 24px', borderRadius: 30,
        background: 'linear-gradient(135deg, #FF6B35, #6C4BF6)', color: '#fff',
        fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem'
      }}>
        Back to Feed 🐾
      </Link>
    </div>
  )
}
