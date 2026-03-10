# LocalClaw

> **Browser-based AI Agent Terminal** — A privacy-focused AI agent that runs entirely in your browser.

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Built with](https://img.shields.io/badge/built%20with-TanStack%20Router-orange)](https://tanstack.com/router)
[![Deployed on](https://img.shields.io/badge/deployed%20on-Cloudflare%20Workers-orange)](https://workers.cloudflare.com)
[![AI SDK](https://img.shields.io/badge/powered%20by-Vercel%20AI%20SDK-orange)](https://sdk.vercel.ai/docs)


## Features

### Core Capabilities

- **AI Agent** — Full-featured AI assistant powered by Vercel AI SDK with support for multiple LLM providers (OpenAI, Anthropic, and any OpenAI-compatible API)
- **File System Access** — Browser-based file operations using Origin Private File System (OPFS) for secure local storage
- **Bash Terminal** — Execute shell commands directly from the browser with real-time output
- **Task Management** — Built-in task queue and scheduler for background operations
- **Cron Jobs** — Schedule recurring tasks with a visual cron editor
- **Multi-threaded Chats** — Manage multiple AI conversation threads simultaneously

### Privacy & Security

- **No Server Storage** — All data stored locally in your browser using OPFS
- **Client-side Encryption** — Your API keys and sensitive data are encrypted before storage
- **No Tracking** — Zero analytics, no telemetry, complete privacy
- **Open Source** — Fully auditable codebase under MIT license

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [TanStack Router](https://tanstack.com/router) | File-based routing with type safety |
| [TanStack Start](https://tanstack.com/start) | Full-stack React framework |
| [Cloudflare Workers](https://workers.cloudflare.com) | Serverless edge deployment |
| [Vercel AI SDK](https://sdk.vercel.ai/docs) | AI/LLM integration layer |
| [Tailwind CSS v4](https://tailwindcss.com) | Utility-first styling |
| [Radix UI](https://radix-ui.com) | Accessible components |
| [i18next](https://www.i18next.com) | Internationalization |
| [Vitest](https://vitest.dev) | Unit testing |
| [Playwright](https://playwright.dev) | E2E testing |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [pnpm](https://pnpm.io) >= 9

### Installation

```bash
# Clone the repository
git clone https://github.com/luozhouyang/localclaw.git
cd localclaw

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`

### Building for Production

```bash
# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

### Deployment

```bash
# Deploy to Cloudflare Workers
pnpm deploy
```

## Testing

```bash
# Run all tests
pnpm test:all

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# E2E tests only
pnpm test:e2e

# E2E tests with UI
pnpm test:e2e:ui

# E2E tests in debug mode
pnpm test:e2e:debug
```

## Project Structure

```
localclaw/
├── src/
│   ├── agent/          # AI agent loop and logic
│   ├── chat/           # Chat thread management
│   ├── components/     # React components (UI, dashboard, settings)
│   ├── config/         # Configuration and providers
│   ├── contexts/       # React contexts
│   ├── crontab/        # Cron job scheduler
│   ├── hooks/          # Custom React hooks
│   ├── i18n/           # Internationalization
│   ├── infra/          # Infrastructure (filesystem, crypto)
│   ├── lib/            # Utility functions
│   ├── memory/         # Memory management
│   ├── routes/         # TanStack Router file-based routes
│   ├── skills/         # Agent skills system
│   ├── tasks/          # Task queue and executor
│   ├── tools/          # AI tools (file, bash operations)
│   ├── types/          # TypeScript type definitions
│   └── workers/        # Web workers
├── e2e/                # End-to-end tests
├── tests/              # Unit tests
├── integration_tests/  # Integration tests
├── public/             # Static assets
├── wrangler.jsonc      # Cloudflare Workers config
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript config
└── package.json
```

## Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# AI Provider Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Optional: Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Custom provider
CUSTOM_API_KEY=your_custom_api_key
CUSTOM_BASE_URL=https://your-llm-api.com
```

> **Note:** API keys are stored encrypted in your browser's OPFS, not in environment variables for end users. The `.env.local` is only for development.

## Skills System

LocalClaw features a pluggable skills system that extends agent capabilities:

- **Built-in Skills** — Brainstorming, TDD, code review, planning, git worktrees
- **Skill Discovery** — Automatic skill suggestion based on tasks
- **Parallel Agents** — Dispatch multiple agents for independent tasks

## Available Tools

The agent has access to these built-in tools:

| Tool | Description |
|------|-------------|
| `read_file` | Read file contents |
| `write_file` | Create or overwrite files |
| `edit_file` | Make precise edits to files |
| `list_files` | List directory contents |
| `search_files` | Search files with glob patterns |
| `bash` | Execute shell commands |

## Browser Support

LocalClaw requires modern browser features:

| Browser | Version |
|---------|---------|
| Chrome | 120+ |
| Edge | 120+ |
| Firefox | 122+ |
| Safari | 17.2+ |

Required features:
- [Origin Private File System (OPFS)](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)

## Internationalization (i18n)

LocalClaw supports multiple languages. Current translations:

- 🇺🇸 English (default)
- 🇨🇳 简体中文

To add a new language:

1. Add translation files in `src/i18n/locales/`
2. Update `src/i18n/index.ts` with the new language
3. Add language switcher option in `src/components/LanguageSwitcher.tsx`

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style (Prettier + ESLint)
- Write tests for new features
- Update documentation as needed
- Use TypeScript strict mode

## Roadmap

- [ ] Plugin system for community extensions
- [ ] Voice input/output support
- [ ] Multi-modal AI (images, audio)
- [ ] Collaborative sessions
- [ ] Mobile app (React Native)
- [ ] Desktop app (Tauri)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [TanStack](https://tanstack.com) for the amazing router and start framework
- [Vercel](https://vercel.com) for the AI SDK
- [Cloudflare](https://cloudflare.com) for Workers deployment
- All open-source contributors

## Contact

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/luozhouyang/localclaw/issues)
- **Discussions**: [Community discussions](https://github.com/luozhouyang/localclaw/discussions)

---

<p align="center">
  <strong>LocalClaw</strong> — Your AI, your browser, your privacy.
</p>
