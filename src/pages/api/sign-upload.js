// src/pages/api/sign-upload.js
// Generates a signature for Cloudinary direct browser uploads
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { paramsToSign } = req.body
    
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    
    if (!apiSecret || !cloudName || !apiKey) {
      return res.status(500).json({ error: 'Cloudinary env variables missing on server' })
    }

    // Cloudinary requires params sorted alphabetically before appending secret
    const signatureStr =
      Object.keys(paramsToSign)
        .sort()
        .map(k => `${k}=${paramsToSign[k]}`)
        .join('&') + apiSecret
    
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex')

    return res.status(200).json({ 
      signature, 
      timestamp: paramsToSign.timestamp,
      cloudName,
      apiKey
    })
  } catch (err) {
    console.error('Signing error:', err)
    return res.status(500).json({ error: err.message })
  }
}
