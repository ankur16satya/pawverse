import Head from 'next/head'
import { useRouter } from 'next/router'

const DEFAULT_SEO = {
  title: 'PawVerse — The Social Universe for Your Fur Family 🐾',
  description: 'Connect with pet parents, share adorable moments, adopt pets, and shop the marketplace. Your all-in-one social app for dogs, cats, and more.',
  keywords: 'pet social media, pet community, adopt pets, dog reels, cat photos, pet marketplace, vet services',
  ogImage: 'https://pawversesocial.com/logo.png',
  ogType: 'website',
  twitterHandle: '@PawVerse'
}

export default function SEO({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  ogType, 
  canonical 
}) {
  const router = useRouter()
  
  const seoTitle = title ? `${title} | PawVerse` : DEFAULT_SEO.title
  const seoDescription = description || DEFAULT_SEO.description
  const seoKeywords = keywords || DEFAULT_SEO.keywords
  const seoImage = ogImage || DEFAULT_SEO.ogImage
  const seoType = ogType || DEFAULT_SEO.ogType
  const seoCanonical = canonical || `https://pawversesocial.com${router.asPath.split('?')[0]}`

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={seoCanonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seoType} />
      <meta property="og:url" content={seoCanonical} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={seoCanonical} />
      <meta property="twitter:title" content={seoTitle} />
      <meta property="twitter:description" content={seoDescription} />
      <meta property="twitter:image" content={seoImage} />
      
      {/* Favicon & Theme */}
      <link rel="icon" href="/logo.png" />
      <link rel="apple-touch-icon" href="/logo.png" />
      <meta name="theme-color" content="#FF6B35" />
    </Head>
  )
}
