import { Helmet } from 'react-helmet-async'

/**
 * GeoMetaTags component for GEO (Generative Engine Optimization)
 * Optimizes content for AI search engines and LLM-based discovery
 */
export function GeoMetaTags() {
  // Structured data for AI/LLM discovery
  const aiStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LocalClaw',
    alternateName: ['Local Claw', 'LocalClaw AI'],
    description: 'LocalClaw is a browser-based AI agent terminal that runs entirely in your browser. Built with TanStack Router, Cloudflare Workers, and Vercel AI SDK. Features encrypted local storage using OPFS (Origin Private File System) for maximum privacy.',
    applicationCategory: 'DeveloperApplication',
    subCategory: 'Terminal',
    operatingSystem: 'Web Browser',
    browserRequirements: 'Requires JavaScript. Supports modern browsers (Chrome, Firefox, Safari, Edge).',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/Available',
    },
    featureList: [
      'Browser-based AI agent terminal',
      'Vercel AI SDK integration for multi-provider support',
      'OPFS (Origin Private File System) for local storage',
      'Cloudflare Workers for edge computing',
      'TanStack Router for navigation',
      'Encrypted API key storage with master password',
      'Credential Management API for auto-unlock',
      'No server-side data collection',
      'Open source (GitHub)',
    ],
    keywords: 'LocalClaw, AI Agent, Claude, Vercel AI SDK, Browser AI, OPFS, Privacy, Open Source, TanStack Router, Cloudflare Workers, Edge AI, Local AI, Terminal, Developer Tools',
    audience: {
      '@type': 'Audience',
      audienceType: 'Developers, Engineers, AI enthusiasts',
    },
    useCase: [
      'Code generation and assistance',
      'Terminal commands via AI',
      'File system operations',
      'Multi-provider AI access',
      'Privacy-focused AI interactions',
    ],
    technology: [
      'TypeScript',
      'React',
      'TanStack Router',
      'Cloudflare Workers',
      'Vercel AI SDK',
      'OPFS',
      'i18next',
    ],
    codeRepository: 'https://github.com/luozhouyang/localclaw',
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'Cloudflare Workers',
    releaseNotes: 'Browser-based AI terminal with encrypted storage and multi-provider support',
  }

  // FAQ structured data for rich snippets
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is LocalClaw?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LocalClaw is a browser-based AI agent terminal that runs entirely in your browser. It combines Vercel AI SDK, TanStack Router, and Cloudflare Workers to provide a privacy-focused AI experience with encrypted local storage.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is LocalClaw free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, LocalClaw is completely free and open source. You only need to provide your own API keys for AI providers.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does LocalClaw protect privacy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LocalClaw runs entirely in your browser with no server-side data collection. API keys are encrypted locally using the Web Crypto API and stored in OPFS (Origin Private File System). A master password protects access to your encrypted keys.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which AI providers does LocalClaw support?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'LocalClaw uses Vercel AI SDK, supporting multiple providers including Anthropic Claude, OpenAI, and any provider compatible with the SDK.',
        },
      },
    ],
  }

  return (
    <Helmet>
      {/* AI/LLM optimization meta tags */}
      <meta name="ai:bot" content="index, follow" />
      <meta name="ai:translator" content="index, follow" />

      {/* Perplexity-specific optimization */}
      <meta name="perplexity:topic" content="AI Developer Tools" />

      {/* ChatGPT/SearchGPT optimization */}
      <meta name="chatbot:category" content="Developer Tools, AI Terminal" />

      {/* Extended structured data for AI discovery */}
      <script type="application/ld+json">{JSON.stringify(aiStructuredData)}</script>

      {/* FAQ structured data for rich snippets */}
      <script type="application/ld+json">{JSON.stringify(faqData)}</script>
    </Helmet>
  )
}
