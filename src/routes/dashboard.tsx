import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatTab } from '@/components/dashboard/ChatTab'
import { FilesTab } from '@/components/dashboard/FilesTab'
import { TasksTab } from '@/components/dashboard/TasksTab'
import { SkillsTab } from '@/components/dashboard/SkillsTab'
import { TerminalTab } from '@/components/dashboard/TerminalTab'
import { SettingsTab } from '@/components/dashboard/SettingsTab'
import { MemoryTab } from '@/components/dashboard/MemoryTab'
import { MessageSquare, FolderOpen, CheckSquare, Puzzle, Settings, Terminal, Brain } from 'lucide-react'
import { useEffect } from 'react'
import { taskScheduler } from '@/tasks'

// Dynamic imports (client-side only)
async function initFilesystem() {
  const { initializeFilesystem } = await import('@/config/agent-fs')
  return initializeFilesystem()
}

// Dynamic import for task definitions - client-side only
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

function Dashboard() {
  // Initialize filesystem and task system on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initFilesystem()
        // Load task definitions dynamically (client-side only)
        await loadTaskDefinitions()
        await taskScheduler.initialize()
        console.log('[Dashboard] Task system initialized')
      } catch (err) {
        console.error('[Dashboard] Initialization failed:', err)
      }
    }
    init()
  }, [])

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header with glass effect */}
      <div className="glass-strong sticky top-0 z-50 border-b border-orange-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Terminal className="w-8 h-8 text-orange-500" />
                <div className="absolute inset-0 blur-lg bg-orange-500/50 -z-10" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white glow-orange-text">
                  LOCALCLAW
                </h1>
                <p className="text-xs text-orange-500/70 font-code tracking-wider">
                  AGENT v1.0
                </p>
              </div>
            </div>
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border-glow">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-400 font-code">ONLINE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-7 lg:w-[800px] glass-panel p-1 gap-1">
            <TabsTrigger
              value="chat"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50 border border-transparent rounded-md transition-all duration-300 font-code text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">CHAT</span>
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50 border border-transparent rounded-md transition-all duration-300 font-code text-sm"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">FILES</span>
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50 border border-transparent rounded-md transition-all duration-300 font-code text-sm"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">TASKS</span>
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50 border border-transparent rounded-md transition-all duration-300 font-code text-sm"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">MEMORY</span>
            </TabsTrigger>

            <TabsTrigger
              value="skills"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50 border border-transparent rounded-md transition-all duration-300 font-code text-sm"
            >
              <Puzzle className="w-4 h-4" />
              <span className="hidden sm:inline">SKILLS</span>
            </TabsTrigger>
            <TabsTrigger
              value="terminal"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50 border border-transparent rounded-md transition-all duration-300 font-code text-sm"
            >
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">TERMINAL</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 data-[state=active]:border-orange-500/50 border border-transparent rounded-md transition-all duration-300 font-code text-sm"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">CONFIG</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="chat" className="m-0">
              <ChatTab />
            </TabsContent>

            <TabsContent value="files" className="m-0">
              <FilesTab />
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <TasksTab />
            </TabsContent>

            <TabsContent value="memory" className="m-0">
              <MemoryTab />
            </TabsContent>

            <TabsContent value="skills" className="m-0">
              <SkillsTab />
            </TabsContent>

            <TabsContent value="terminal" className="m-0">
              <TerminalTab />
            </TabsContent>

            <TabsContent value="settings" className="m-0">
              <SettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
