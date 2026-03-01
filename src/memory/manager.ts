import { getFS } from '@/lib/file-utils';
import type {
  ThreadSummary,
  ThreadFacts,
  ThreadFact,
  UserProfile,
  UserRelationship,
  ProjectMemory,
  AssembledMemoryContext,
} from './types';
import { MEMORY_PATHS } from './types';

// ==================== Thread Memory Operations ====================

export async function getThreadSummary(threadId: string): Promise<ThreadSummary | null> {
  const fs = await getFS();
  try {
    const content = await fs.readFile(MEMORY_PATHS.threadSummary(threadId), 'utf-8');
    return JSON.parse(content) as ThreadSummary;
  } catch {
    return null;
  }
}

export async function saveThreadSummary(threadId: string, summary: ThreadSummary): Promise<void> {
  const fs = await getFS();
  await fs.writeFile(MEMORY_PATHS.threadSummary(threadId), JSON.stringify(summary, null, 2));
}

export async function getLastSummaryEndIndex(threadId: string): Promise<number> {
  const summary = await getThreadSummary(threadId);
  return summary?.messageRange.end ?? 0;
}

export async function getThreadFacts(threadId: string): Promise<ThreadFacts | null> {
  const fs = await getFS();
  try {
    const content = await fs.readFile(MEMORY_PATHS.threadFacts(threadId), 'utf-8');
    return JSON.parse(content) as ThreadFacts;
  } catch {
    return null;
  }
}

export async function saveThreadFacts(threadId: string, facts: ThreadFacts): Promise<void> {
  const fs = await getFS();
  await fs.writeFile(MEMORY_PATHS.threadFacts(threadId), JSON.stringify(facts, null, 2));
}

export async function addThreadFact(
  threadId: string,
  fact: Omit<ThreadFact, 'id'>
): Promise<ThreadFact> {
  const facts = (await getThreadFacts(threadId)) ?? {
    version: 1 as const,
    updatedAt: Date.now(),
    facts: [],
  };

  const newFact: ThreadFact = {
    ...fact,
    id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };

  facts.facts.push(newFact);
  facts.updatedAt = Date.now();

  await saveThreadFacts(threadId, facts);
  return newFact;
}

export async function updateThreadFact(
  threadId: string,
  factId: string,
  updates: Partial<ThreadFact>
): Promise<void> {
  const facts = await getThreadFacts(threadId);
  if (!facts) return;

  const index = facts.facts.findIndex((f) => f.id === factId);
  if (index === -1) return;

  facts.facts[index] = { ...facts.facts[index], ...updates };
  facts.updatedAt = Date.now();

  await saveThreadFacts(threadId, facts);
}

export async function deleteThreadFact(threadId: string, factId: string): Promise<void> {
  const facts = await getThreadFacts(threadId);
  if (!facts) return;

  facts.facts = facts.facts.filter((f) => f.id !== factId);
  facts.updatedAt = Date.now();

  await saveThreadFacts(threadId, facts);
}

// ==================== User Memory Operations ====================

export async function getUserProfile(userId = 'default'): Promise<UserProfile | null> {
  const fs = await getFS();
  try {
    const content = await fs.readFile(MEMORY_PATHS.userProfile, 'utf-8');
    const profile = JSON.parse(content) as UserProfile;
    // Ensure userId matches
    if (profile.userId !== userId) return null;
    return profile;
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const fs = await getFS();
  profile.updatedAt = Date.now();
  await fs.writeFile(MEMORY_PATHS.userProfile, JSON.stringify(profile, null, 2));
}

export async function getOrCreateUserProfile(userId = 'default'): Promise<UserProfile> {
  const existing = await getUserProfile(userId);
  if (existing) return existing;

  // Create default profile
  const profile: UserProfile = {
    version: 1,
    updatedAt: Date.now(),
    userId,
    displayName: undefined,
    skills: [],
    preferences: {},
    snippets: [],
  };

  await saveUserProfile(profile);
  return profile;
}

export async function updateUserPreference(
  userId: string,
  preferences: Partial<UserProfile['preferences']>
): Promise<void> {
  const profile = await getOrCreateUserProfile(userId);
  profile.preferences = { ...profile.preferences, ...preferences };
  await saveUserProfile(profile);
}

export async function addUserSkill(
  userId: string,
  skillName: string,
  level: UserProfile['skills'][0]['level'],
  evidence: string
): Promise<void> {
  const profile = await getOrCreateUserProfile(userId);

  const existingIndex = profile.skills.findIndex((s) => s.name.toLowerCase() === skillName.toLowerCase());

  if (existingIndex >= 0) {
    // Update existing skill
    const skill = profile.skills[existingIndex];
    skill.level = level;
    if (!skill.evidence.includes(evidence)) {
      skill.evidence.push(evidence);
    }
    skill.updatedAt = Date.now();
  } else {
    // Add new skill
    profile.skills.push({
      name: skillName,
      level,
      evidence: [evidence],
      updatedAt: Date.now(),
    });
  }

  await saveUserProfile(profile);
}

export async function addUserSnippet(
  userId: string,
  name: string,
  content: string,
  context: string
): Promise<void> {
  const profile = await getOrCreateUserProfile(userId);

  const existingIndex = profile.snippets.findIndex((s) => s.name === name);
  const now = Date.now();

  if (existingIndex >= 0) {
    // Update existing snippet
    profile.snippets[existingIndex] = {
      ...profile.snippets[existingIndex],
      content,
      context,
      usageCount: profile.snippets[existingIndex].usageCount + 1,
      updatedAt: now,
    };
  } else {
    // Add new snippet
    profile.snippets.push({
      id: `snippet_${now}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      content,
      context,
      usageCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  await saveUserProfile(profile);
}

// User Relationship
export async function getUserRelationship(_userId = 'default'): Promise<UserRelationship | null> {
  const fs = await getFS();
  try {
    const content = await fs.readFile(MEMORY_PATHS.userRelationship, 'utf-8');
    return JSON.parse(content) as UserRelationship;
  } catch {
    return null;
  }
}

export async function getOrCreateUserRelationship(userId = 'default'): Promise<UserRelationship> {
  const existing = await getUserRelationship(userId);
  if (existing) return existing;

  const relationship: UserRelationship = {
    version: 1,
    updatedAt: Date.now(),
    userId,
    totalThreads: 0,
    totalMessages: 0,
    patterns: [],
    trustLevel: 0.5, // Start with neutral trust
    notes: [],
  };

  const fs = await getFS();
  await fs.writeFile(MEMORY_PATHS.userRelationship, JSON.stringify(relationship, null, 2));
  return relationship;
}

export async function recordInteraction(
  userId: string,
  type: UserRelationship['patterns'][0]['type']
): Promise<void> {
  const relationship = await getOrCreateUserRelationship(userId);
  relationship.updatedAt = Date.now();

  const existingPattern = relationship.patterns.find((p) => p.type === type);
  if (existingPattern) {
    existingPattern.frequency++;
    existingPattern.lastOccurredAt = Date.now();
  } else {
    relationship.patterns.push({
      type,
      frequency: 1,
      lastOccurredAt: Date.now(),
    });
  }

  // Simple trust calculation based on interaction count
  const totalInteractions = relationship.patterns.reduce((sum, p) => sum + p.frequency, 0);
  relationship.trustLevel = Math.min(0.9, 0.5 + totalInteractions * 0.01);

  const fs = await getFS();
  await fs.writeFile(MEMORY_PATHS.userRelationship, JSON.stringify(relationship, null, 2));
}

// ==================== Project Memory Operations ====================

export async function getProjectMemory(projectId: string): Promise<ProjectMemory | null> {
  const fs = await getFS();
  try {
    const content = await fs.readFile(MEMORY_PATHS.project(projectId), 'utf-8');
    return JSON.parse(content) as ProjectMemory;
  } catch {
    return null;
  }
}

export async function saveProjectMemory(memory: ProjectMemory): Promise<void> {
  const fs = await getFS();
  memory.updatedAt = Date.now();
  await fs.writeFile(MEMORY_PATHS.project(memory.projectId), JSON.stringify(memory, null, 2));
}

export async function getOrCreateProjectMemory(
  projectPath: string,
  projectName?: string
): Promise<ProjectMemory> {
  // Use path as projectId (sanitized)
  const projectId = projectPath.replace(/[^a-zA-Z0-9]/g, '_');

  const existing = await getProjectMemory(projectId);
  if (existing) return existing;

  const now = Date.now();
  const memory: ProjectMemory = {
    version: 1,
    projectId,
    projectPath,
    projectName: projectName || projectPath.split('/').pop() || 'Unknown Project',
    createdAt: now,
    updatedAt: now,
    overview: {
      techStack: {
        languages: [],
        frameworks: [],
        tools: [],
        inferredAt: now,
      },
      structure: '',
      entryPoints: [],
    },
    decisions: [],
    knownIssues: [],
    keyFacts: [],
  };

  await saveProjectMemory(memory);

  // Update project index
  await addToProjectIndex(projectId, projectPath);

  return memory;
}

export async function addProjectDecision(
  projectId: string,
  content: string,
  rationale: string,
  threadId: string
): Promise<void> {
  const memory = await getProjectMemory(projectId);
  if (!memory) return;

  const decision: ProjectMemory['decisions'][0] = {
    id: `decision_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    content,
    rationale,
    threadIds: [threadId],
    timestamp: Date.now(),
    status: 'active',
  };

  memory.decisions.push(decision);
  await saveProjectMemory(memory);
}

export async function addProjectIssue(
  projectId: string,
  description: string,
  threadId: string,
  workaround?: string
): Promise<void> {
  const memory = await getProjectMemory(projectId);
  if (!memory) return;

  const issue: ProjectMemory['knownIssues'][0] = {
    id: `issue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    description,
    workaround,
    status: 'open',
    threadIds: [threadId],
  };

  memory.knownIssues.push(issue);
  await saveProjectMemory(memory);
}

export async function updateProjectTechStack(
  projectId: string,
  updates: Partial<ProjectMemory['overview']['techStack']>
): Promise<void> {
  const memory = await getProjectMemory(projectId);
  if (!memory) return;

  memory.overview.techStack = {
    ...memory.overview.techStack,
    ...updates,
    inferredAt: Date.now(),
  };
  await saveProjectMemory(memory);
}

async function addToProjectIndex(projectId: string, projectPath: string): Promise<void> {
  const fs = await getFS();
  let index: Array<{ projectId: string; path: string; addedAt: number }> = [];

  try {
    const content = await fs.readFile(MEMORY_PATHS.projectIndex, 'utf-8');
    index = JSON.parse(content);
  } catch {
    // Index doesn't exist yet
  }

  if (!index.find((p) => p.projectId === projectId)) {
    index.push({ projectId, path: projectPath, addedAt: Date.now() });
    await fs.writeFile(MEMORY_PATHS.projectIndex, JSON.stringify(index, null, 2));
  }
}

// ==================== Memory Context Assembly ====================

export async function assembleMemoryContext(
  threadId: string,
  projectPath?: string,
  userId = 'default'
): Promise<AssembledMemoryContext> {
  const [threadSummary, threadFacts, userProfile, projectMemory] = await Promise.all([
    getThreadSummary(threadId),
    getThreadFacts(threadId),
    getUserProfile(userId),
    projectPath ? getOrCreateProjectMemory(projectPath) : Promise.resolve(undefined),
  ]);

  // Get recent active decisions
  const recentDecisions =
    projectMemory?.decisions
      .filter((d) => d.status === 'active')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5) || [];

  // Get relevant snippets (for now, just return frequently used ones)
  const relevantSnippets =
    userProfile?.snippets
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 3) || [];

  return {
    userProfile: userProfile || undefined,
    projectMemory: projectMemory || undefined,
    threadSummary: threadSummary || undefined,
    threadFacts: threadFacts?.facts || [],
    recentDecisions,
    relevantSnippets,
  };
}

// ==================== Fact Extraction ====================

export function extractFactsFromMessage(
  messageId: string,
  content: string,
  timestamp: number
): Omit<ThreadFact, 'id'>[] {
  const facts: Omit<ThreadFact, 'id'>[] = [];

  // File operations
  const filePatterns = [
    /read(?:ing|ed)?\s+file\s+[`']?([^`'\n]+)/i,
    /wrote\s+to\s+[`']?([^`'\n]+)/i,
    /created\s+file\s+[`']?([^`'\n]+)/i,
    /viewing\s+[`']?([^`'\n]+)/i,
  ];

  for (const pattern of filePatterns) {
    const match = content.match(pattern);
    if (match) {
      facts.push({
        type: 'file',
        content: `查看了文件: ${match[1]}`,
        messageId,
        timestamp,
        confidence: 0.8,
        verified: false,
      });
      break;
    }
  }

  // Command execution
  const commandPatterns = [
    /executed\s+[`']?([^`'\n]+)/i,
    /ran\s+[`']?([^`'\n]+)/i,
    /command:\s*[`']?([^`'\n]+)/i,
  ];

  for (const pattern of commandPatterns) {
    const match = content.match(pattern);
    if (match) {
      facts.push({
        type: 'command',
        content: `执行命令: ${match[1]}`,
        messageId,
        timestamp,
        confidence: 0.7,
        verified: false,
      });
      break;
    }
  }

  // Decisions
  const decisionPatterns = [
    /decided\s+(?:to\s+)?(.+?)(?:\.|$)/i,
    /choose\s+(?:to\s+)?(.+?)(?:\.|$)/i,
    /will\s+use\s+(.+?)(?:\.|$)/i,
    /using\s+(.+?)\s+for\s+(.+?)(?:\.|$)/i,
  ];

  for (const pattern of decisionPatterns) {
    const match = content.match(pattern);
    if (match) {
      facts.push({
        type: 'decision',
        content: `决定: ${match[1]}${match[2] ? ` for ${match[2]}` : ''}`,
        messageId,
        timestamp,
        confidence: 0.6,
        verified: false,
      });
      break;
    }
  }

  // User preferences
  const preferencePatterns = [
    /I\s+(?:like|prefer|love)\s+(?:to\s+)?(.+?)(?:\.|$)/i,
    /我喜欢(.+?)(?:。|$)/i,
    /我偏好(.+?)(?:。|$)/i,
  ];

  for (const pattern of preferencePatterns) {
    const match = content.match(pattern);
    if (match) {
      facts.push({
        type: 'preference',
        content: `用户偏好: ${match[1]}`,
        messageId,
        timestamp,
        confidence: 0.85,
        verified: false,
      });
      break;
    }
  }

  // TODO items
  const todoPatterns = [
    /TODO[:\s]+(.+?)(?:\n|$)/i,
    /待办[:：\s]+(.+?)(?:\n|$)/i,
    /FIXME[:\s]+(.+?)(?:\n|$)/i,
  ];

  for (const pattern of todoPatterns) {
    const match = content.match(pattern);
    if (match) {
      facts.push({
        type: 'todo',
        content: `待办: ${match[1]}`,
        messageId,
        timestamp,
        confidence: 0.9,
        verified: false,
      });
    }
  }

  // Errors
  const errorPatterns = [
    /error[:\s]+(.+?)(?:\n|$)/i,
    /failed[:\s]+(.+?)(?:\n|$)/i,
    /exception[:\s]+(.+?)(?:\n|$)/i,
  ];

  for (const pattern of errorPatterns) {
    const match = content.match(pattern);
    if (match) {
      facts.push({
        type: 'error',
        content: `错误: ${match[1]}`,
        messageId,
        timestamp,
        confidence: 0.75,
        verified: false,
      });
    }
  }

  return facts;
}

// ==================== Backward Compatibility ====================

// Legacy MemoryManager class for backward compatibility
export class MemoryManager {
  async getSummary(threadId: string): Promise<ThreadSummary | null> {
    return getThreadSummary(threadId);
  }

  async saveSummary(threadId: string, summary: ThreadSummary): Promise<void> {
    return saveThreadSummary(threadId, summary);
  }

  async getLastSummaryEndIndex(threadId: string): Promise<number> {
    return getLastSummaryEndIndex(threadId);
  }

  async getFacts(threadId: string): Promise<ThreadFacts | null> {
    return getThreadFacts(threadId);
  }

  async saveFacts(threadId: string, facts: ThreadFacts): Promise<void> {
    return saveThreadFacts(threadId, facts);
  }

  async addFact(threadId: string, fact: Omit<ThreadFact, 'id'>): Promise<ThreadFact> {
    return addThreadFact(threadId, fact);
  }

  async updateFact(threadId: string, factId: string, updates: Partial<ThreadFact>): Promise<void> {
    return updateThreadFact(threadId, factId, updates);
  }

  async deleteFact(threadId: string, factId: string): Promise<void> {
    return deleteThreadFact(threadId, factId);
  }

  extractFactsFromMessage(messageId: string, content: string, timestamp: number): Omit<ThreadFact, 'id'>[] {
    return extractFactsFromMessage(messageId, content, timestamp);
  }
}

// Singleton instance for backward compatibility
export const memoryManager = new MemoryManager();
