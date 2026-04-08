// src/pages/api/upload.js
// Handles all file uploads to Cloudinary (images + videos)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { fileData, fileType, folder, resourceType } = req.body

    if (!fileData || !fileType) {
      return res.status(400).json({ error: 'Missing fileData or fileType' })
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Cloudinary env variables missing' })
    }

    const timestamp = Math.round(Date.now() / 1000)
    const uploadFolder = folder || 'pawverse'

    // Cloudinary requires params sorted alphabetically before appending secret
    const crypto = require('crypto')
    const paramsToSign = { folder: uploadFolder, timestamp }
    const signatureStr =
      Object.keys(paramsToSign)
        .sort()
        .map(k => `${k}=${paramsToSign[k]}`)
        .join('&') + apiSecret
    const signature = crypto.createHash('sha1').update(signatureStr).digest('hex')

    // Send to Cloudinary
    const formData = new URLSearchParams()
    formData.append('file', fileData)
    formData.append('api_key', apiKey)
    formData.append('timestamp', timestamp)
    formData.append('signature', signature)
    formData.append('folder', uploadFolder)

    const type = resourceType || (fileType.startsWith('video/') ? 'video' : 'image')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Cloudinary error:', data)
      return res.status(500).json({ error: data.error?.message || 'Upload failed' })
    }

    return res.status(200).json({ publicUrl: data.secure_url })
  } catch (err) {
    console.error('Upload handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}