import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { SITE_URL } from '@/config/site'

interface MetaTagsProps {
  title?: string
  description?: string
  canonicalUrl?: string
  ogImage?: string
}

/**
 * MetaTags component for SEO optimization
 * Handles meta tags, Open Graph, Twitter Cards, and structured data
 */
export function MetaTags({
  title,
  description,
  canonicalUrl,
  ogImage = '/og-image.png',
}: MetaTagsProps) {
  const { t, i18n } = useTranslation()

  const siteTitle = title || t('landing.title.line1') + ' ' + t('landing.title.line2')
  const siteDescription =
    description || t('landing.subtitle')
  // Use canonicalUrl or default to site constant (SSR-compatible)
  const siteUrl = canonicalUrl || SITE_URL
  const currentLang = i18n.language || 'en'

  // Structured data for LocalClaw (JSON-LD)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LocalClaw',
    description: siteDescription,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      t('landing.features.aiAgent.title'),
      t('landing.features.terminal.title'),
      t('landing.features.filesystem.title'),
      t('landing.features.privacy.title'),
    ],
    keywords: 'LocalClaw, AI Agent, Claude, Vercel AI SDK, Browser AI, OPFS, Privacy, Open Source',
    author: {
      '@type': 'Person',
      name: 'luozhouyang',
    },
    codeRepository: 'https://github.com/luozhouyang/localclaw',
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Cloudflare Workers',
  }

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{siteTitle}</title>
      <meta name="title" content={siteTitle} />
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content="LocalClaw, AI Agent, Claude, Vercel AI SDK, Browser AI, OPFS, Privacy, Open Source, TanStack Router, Cloudflare" />
      <meta name="author" content="luozhouyang" />
      <link rel="canonical" href={siteUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={currentLang} />
      <meta property="og:site_name" content="LocalClaw" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={siteUrl} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:creator" content="@luozhouyang" />

      {/* Additional SEO meta tags */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />

      {/* Favicon */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* Structured data (JSON-LD) for search engines */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  )
}
