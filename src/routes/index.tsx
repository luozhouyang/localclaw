import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Zap,
  Server,
  Route as RouteIcon,
  Shield,
  Sparkles,
  Terminal,
  ArrowRight,
  Cpu,
  Code2,
  Bot,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const features = [
    {
      icon: <Bot className="w-10 h-10 text-orange-500" />,
      title: 'AI-Powered Agent',
      description:
        'Built on Vercel AI SDK with advanced language model capabilities. Experience natural, context-aware conversations.',
    },
    {
      icon: <Terminal className="w-10 h-10 text-amber-400" />,
      title: 'Browser-Based Terminal',
      description:
        'Full terminal emulation in the browser via OPFS and bash-tool integration. Execute commands seamlessly.',
    },
    {
      icon: <Cpu className="w-10 h-10 text-coral" />,
      title: 'Local File System',
      description:
        'Direct access to your local files through AgentFS and OPFS. Read, write, and manage files with AI assistance.',
    },
    {
      icon: <Code2 className="w-10 h-10 text-orange-500" />,
      title: 'Developer First',
      description:
        'Built for developers by developers. Type-safe, extensible, and open source. Integrate with your workflow.',
    },
    {
      icon: <Zap className="w-10 h-10 text-amber-400" />,
      title: 'Lightning Fast',
      description:
        'Powered by Cloudflare Workers edge computing. Low latency responses from anywhere in the world.',
    },
    {
      icon: <Shield className="w-10 h-10 text-orange-500" />,
      title: 'Privacy Focused',
      description:
        'Your data stays local. Files are processed in-browser, and API keys are stored securely in your environment.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#0D0D0D] overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 glass-strong border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Terminal className="w-8 h-8 text-orange-500" />
                <div className="absolute inset-0 blur-lg bg-orange-500/50 -z-10" />
              </div>
              <span className="font-display text-xl font-bold text-white glow-orange-text">
                LOCALCLAW
              </span>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 rounded-lg transition-all duration-300 hover:glow-orange font-code text-sm group"
            >
              <span>LAUNCH</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-24 px-6 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full glass border-glow">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-400 font-code">AI AGENT FRAMEWORK</span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-5xl md:text-7xl font-black mb-6">
            <span className="text-white">YOUR LOCAL</span>
            <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent glow-orange-text">
              AI AGENT
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-stone-300 mb-4 font-light max-w-3xl mx-auto">
            A fully browser-based AI agent powered by
            <span className="text-orange-400"> Vercel AI SDK</span>
          </p>

          <p className="text-base text-stone-400 max-w-2xl mx-auto mb-10 font-code">
            LocalClaw combines OPFS, AgentFS, and bash-tool to create a powerful
            AI assistant that runs entirely in your browser. No installation required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-lg transition-all duration-300 hover:glow-orange text-lg group"
            >
              <Terminal className="w-5 h-5" />
              <span>START AGENT</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-8 py-4 glass hover:glass-strong text-orange-400 border border-orange-500/30 rounded-lg transition-all duration-300 text-lg"
            >
              <Code2 className="w-5 h-5" />
              <span>VIEW SOURCE</span>
            </a>
          </div>

          {/* Tech stack indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-stone-500 font-code text-sm">
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              TanStack Start
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              Cloudflare Workers
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-coral animate-pulse" style={{ animationDelay: '0.4s' }} />
              Vercel AI SDK
            </span>
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
              OPFS / AgentFS
            </span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              POWERFUL CAPABILITIES
            </h2>
            <p className="text-stone-400 font-code">
              Everything you need for AI-powered development
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group glass border-glow-hover rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 relative">
                  <div className="absolute inset-0 blur-lg bg-orange-400/20 group-hover:bg-orange-400/30 transition-colors rounded-full" />
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-stone-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Terminal Preview Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong rounded-xl overflow-hidden border border-orange-500/30 glow-orange">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-stone-900/80 border-b border-orange-500/20">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="ml-4 text-xs text-stone-500 font-code">localclaw-agent</span>
            </div>
            {/* Terminal content */}
            <div className="p-6 font-code text-sm space-y-2 bg-stone-950/50">
              <div className="flex items-center gap-2">
                <span className="text-orange-400">➜</span>
                <span className="text-stone-300">~</span>
                <span className="text-stone-500">localclaw init</span>
              </div>
              <div className="text-amber-400">
                ✓ Agent initialized successfully
              </div>
              <div className="text-stone-400">
                ✓ Connected to OpenAI GPT-4o
              </div>
              <div className="text-stone-400">
                ✓ OPFS filesystem mounted
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-orange-400">➜</span>
                <span className="text-stone-300">~</span>
                <span className="text-stone-500">_</span>
                <span className="w-2 h-4 bg-orange-400 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-orange-500/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-stone-500 text-sm font-code">
            Built with <span className="text-orange-400">TanStack Start</span> +{' '}
            <span className="text-amber-400">Cloudflare Workers</span> +{' '}
            <span className="text-coral">Vercel AI SDK</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
