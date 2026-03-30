import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

export default function Cart() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [pet, setPet] = useState(null)
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    setUser(session.user)

    const { data: petData } = await supabase
      .from('pets').select('*').eq('user_id', session.user.id).single()
    setPet(petData)

    await fetchCart(session.user.id)
    setLoading(false)
  }

  const fetchCart = async (userId) => {
    const { data } = await supabase
      .from('cart')
      .select('*, listings(*, pets(pet_name, emoji, avatar_url, owner_name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setCartItems(data || [])
  }

  const updateQuantity = async (item, delta) => {
    const newQty = item.quantity + delta
    if (newQty < 1) { removeItem(item); return }

    await supabase.from('cart').update({ quantity: newQty }).eq('id', item.id)
    setCartItems(prev => prev.map(c => c.id === item.id ? { ...c, quantity: newQty } : c))
  }

  const removeItem = async (item) => {
    await supabase.from('cart').delete().eq('id', item.id)
    setCartItems(prev => prev.filter(c => c.id !== item.id))
    showToast('🗑️ Item removed from cart')
  }

  const clearCart = async () => {
    if (!confirm('Clear entire cart?')) return
    await supabase.from('cart').delete().eq('user_id', user.id)
    setCartItems([])
    showToast('🛒 Cart cleared!')
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const getTotal = () => cartItems.reduce((sum, item) => sum + (item.listings?.price || 0) * item.quantity, 0)
  const getTotalItems = () => cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const getPawCoinsEarned = () => Math.floor(getTotal() / 10)

  const getFirstImage = (listing) => {
    if (listing.image_url) return listing.image_url
    if (listing.image_urls?.length) return listing.image_urls[0]
    return null
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '2rem' }}>🐾</div>
  )

  return (
    <div style={{ background: '#FFFBF7', minHeight: '100vh' }}>
      <NavBar user={user} pet={pet} />

      <div style={{ maxWidth: 860, margin: '70px auto 0', padding: '20px 14px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.8rem', color: '#1E1347' }}>
            🛒 My Cart
          </h1>
          {cartItems.length > 0 && (
            <button onClick={clearCart}
              style={{ background: 'none', border: '1px solid #EDE8FF', borderRadius: 8, padding: '6px 14px', color: '#FF4757', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
              🗑️ Clear Cart
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>🛒</div>
            <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.2rem', color: '#1E1347' }}>
              Your cart is empty
            </div>
            <p style={{ color: '#6B7280', fontSize: '0.88rem', marginTop: 6 }}>
              Add some products from the marketplace!
            </p>
            <button onClick={() => router.push('/marketplace')} className="btn-primary"
              style={{ marginTop: 16, padding: '10px 24px', fontSize: '0.88rem', borderRadius: 10 }}>
              🛍️ Go to Marketplace
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

            {/* Cart Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cartItems.map(item => {
                const listing = item.listings
                if (!listing) return null
                const img = getFirstImage(listing)
                return (
                  <div key={item.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {/* Image */}
                    <div
                      onClick={() => router.push(`/listing/${listing.id}`)}
                      style={{ width: 90, height: 90, borderRadius: 12, background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }}>
                      {img
                        ? <img src={img} alt={listing.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '2.5rem' }}>📦</span>}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        onClick={() => router.push(`/listing/${listing.id}`)}
                        style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 700, fontSize: '1rem', color: '#1E1347', cursor: 'pointer', marginBottom: 2 }}>
                        {listing.name}
                      </div>
                      {listing.brand && (
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: 4 }}>{listing.brand}</div>
                      )}
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 8 }}>
                        📍 {listing.city || 'Location N/A'}
                      </div>
                      <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, color: '#FF6B35', fontSize: '1.1rem' }}>
                        ₹{listing.price}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3F0FF', borderRadius: 10, padding: '4px 8px' }}>
                        <button onClick={() => updateQuantity(item, -1)}
                          style={{ width: 28, height: 28, border: 'none', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 800, fontSize: '1rem', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1rem', minWidth: 24, textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button onClick={() => updateQuantity(item, 1)}
                          style={{ width: 28, height: 28, border: 'none', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 800, fontSize: '1rem', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 700 }}>
                        Total: ₹{(listing.price * item.quantity).toFixed(0)}
                      </div>
                      <button onClick={() => removeItem(item)}
                        style={{ background: 'none', border: 'none', color: '#FF4757', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Nunito, sans-serif' }}>
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order Summary */}
            <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
              <div className="card">
                <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', marginBottom: 16, color: '#1E1347' }}>
                  🧾 Order Summary
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6B7280' }}>
                    <span>Items ({getTotalItems()})</span>
                    <span>₹{getTotal().toFixed(0)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#22C55E', fontWeight: 700 }}>
                    <span>🪙 PawCoins Earned</span>
                    <span>+{getPawCoinsEarned()}</span>
                  </div>
                  <div style={{ height: 1, background: '#EDE8FF', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: '1.1rem', color: '#1E1347' }}>
                    <span>Total</span>
                    <span style={{ color: '#FF6B35' }}>₹{getTotal().toFixed(0)}</span>
                  </div>
                </div>

                {/* PawCoins info */}
                <div style={{ background: 'linear-gradient(135deg,#FFFBE8,#FFE8CC)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: '0.78rem', color: '#FF6B35', fontWeight: 700 }}>
                  🪙 You'll earn {getPawCoinsEarned()} PawCoins on this order!
                </div>

                <button
                  onClick={() => showToast('🎉 Order placed! Feature coming soon.')}
                  style={{
                    width: '100%', padding: '14px', border: 'none', borderRadius: 12,
                    background: 'linear-gradient(135deg,#FF6B35,#6C4BF6)',
                    color: '#fff', fontFamily: 'Nunito, sans-serif', fontWeight: 800,
                    fontSize: '1rem', cursor: 'pointer'
                  }}>
                  🛒 Proceed to Checkout
                </button>

                <button onClick={() => router.push('/marketplace')}
                  style={{ width: '100%', padding: '10px', border: '1.5px solid #EDE8FF', borderRadius: 12, background: '#fff', color: '#6B7280', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', marginTop: 8 }}>
                  ← Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1E1347', color: '#fff', padding: '12px 18px', borderRadius: 14, fontWeight: 700, fontSize: '0.86rem', zIndex: 3000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}