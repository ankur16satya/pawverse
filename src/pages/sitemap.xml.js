import { supabase } from '../lib/supabase'

const SITE_URL = 'https://pawversesocial.com'

// Static, indexable public pages (NOT login/app/private routes).
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/adopt', changefreq: 'daily', priority: '0.9' },
  { path: '/marketplace', changefreq: 'daily', priority: '0.9' },
  { path: '/blogs', changefreq: 'daily', priority: '0.9' },
  { path: '/feed', changefreq: 'hourly', priority: '0.8' },
  { path: '/reels', changefreq: 'hourly', priority: '0.7' },
  { path: '/dehradun', changefreq: 'weekly', priority: '0.8' },
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },
]

function buildXml(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc>` +
        (u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : '') +
        `<changefreq>${u.changefreq}</changefreq>` +
        `<priority>${u.priority}</priority></url>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function getServerSideProps({ res }) {
  const urls = STATIC_PAGES.map((p) => ({
    loc: `${SITE_URL}${p.path}`,
    changefreq: p.changefreq,
    priority: p.priority,
  }))

  // Pull every blog post so each one gets its own indexable URL.
  // Use select('*') (same as the working blog pages) so a missing optional
  // column like updated_at can never make this query fail silently.
  try {
    const { data: blogs, error } = await supabase
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('sitemap blog query error:', error.message)
    }

    ;(blogs || []).forEach((b) => {
      if (!b || !b.slug) return
      const lastmodRaw = b.updated_at || b.created_at || ''
      const lastmod = lastmodRaw ? String(lastmodRaw).split('T')[0] : undefined
      urls.push({
        loc: `${SITE_URL}/blog/${escapeXml(b.slug)}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.8',
      })
    })
  } catch (err) {
    // If the query fails, still return the static sitemap rather than erroring.
    console.error('sitemap blog fetch failed', err)
  }

  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(buildXml(urls))
  res.end()

  return { props: {} }
}

// This component never renders; getServerSideProps writes the XML directly.
export default function Sitemap() {
  return null
}
