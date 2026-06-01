// TEMPORARY DEBUG ENDPOINT — delete after diagnosing the sitemap.
// Visit: http://localhost:3000/api/debug-blogs
import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  const out = {}

  // 1) select('*') — exactly like the working blog pages
  const all = await supabase.from('blogs').select('*').order('created_at', { ascending: false })
  out.starQuery = {
    error: all.error ? all.error.message : null,
    count: (all.data || []).length,
    // show just the safe fields of the first few rows so we can see slug/role/columns
    sample: (all.data || []).slice(0, 5).map(b => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      has_updated_at: Object.prototype.hasOwnProperty.call(b, 'updated_at'),
      created_at: b.created_at,
      author_name: b.author_name,
    })),
    columns: all.data && all.data[0] ? Object.keys(all.data[0]) : [],
  }

  // 2) the exact narrowed query the old sitemap used
  const narrow = await supabase.from('blogs').select('slug, updated_at, created_at')
  out.narrowQuery = {
    error: narrow.error ? narrow.error.message : null,
    count: (narrow.data || []).length,
  }

  res.setHeader('Content-Type', 'application/json')
  res.status(200).json(out)
}