import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { url } = req.body
    if (!url || !url.includes('cloudinary.com')) return res.status(400).json({ error: 'Invalid URL' })

    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY

    if (!apiSecret || !cloudName || !apiKey) {
      return res.status(500).json({ error: 'Cloudinary env missing' })
    }

    // Extract public_id and resource_type
    const resourceType = url.includes('/video/') ? 'video' : 'image'
    const path = url.split('/upload/')[1]
    const withoutVersion = path.replace(/^v\d+\//, '')
    const public_id = withoutVersion.substring(0, withoutVersion.lastIndexOf('.')) || withoutVersion

    const timestamp = Math.round(Date.now() / 1000)
    
    // Cloudinary signature for destroy
    const signatureStr = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex')

    // Call Cloudinary destroy endpoint
    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_id,
        api_key: apiKey,
        timestamp,
        signature
      })
    })

    const data = await cloudRes.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('Delete media error:', err)
    return res.status(500).json({ error: err.message })
  }
}
