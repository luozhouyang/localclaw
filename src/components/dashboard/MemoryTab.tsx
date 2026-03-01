import { useState, useEffect } from 'react';
import {
  Brain,
  FileText,
  Terminal,
  Lightbulb,
  CheckSquare,
  AlertCircle,
  RotateCcw,
  User,
  FolderGit2,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ThreadSummary,
  ThreadFacts,
  ThreadFact,
  UserProfile,
  ProjectMemory,
  FactType,
} from '@/memory/types';

// Lazy imports (client-side only)
async function getMemoryManager() {
  const { memoryManager } = await import('@/memory/manager');
  return memoryManager;
}

async function getUserProfile(userId = 'default') {
  const { getOrCreateUserProfile } = await import('@/memory/manager');
  return getOrCreateUserProfile(userId);
}

async function getProjectMemory(projectPath: string) {
  const { getOrCreateProjectMemory } = await import('@/memory/manager');
  return getOrCreateProjectMemory(projectPath);
}

type MemoryView = 'thread' | 'user' | 'project';

interface ThreadMemoryData {
  summary: ThreadSummary | null;
  facts: ThreadFacts | null;
}

export function MemoryTab() {
  const [activeView, setActiveView] = useState<MemoryView>('thread');
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [projectPath, setProjectPath] = useState<string>('');

  // Load current thread and project on mount
  useEffect(() => {
    const currentThreadId = localStorage.getItem('currentThreadId') || '';
    setSelectedThreadId(currentThreadId);

    // Get current project path from storage or use default
    const currentProject = localStorage.getItem('currentProjectPath') || '/workspace';
    setProjectPath(currentProject);
  }, []);

  return (
    <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">MEMORY SYSTEM</h2>
            <p className="text-xs text-orange-400/70 font-code">V2 - Thread / User / Project</p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-stone-800/50 rounded-lg p-1">
          <ViewButton
            active={activeView === 'thread'}
            onClick={() => setActiveView('thread')}
            icon={MessageSquare}
            label="Thread"
          />
          <ViewButton
            active={activeView === 'user'}
            onClick={() => setActiveView('user')}
            icon={User}
            label="User"
          />
          <ViewButton
            active={activeView === 'project'}
            onClick={() => setActiveView('project')}
            icon={FolderGit2}
            label="Project"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'thread' && (
          <ThreadMemoryView threadId={selectedThreadId} />
        )}
        {activeView === 'user' && <UserMemoryView />}
        {activeView === 'project' && <ProjectMemoryView projectPath={projectPath} />}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
        active
          ? 'bg-orange-500 text-white'
          : 'text-stone-400 hover:text-white hover:bg-stone-700/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ==================== Thread Memory View ====================

function ThreadMemoryView({ threadId }: { threadId: string }) {
  const [data, setData] = useState<ThreadMemoryData>({ summary: null, facts: null });
  const [isLoading, setIsLoading] = useState(true);

  const loadMemory = async () => {
    if (!threadId) {
      setData({ summary: null, facts: null });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const memoryManager = await getMemoryManager();
      const [summary, facts] = await Promise.all([
        memoryManager.getSummary(threadId),
        memoryManager.getFacts(threadId),
      ]);
      setData({ summary, facts });
    } catch (err) {
      console.error('Failed to load thread memory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, [threadId]);

  const handleVerifyFact = async (factId: string, verified: boolean) => {
    if (!threadId) return;
    try {
      const memoryManager = await getMemoryManager();
      await memoryManager.updateFact(threadId, factId, { verified });
      await loadMemory();
    } catch (err) {
      console.error('Failed to update fact:', err);
    }
  };

  const handleDeleteFact = async (factId: string) => {
    if (!threadId) return;
    try {
      const memoryManager = await getMemoryManager();
      await memoryManager.deleteFact(threadId, factId);
      await loadMemory();
    } catch (err) {
      console.error('Failed to delete fact:', err);
    }
  };

  if (!threadId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-500">
        <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
        <p className="font-code text-sm">No active thread</p>
        <p className="text-xs mt-2">Select a chat thread to view its memory</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4 custom-scrollbar">
      <div className="space-y-6">
        {/* Summary Section */}
        <section>
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400" />
            Conversation Summary
          </h3>
          {data.summary ? (
            <div className="p-4 rounded-lg border border-orange-500/20 bg-stone-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400">
                  Messages {data.summary.messageRange.start}-{data.summary.messageRange.end}
                </Badge>
                <span className="text-xs text-stone-500">
                  Generated {new Date(data.summary.generatedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-stone-300 whitespace-pre-wrap">
                {data.summary.content}
              </p>
              <div className="mt-2 text-xs text-stone-500">
                ~{data.summary.tokenCount} tokens
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-orange-500/20 text-center">
              <p className="text-sm text-stone-500">No summary available yet</p>
              <p className="text-xs text-stone-600 mt-1">
                Summaries are generated automatically every 20 messages
              </p>
            </div>
          )}
        </section>

        {/* Facts Section */}
        <section>
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-orange-400" />
            Extracted Facts ({data.facts?.facts.length || 0})
          </h3>
          {data.facts && data.facts.facts.length > 0 ? (
            <div className="space-y-2">
              {data.facts.facts.map((fact) => (
                <FactItem
                  key={fact.id}
                  fact={fact}
                  onVerify={(verified) => handleVerifyFact(fact.id, verified)}
                  onDelete={() => handleDeleteFact(fact.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-orange-500/20 text-center">
              <p className="text-sm text-stone-500">No facts extracted yet</p>
              <p className="text-xs text-stone-600 mt-1">
                Facts are automatically extracted from assistant messages
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ==================== User Memory View ====================

function UserMemoryView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profile = await getUserProfile('default');
      setProfile(profile);
      setEditForm(profile);
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      const { saveUserProfile } = await import('@/memory/manager');
      if (profile) {
        await saveUserProfile({ ...profile, ...editForm } as UserProfile);
      }
      setIsEditing(false);
      await loadProfile();
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4 custom-scrollbar">
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <User className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                {profile?.displayName || 'Default User'}
              </h3>
              <p className="text-xs text-stone-500">ID: {profile?.userId}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>

        {/* Preferences */}
        <section>
          <h4 className="text-sm font-medium text-white mb-3">Preferences</h4>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-400">Coding Style</label>
                <Input
                  value={editForm.preferences?.codingStyle || ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      preferences: { ...editForm.preferences, codingStyle: e.target.value },
                    })
                  }
                  className="bg-stone-800 border-stone-700 text-white"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400">Communication Style</label>
                <Select
                  value={editForm.preferences?.communicationStyle || 'detailed'}
                  onValueChange={(v) =>
                    setEditForm({
                      ...editForm,
                      preferences: { ...editForm.preferences, communicationStyle: v as any },
                    })
                  }
                >
                  <SelectTrigger className="bg-stone-800 border-stone-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-800 border-stone-700">
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Coding Style" value={profile?.preferences.codingStyle || 'Not set'} />
              <InfoItem
                label="Communication"
                value={profile?.preferences.communicationStyle || 'Detailed'}
              />
              <InfoItem label="Timezone" value={profile?.preferences.timezone || 'Not set'} />
              <InfoItem label="Language" value={profile?.preferences.language || 'Not set'} />
            </div>
          )}
        </section>

        {/* Skills */}
        <section>
          <h4 className="text-sm font-medium text-white mb-3">Skills</h4>
          <div className="space-y-2">
            {profile?.skills.length ? (
              profile.skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-orange-500/20 bg-stone-800/30"
                >
                  <div>
                    <p className="text-sm text-white">{skill.name}</p>
                    <p className="text-xs text-stone-500">
                      {skill.evidence.length} interactions
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      skill.level === 'advanced'
                        ? 'bg-green-500/20 text-green-400'
                        : skill.level === 'intermediate'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-stone-500/20 text-stone-400'
                    }`}
                  >
                    {skill.level}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">No skills recorded yet</p>
            )}
          </div>
        </section>

        {/* Snippets */}
        <section>
          <h4 className="text-sm font-medium text-white mb-3">Code Snippets</h4>
          <div className="space-y-2">
            {profile?.snippets.length ? (
              profile.snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="p-3 rounded-lg border border-orange-500/20 bg-stone-800/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white">{snippet.name}</p>
                    <span className="text-xs text-stone-500">
                      Used {snippet.usageCount} times
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">{snippet.context}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">No snippets saved yet</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ==================== Project Memory View ====================

function ProjectMemoryView({ projectPath }: { projectPath: string }) {
  const [project, setProject] = useState<ProjectMemory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newDecision, setNewDecision] = useState({ content: '', rationale: '' });
  const [showNewDecision, setShowNewDecision] = useState(false);

  const loadProject = async () => {
    if (!projectPath) return;
    setIsLoading(true);
    try {
      const proj = await getProjectMemory(projectPath);
      setProject(proj);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [projectPath]);

  const handleAddDecision = async () => {
    try {
      const { addProjectDecision } = await import('@/memory/manager');
      await addProjectDecision(project!.projectId, newDecision.content, newDecision.rationale, 'manual');
      setNewDecision({ content: '', rationale: '' });
      setShowNewDecision(false);
      await loadProject();
    } catch (err) {
      console.error('Failed to add decision:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-500">
        <FolderGit2 className="w-16 h-16 mb-4 opacity-30" />
        <p className="font-code text-sm">No project detected</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4 custom-scrollbar">
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <FolderGit2 className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">{project.projectName}</h3>
            <p className="text-xs text-stone-500 font-code truncate max-w-md">
              {project.projectPath}
            </p>
          </div>
        </div>

        {/* Tech Stack */}
        <section>
          <h4 className="text-sm font-medium text-white mb-3">Tech Stack</h4>
          <div className="flex flex-wrap gap-2">
            {project.overview.techStack.languages.map((lang) => (
              <Badge key={lang} variant="outline" className="bg-blue-500/20 text-blue-400">
                {lang}
              </Badge>
            ))}
            {project.overview.techStack.frameworks.map((fw) => (
              <Badge key={fw} variant="outline" className="bg-purple-500/20 text-purple-400">
                {fw}
              </Badge>
            ))}
            {project.overview.techStack.tools.map((tool) => (
              <Badge key={tool} variant="outline" className="bg-green-500/20 text-green-400">
                {tool}
              </Badge>
            ))}
            {project.overview.techStack.languages.length === 0 &&
              project.overview.techStack.frameworks.length === 0 &&
              project.overview.techStack.tools.length === 0 && (
                <p className="text-sm text-stone-500">Not detected yet</p>
              )}
          </div>
        </section>

        {/* Decisions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Key Decisions</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewDecision(!showNewDecision)}
              className="text-orange-400 hover:text-orange-300"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {showNewDecision && (
            <div className="mb-4 p-3 rounded-lg border border-orange-500/20 bg-stone-800/50 space-y-2">
              <Input
                placeholder="Decision content..."
                value={newDecision.content}
                onChange={(e) => setNewDecision({ ...newDecision, content: e.target.value })}
                className="bg-stone-800 border-stone-700 text-white text-sm"
              />
              <Textarea
                placeholder="Rationale..."
                value={newDecision.rationale}
                onChange={(e) => setNewDecision({ ...newDecision, rationale: e.target.value })}
                className="bg-stone-800 border-stone-700 text-white text-sm min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddDecision}
                  className="bg-orange-500 hover:bg-orange-400"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNewDecision(false)}>
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {project.decisions.length ? (
              project.decisions
                .filter((d) => d.status === 'active')
                .map((decision) => (
                  <div
                    key={decision.id}
                    className="p-3 rounded-lg border border-orange-500/20 bg-stone-800/30"
                  >
                    <p className="text-sm text-white">{decision.content}</p>
                    {decision.rationale && (
                      <p className="text-xs text-stone-400 mt-1">{decision.rationale}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400">
                        Active
                      </Badge>
                      <span className="text-xs text-stone-500">
                        {new Date(decision.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-stone-500">No decisions recorded yet</p>
            )}
          </div>
        </section>

        {/* Known Issues */}
        <section>
          <h4 className="text-sm font-medium text-white mb-3">Known Issues</h4>
          <div className="space-y-2">
            {project.knownIssues.length ? (
              project.knownIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3 rounded-lg border ${
                    issue.status === 'open'
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-green-500/20 bg-green-500/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        issue.status === 'open'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {issue.status}
                    </Badge>
                    <p className="text-sm text-white">{issue.description}</p>
                  </div>
                  {issue.workaround && (
                    <p className="text-xs text-stone-400 mt-1">
                      Workaround: {issue.workaround}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">No known issues</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ==================== Shared Components ====================

const factTypeIcons: Record<FactType, React.ElementType> = {
  file: FileText,
  command: Terminal,
  decision: Lightbulb,
  preference: CheckSquare,
  error: AlertCircle,
  todo: CheckSquare,
};

const factTypeColors: Record<FactType, string> = {
  file: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  command: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  decision: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  preference: 'bg-green-500/20 text-green-400 border-green-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  todo: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function FactItem({
  fact,
  onVerify,
  onDelete,
}: {
  fact: ThreadFact;
  onVerify: (verified: boolean) => void;
  onDelete: () => void;
}) {
  const Icon = factTypeIcons[fact.type];

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        fact.verified
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-orange-500/10 hover:border-orange-500/30 bg-stone-800/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-1.5 rounded-md ${factTypeColors[fact.type]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-200">{fact.content}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className={`text-xs ${factTypeColors[fact.type]}`}>
                {fact.type}
              </Badge>
              <span className="text-xs text-stone-500">
                {new Date(fact.timestamp).toLocaleString()}
              </span>
              <span
                className={`text-xs ${
                  fact.confidence >= 0.8
                    ? 'text-green-400'
                    : fact.confidence >= 0.5
                      ? 'text-yellow-400'
                      : 'text-stone-500'
                }`}
              >
                {(fact.confidence * 100).toFixed(0)}% confidence
              </span>
              {fact.verified && (
                <Badge
                  variant="outline"
                  className="text-xs bg-green-500/20 text-green-400 border-green-500/30"
                >
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVerify(!fact.verified)}
            className={
              fact.verified ? 'text-green-400 hover:text-green-300' : 'text-stone-500 hover:text-green-400'
            }
          >
            {fact.verified ? 'Unverify' : 'Verify'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-stone-500 hover:text-red-400">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-stone-700/50 bg-stone-800/30">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
