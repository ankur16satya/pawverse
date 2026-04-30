import Head from 'next/head'
import { useRouter } from 'next/router'

const SITE_URL = 'https://pawversesocial.com'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`

const DEFAULT_SEO = {
  title: "PawVerse — India's Pet Social Network | Adopt, Shop & Connect",
  description: "Join PawVerse — India's all-in-one pet community. Adopt dogs & cats near you, shop the pet marketplace, track health records & connect with Dehradun's pet parents.",
  keywords: 'pet social network India, pet adoption India, pet marketplace, dog adoption Dehradun, cat adoption, pet community India, pet health tracker, PawVerse',
  ogImage: DEFAULT_OG_IMAGE,
  ogType: 'website',
  twitterHandle: '@PawVerse'
}

export default function SEO({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  ogType,
  canonical,
  article,
  publishedTime,
  modifiedTime,
  author,
  noindex,
}) {
  const router = useRouter()
  
  const seoTitle = title
    ? (title.includes('PawVerse') ? title : `${title} | PawVerse`)
    : DEFAULT_SEO.title
  const seoDescription = description || DEFAULT_SEO.description
  const seoKeywords = keywords || DEFAULT_SEO.keywords
  const seoImage = ogImage || DEFAULT_SEO.ogImage
  const seoType = article ? 'article' : (ogType || DEFAULT_SEO.ogType)
  const seoCanonical = canonical || `${SITE_URL}${router.asPath.split('?')[0]}`
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow'

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      <meta name="robots" content={robotsContent} />
      <meta name="author" content={author || 'PawVerse Social'} />
      <link rel="canonical" href={seoCanonical} />
      <meta name="google-site-verification" content="53Zgy0JFDm-WXa0dbyKUuovurmvp9Id-zsPLW84ueio" />

      {/* Language & Locale */}
      <meta httpEquiv="content-language" content="en-IN" />
      <meta name="geo.region" content="IN-UT" />
      <meta name="geo.placename" content="Dehradun" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seoType} />
      <meta property="og:url" content={seoCanonical} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={seoTitle} />
      <meta property="og:site_name" content="PawVerse Social" />
      <meta property="og:locale" content="en_IN" />
      {article && publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {article && modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {article && author && <meta property="article:author" content={author} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={DEFAULT_SEO.twitterHandle} />
      <meta name="twitter:creator" content={DEFAULT_SEO.twitterHandle} />
      <meta name="twitter:url" content={seoCanonical} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      <meta name="twitter:image:alt" content={seoTitle} />
      
      {/* Favicon & Theme */}
      <link rel="icon" href="/logo.png" />
      <link rel="apple-touch-icon" href="/logo.png" />
      <meta name="theme-color" content="#FF6B35" />
    </Head>
  )
}
