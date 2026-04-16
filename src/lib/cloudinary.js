// src/lib/cloudinary.js
// Uploads files to Cloudinary with compression for speed

/**
 * Compress an image file before uploading
 */
async function compressImage(file, maxWidthPx = 1080, quality = 0.82) {
  return new Promise((resolve) => {
    // If already small enough, skip compression
    if (file.size < 300 * 1024) { resolve(file); return }

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img

      // Scale down if too wide
      if (width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width)
        width = maxWidthPx
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file) // compression made it bigger, use original
          } else {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          }
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

/**
 * Upload a file to Cloudinary directly from the client
 * Images are compressed before upload for speed
 * @param {File} file - The file object from input
 * @param {string} folder - e.g. 'avatars', 'post-images', 'reels'
 * @param {function} onProgress - optional callback(percent) for progress
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToCloudinary(file, folder = 'pawverse', onProgress = null) {
  try {
    const timestamp = Math.round(Date.now() / 1000)
    const uploadFolder = `pawverse/${folder}`

    // 1. Compress image before upload (skip for videos)
    let fileToUpload = file
    if (file.type.startsWith('image/')) {
      fileToUpload = await compressImage(file)
      const savedMB = ((file.size - fileToUpload.size) / 1024 / 1024).toFixed(1)
      if (savedMB > 0) console.log(`🗜️ Compressed: saved ${savedMB}MB`)
    }

    const transformation = file.type.startsWith('video/')
      ? 'c_limit,w_720,q_auto:eco,vc_auto'
      : 'c_limit,w_1080,q_auto:eco,f_auto'

    // 2. Get signature from our API
    const signRes = await fetch('/api/sign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paramsToSign: { folder: uploadFolder, timestamp, transformation }
      })
    })
    const signData = await signRes.json()
    if (!signRes.ok) throw new Error(signData.error || 'Failed to get upload signature')

    // 3. Upload to Cloudinary with progress tracking
    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('api_key', signData.apiKey)
    formData.append('timestamp', signData.timestamp)
    formData.append('signature', signData.signature)
    formData.append('folder', uploadFolder)
    formData.append('transformation', transformation)

    const resourceType = file.type.startsWith('video/') ? 'video' : 'image'

    // Use XMLHttpRequest for progress tracking
    const cloudData = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = Math.round((e.loaded / e.total) * 100)
          onProgress(percent)
        }
      })

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data)
          } else {
            reject(new Error(data.error?.message || 'Upload failed'))
          }
        } catch {
          reject(new Error('Invalid response from Cloudinary'))
        }
      })

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`)
      xhr.send(formData)
    })

    return cloudData.secure_url

  } catch (err) {
    console.error('Upload error:', err)
    throw err
  }
}