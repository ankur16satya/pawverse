// src/lib/cloudinary.js
// Helper to upload any file to Cloudinary via your API route
// Use this in ALL pages instead of supabase.storage

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file object from input
 * @param {string} folder - e.g. 'avatars', 'post-images', 'reels', 'chat-images', 'listings', 'reports'
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export async function uploadToCloudinary(file, folder = 'pawverse') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        const fileData = reader.result // base64 string like "data:image/jpeg;base64,..."
        const resourceType = file.type.startsWith('video/') ? 'video' : 'image'

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData,
            fileType: file.type,
            folder: `pawverse/${folder}`,
            resourceType,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          reject(new Error(data.error || 'Upload failed'))
          return
        }

        resolve(data.publicUrl)
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}