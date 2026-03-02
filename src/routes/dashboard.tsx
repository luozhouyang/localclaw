import { createFileRoute } from '@tanstack/react-router'
import { ChatTab } from '@/components/dashboard/ChatTab'
import { FilesTab } from '@/components/dashboard/FilesTab'
import { TasksTab } from '@/components/dashboard/TasksTab'
import { SkillsTab } from '@/components/dashboard/SkillsTab'
import { TerminalTab } from '@/components/dashboard/TerminalTab'
import { MemoryTab } from '@/components/dashboard/MemoryTab'
import { CrontabTab } from '@/components/dashboard/CrontabTab'
import { ComingSoonTab } from '@/components/dashboard/ComingSoonTab'
import { MasterKeyGuard } from '@/components/dashboard/MasterKeyGuard'
import { MasterKeyProvider } from '@/contexts/master-key-context'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { MessageSquare, Code2, Bot, Monitor, Settings, Terminal, FolderOpen, CheckSquare, Clock, Brain, Puzzle, Key } from 'lucide-react'
import { useEffect, useState } from 'react'
import { taskScheduler } from '@/tasks'
import { useTranslation } from 'react-i18next'
import { ProviderSettings } from '@/components/settings/provider-settings'

/**
 * Initialize filesystem (client-side only)
 * Sets up OPFS filesystem and chat storage structure
 */
async function initFilesystem() {
  const { getFilesystem } = await import('@/infra/fs')
  const fs = await getFilesystem()
  // Initialize chat storage structure
  const { threadManager } = await import('@/chat/thread-manager')
  await threadManager.initialize()
  return fs
}

/**
 * Dynamic import for task definitions (client-side only)
 * Prevents loading during SSR
 */
let taskDefinitionsLoaded = false
async function loadTaskDefinitions() {
  if (taskDefinitionsLoaded || typeof window === 'undefined') return
  await import('@/tasks/definitions')
  taskDefinitionsLoaded = true
}

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
  ssr: false
})

/**
 * Dashboard component
 * Main application container with tabs for different features
 */
function Dashboard() {
  // Initialize filesystem and task system on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initFilesystem()
        // Load task definitions dynamically (client-side only)
        await loadTaskDefinitions()
        await taskScheduler.initialize()
      } catch (err) {
        // Initialization error handled silently
      }
    }
    init()
  }, [])

  return (
    <MasterKeyProvider>
      <MasterKeyGuard>
        <DashboardContent />
      </MasterKeyGuard>
    </MasterKeyProvider>
  )
}

// Primary tabs type
type PrimaryTab = 'chat' | 'code' | 'agents' | 'os' | 'settings'

/**
 * Dashboard content component
 * Contains header with centered tabs and sub-tabs navigation
 */
function DashboardContent() {
  const { t } = useTranslation()
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('chat')

  // Sub-tabs state
  const [agentsSubTab, setAgentsSubTab] = useState('memory')
  const [osSubTab, setOsSubTab] = useState('files')
  const [settingsSubTab, setSettingsSubTab] = useState('providers')

  // Render content based on primary tab and sub-tab
  const renderContent = () => {
    switch (primaryTab) {
      case 'chat':
        return <ChatTab />
      case 'code':
        return <ComingSoonTab />
      case 'agents':
        return agentsSubTab === 'memory' ? <MemoryTab /> : <SkillsTab />
      case 'os':
        switch (osSubTab) {
          case 'files':
            return <FilesTab />
          case 'terminal':
            return <TerminalTab />
          case 'tasks':
            return <TasksTab />
          case 'cron':
            return <CrontabTab />
          default:
            return <FilesTab />
        }
      case 'settings':
        return settingsSubTab === 'providers' ? (
          <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ProviderSettings />
            </div>
          </div>
        ) : null
      default:
        return <ChatTab />
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header with glass effect - contains primary tabs */}
      <div className="glass-strong sticky top-0 z-50 border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo on the left */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Terminal className="w-8 h-8 text-orange-500" />
                <div className="absolute inset-0 blur-lg bg-orange-500/50 -z-10" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white glow-orange-text">
                  {t('app.name')}
                </h1>
              </div>
            </div>

            {/* Primary tabs - centered */}
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-1 glass-panel p-1 rounded-lg">
                <TabButton
                  active={primaryTab === 'chat'}
                  onClick={() => setPrimaryTab('chat')}
                  icon={<MessageSquare className="w-4 h-4" />}
                  label={t('tabs.chat', 'Chat')}
                />
                <TabButton
                  active={primaryTab === 'code'}
                  onClick={() => setPrimaryTab('code')}
                  icon={<Code2 className="w-4 h-4" />}
                  label={t('tabs.code', 'Code')}
                />
                <TabButton
                  active={primaryTab === 'agents'}
                  onClick={() => setPrimaryTab('agents')}
                  icon={<Bot className="w-4 h-4" />}
                  label={t('tabs.agents', 'Agents')}
                />
                <TabButton
                  active={primaryTab === 'os'}
                  onClick={() => setPrimaryTab('os')}
                  icon={<Monitor className="w-4 h-4" />}
                  label={t('tabs.os', 'OS')}
                />
                <TabButton
                  active={primaryTab === 'settings'}
                  onClick={() => setPrimaryTab('settings')}
                  icon={<Settings className="w-4 h-4" />}
                  label={t('tabs.settings', 'Settings')}
                />
              </div>
            </div>

            {/* Language switcher */}
            <div className="flex items-center">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs bar - only show for tabs with sub-tabs */}
      {(primaryTab === 'agents' || primaryTab === 'os' || primaryTab === 'settings') && (
        <div className="border-b border-orange-500/10 bg-[#0D0D0D]/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex justify-center">
              {primaryTab === 'agents' && (
                <div className="flex items-center gap-1">
                  <SubTabButton
                    active={agentsSubTab === 'memory'}
                    onClick={() => setAgentsSubTab('memory')}
                    icon={<Brain className="w-3.5 h-3.5" />}
                    label={t('tabs.memory', 'Memory')}
                  />
                  <SubTabButton
                    active={agentsSubTab === 'skills'}
                    onClick={() => setAgentsSubTab('skills')}
                    icon={<Puzzle className="w-3.5 h-3.5" />}
                    label={t('tabs.skills', 'Skills')}
                  />
                </div>
              )}
              {primaryTab === 'os' && (
                <div className="flex items-center gap-1">
                  <SubTabButton
                    active={osSubTab === 'files'}
                    onClick={() => setOsSubTab('files')}
                    icon={<FolderOpen className="w-3.5 h-3.5" />}
                    label={t('tabs.files', 'Files')}
                  />
                  <SubTabButton
                    active={osSubTab === 'terminal'}
                    onClick={() => setOsSubTab('terminal')}
                    icon={<Terminal className="w-3.5 h-3.5" />}
                    label={t('tabs.terminal', 'Terminal')}
                  />
                  <SubTabButton
                    active={osSubTab === 'tasks'}
                    onClick={() => setOsSubTab('tasks')}
                    icon={<CheckSquare className="w-3.5 h-3.5" />}
                    label={t('tabs.tasks', 'Tasks')}
                  />
                  <SubTabButton
                    active={osSubTab === 'cron'}
                    onClick={() => setOsSubTab('cron')}
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label={t('tabs.crontab', 'Cron')}
                  />
                </div>
              )}
              {primaryTab === 'settings' && (
                <div className="flex items-center gap-1">
                  <SubTabButton
                    active={settingsSubTab === 'providers'}
                    onClick={() => setSettingsSubTab('providers')}
                    icon={<Key className="w-3.5 h-3.5" />}
                    label={t('tabs.providerConfigs', 'Provider configs')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </div>
    </div>
  )
}

/**
 * Primary tab button component
 */
interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-code
        transition-all duration-200
        ${active
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/**
 * Sub tab button component
 */
interface SubTabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function SubTabButton({ active, onClick, icon, label }: SubTabButtonProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-code
        transition-all duration-200
        ${active
          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
