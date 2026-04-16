// Diagnostic endpoint — checks what's actually in the reels table
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Test 1: raw count with no filters
  const { count: totalCount, error: countErr } = await supabase
    .from('reels')
    .select('*', { count: 'exact', head: true })

  // Test 2: fetch with no joins
  const { data: rawReels, error: rawErr } = await supabase
    .from('reels')
    .select('id, pet_id, user_id, video_url, caption, created_at')
    .limit(10)

  // Test 3: fetch with pets join
  const { data: joinedReels, error: joinErr } = await supabase
    .from('reels')
    .select('id, pet_id, user_id, video_url, caption, pets(pet_name, emoji)')
    .limit(10)

  // Test 4: fetch with comments join (this might be the failing part)
  const { data: withComments, error: commentsErr } = await supabase
    .from('reels')
    .select('id, comments(count)')
    .limit(5)

  res.status(200).json({
    test1_total_count: { count: totalCount, error: countErr },
    test2_raw: { rows: rawReels?.length ?? 0, data: rawReels, error: rawErr },
    test3_with_pets_join: { rows: joinedReels?.length ?? 0, data: joinedReels, error: joinErr },
    test4_with_comments: { data: withComments, error: commentsErr },
  })
}
