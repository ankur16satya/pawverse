// src/lib/cloudinary.js
// Helper to upload any file to Cloudinary directly from the browser
// This bypasses Vercel's 4.5MB API limit

/**
 * Upload a file to Cloudinary directly from the client
 * @param {File} file - The file object from input
 * @param {string} folder - e.g. 'avatars', 'post-images', 'reels'
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToCloudinary(file, folder = 'pawverse') {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const uploadFolder = `pawverse/${folder}`
    
    // 1. Get signature from our API
    // This keeps the API_SECRET secure on the server
    const signRes = await fetch('/api/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paramsToSign: {
          folder: uploadFolder,
          timestamp: timestamp
        }
      })
    })
    
    const signData = await signRes.json()
    if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload signature')

    // 2. Upload directly to Cloudinary using FormData
    // This bypasses the server-side size limits
    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', signData.apiKey)
    formData.append('timestamp', signData.timestamp)
    formData.append('signature', signData.signature)
    formData.append('folder', uploadFolder)

    const resourceType = file.type.startsWith('video/') ? 'video' : 'image'
    
    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    const cloudData = await cloudRes.json()
    if (!cloudRes.ok) {
      console.error('Cloudinary error:', cloudData)
      throw new Error(cloudData.error?.message || 'Upload failed')
    }

    return cloudData.secure_url
  } catch (err) {
    console.error('Upload process error:', err)
    throw err
  }
}