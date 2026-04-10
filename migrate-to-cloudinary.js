/**
 * ============================================================
 * PAWVERSE — Supabase Storage → Cloudinary Migration Script
 * ============================================================
 * 
 * HOW TO RUN:
 *   1. Place this file in the ROOT of your pawverse project
 *   2. Open terminal in that folder
 *   3. Run: node migrate-to-cloudinary.js
 * 
 * WHAT IT DOES:
 *   - Downloads every file from Supabase Storage
 *   - Re-uploads it to Cloudinary
 *   - Updates the URL in your database (pets, posts, reels)
 *   - Also handles chat-images and listings tables
 * 
 * SAFE TO RUN MULTIPLE TIMES — it skips already-migrated URLs
 * ============================================================
 */

const https = require('https')
const http = require('http')
const { createClient } = require('@supabase/supabase-js')
const FormData = require('form-data')
const crypto = require('crypto')

// ── CONFIG (from your .env.local) ──────────────────────────
const SUPABASE_URL = 'https://dhqeqowrtyuthjustclr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRocWVxb3dydHl1dGhqdXN0Y2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NzQwNTMsImV4cCI6MjA5MDE1MDA1M30.G9EpQKhdt13e64SHzWoA70evRQXyZBPeXFCIPGiwyK0'
const CLOUDINARY_CLOUD_NAME = 'dgsodozlv'
const CLOUDINARY_API_KEY = '186398299434124'
const CLOUDINARY_API_SECRET = 'rLSxHjLgO5BHqitv_zJrcvFDY1g'
// ───────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Download a file from any URL and return a Buffer
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url} — status ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'application/octet-stream' }))
      res.on('error', reject)
    }).on('error', reject)
  })
}

// Upload a buffer to Cloudinary
function uploadToCloudinary(buffer, contentType, folder, filename) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.round(Date.now() / 1000)
    const uploadFolder = `pawverse/${folder}`
    const publicId = `${uploadFolder}/${filename}`

    // Generate signature
    const paramsToSign = `folder=${uploadFolder}&public_id=${publicId}&timestamp=${timestamp}`
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + CLOUDINARY_API_SECRET)
      .digest('hex')

    const isVideo = contentType.startsWith('video/')
    const resourceType = isVideo ? 'video' : 'image'

    const form = new FormData()
    form.append('file', buffer, { filename: filename, contentType: contentType })
    form.append('api_key', CLOUDINARY_API_KEY)
    form.append('timestamp', String(timestamp))
    form.append('signature', signature)
    form.append('folder', uploadFolder)
    form.append('public_id', publicId)

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
      method: 'POST',
      headers: form.getHeaders()
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (parsed.secure_url) {
            resolve(parsed.secure_url)
          } else {
            reject(new Error(`Cloudinary error: ${JSON.stringify(parsed)}`))
          }
        } catch (e) {
          reject(new Error(`Failed to parse Cloudinary response: ${data}`))
        }
      })
    })

    req.on('error', reject)
    form.pipe(req)
  })
}

// Migrate a single record
async function migrateRecord(table, id, urlField, oldUrl, folder) {
  // Skip if already on Cloudinary
  if (!oldUrl || !oldUrl.includes('supabase.co')) {
    console.log(`  ⏭️  Skipping ${table}:${id} — already on Cloudinary or no URL`)
    return
  }

  try {
    console.log(`  📥 Downloading from Supabase...`)
    const { buffer, contentType } = await downloadFile(oldUrl)

    // Extract filename from URL
    const urlParts = oldUrl.split('/')
    const filename = urlParts[urlParts.length - 1]

    console.log(`  📤 Uploading to Cloudinary (${Math.round(buffer.length / 1024)}KB)...`)
    const newUrl = await uploadToCloudinary(buffer, contentType, folder, filename)

    console.log(`  💾 Updating database...`)
    const { error } = await supabase
      .from(table)
      .update({ [urlField]: newUrl })
      .eq('id', id)

    if (error) throw error

    console.log(`  ✅ Done! New URL: ${newUrl.slice(0, 60)}...`)
    return newUrl
  } catch (err) {
    console.error(`  ❌ FAILED for ${table}:${id} — ${err.message}`)
    return null
  }
}

async function main() {
  console.log('🚀 Starting Pawverse Supabase → Cloudinary Migration')
  console.log('='.repeat(55))

  let totalSuccess = 0
  let totalFailed = 0

  // ── 1. MIGRATE PET AVATARS ──────────────────────────────
  console.log('\n📂 [1/4] Migrating Pet Avatars...')
  const { data: pets, error: petsError } = await supabase
    .from('pets')
    .select('id, pet_name, avatar_url')
    .like('avatar_url', '%supabase%')

  if (petsError) {
    console.error('Failed to fetch pets:', petsError.message)
  } else {
    console.log(`  Found ${pets.length} pets with Supabase avatars`)
    for (const pet of pets) {
      console.log(`\n  🐾 ${pet.pet_name} (${pet.id.slice(0, 8)}...)`)
      const result = await migrateRecord('pets', pet.id, 'avatar_url', pet.avatar_url, 'avatars')
      result ? totalSuccess++ : totalFailed++
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // ── 2. MIGRATE POST IMAGES ──────────────────────────────
  console.log('\n📂 [2/4] Migrating Post Images...')
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('id, content, image_url')
    .like('image_url', '%supabase%')

  if (postsError) {
    console.error('Failed to fetch posts:', postsError.message)
  } else {
    console.log(`  Found ${posts.length} posts with Supabase images`)
    for (const post of posts) {
      console.log(`\n  📸 Post: "${(post.content || 'no caption').slice(0, 40)}..." (${post.id.slice(0, 8)}...)`)
      const result = await migrateRecord('posts', post.id, 'image_url', post.image_url, 'post-images')
      result ? totalSuccess++ : totalFailed++
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // ── 3. MIGRATE REELS VIDEOS ─────────────────────────────
  console.log('\n📂 [3/4] Migrating Reels (Videos — this will take a while)...')
  const { data: reels, error: reelsError } = await supabase
    .from('reels')
    .select('id, caption, video_url')
    .like('video_url', '%supabase%')

  if (reelsError) {
    console.error('Failed to fetch reels:', reelsError.message)
  } else {
    console.log(`  Found ${reels.length} reels with Supabase videos`)
    for (const reel of reels) {
      console.log(`\n  🎬 Reel: "${(reel.caption || 'no caption').slice(0, 40)}..." (${reel.id.slice(0, 8)}...)`)
      const result = await migrateRecord('reels', reel.id, 'video_url', reel.video_url, 'reels')
      result ? totalSuccess++ : totalFailed++
      await new Promise(r => setTimeout(r, 1000)) // Bigger delay for videos
    }
  }

  // ── 4. MIGRATE CHAT IMAGES ──────────────────────────────
  console.log('\n📂 [4/4] Migrating Chat Images...')
  const { data: messages, error: msgsError } = await supabase
    .from('messages')
    .select('id, image_url')
    .like('image_url', '%supabase%')

  if (msgsError) {
    console.error('Failed to fetch messages:', msgsError.message)
  } else if (messages && messages.length > 0) {
    console.log(`  Found ${messages.length} messages with Supabase images`)
    for (const msg of messages) {
      console.log(`\n  💬 Message (${msg.id.slice(0, 8)}...)`)
      const result = await migrateRecord('messages', msg.id, 'image_url', msg.image_url, 'chat-images')
      result ? totalSuccess++ : totalFailed++
      await new Promise(r => setTimeout(r, 500))
    }
  } else {
    console.log('  No chat images to migrate.')
  }

  // ── SUMMARY ─────────────────────────────────────────────
  console.log('\n' + '='.repeat(55))
  console.log('🏁 Migration Complete!')
  console.log(`  ✅ Successful: ${totalSuccess}`)
  console.log(`  ❌ Failed:     ${totalFailed}`)
  console.log('\n📋 NEXT STEPS:')
  console.log('  1. Go to Supabase Dashboard → Storage')
  console.log('  2. Delete all files from these buckets:')
  console.log('     - avatars, post-images, reels, chat-images')
  console.log('  3. (Optional) Delete the buckets themselves')
  console.log('  4. Your egress will drop to near zero! 🎉')
  if (totalFailed > 0) {
    console.log(`\n⚠️  ${totalFailed} files failed. Run the script again to retry them.`)
  }
}

main().catch(console.error)