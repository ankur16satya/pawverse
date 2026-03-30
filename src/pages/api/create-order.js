import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' })

  const { amount, currency = 'INR', receipt } = req.body

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay needs amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    })
    res.status(200).json({ orderId: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error('Razorpay order error:', err)
    res.status(500).json({ error: 'Failed to create payment order' })
  }
}