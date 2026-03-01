// V2 Memory System Types
// Includes: Thread Memory (V1) + User Memory + Project Memory

// ==================== Thread Memory (V1) ====================

export interface ThreadSummary {
  version: 1;
  generatedAt: number;
  messageRange: {
    start: number;
    end: number;
  };
  content: string;
  tokenCount: number;
}

export type FactType = 'file' | 'command' | 'decision' | 'preference' | 'error' | 'todo';

export interface ThreadFact {
  id: string;
  type: FactType;
  content: string;
  messageId: string;
  timestamp: number;
  confidence: number;
  verified: boolean;
}

export interface ThreadFacts {
  version: 1;
  updatedAt: number;
  facts: ThreadFact[];
}

// ==================== User Memory (V2) ====================

export interface UserSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  evidence: string[]; // Thread IDs as evidence
  updatedAt: number;
}

export interface UserPreference {
  codingStyle?: string;
  communicationStyle?: 'concise' | 'detailed' | 'tutorial';
  defaultTools?: string[];
  timezone?: string;
  language?: string; // 用户偏好语言
  theme?: 'light' | 'dark' | 'system';
}

export interface UserSnippet {
  id: string;
  name: string;
  content: string;
  context: string; // 使用场景描述
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  version: 1;
  updatedAt: number;
  userId: string; // 默认 'default'，未来支持多用户
  displayName?: string;
  skills: UserSkill[];
  preferences: UserPreference;
  snippets: UserSnippet[];
}

// Relationship memory - 用户与 Agent 的交互历史
export interface InteractionPattern {
  type: 'collaboration' | 'learning' | 'debugging' | 'review';
  frequency: number; // 出现次数
  lastOccurredAt: number;
}

export interface UserRelationship {
  version: 1;
  updatedAt: number;
  userId: string;
  totalThreads: number;
  totalMessages: number;
  patterns: InteractionPattern[];
  trustLevel: number; // 0-1，基于交互历史计算
  notes: string[]; // Agent 对用户的备注
}

// ==================== Project Memory (V2) ====================

export interface ProjectDecision {
  id: string;
  content: string;
  rationale: string;
  threadIds: string[]; // 相关对话
  timestamp: number;
  status: 'active' | 'superseded' | 'rejected';
  supersededBy?: string; // 如果 status 为 superseded，指向新决策
}

export interface ProjectIssue {
  id: string;
  description: string;
  workaround?: string;
  status: 'open' | 'resolved';
  resolvedAt?: number;
  threadIds: string[];
}

export interface ProjectTechStack {
  languages: string[];
  frameworks: string[];
  tools: string[];
  inferredAt: number;
}

export interface ProjectMemory {
  version: 1;
  projectId: string;
  projectPath: string; // 绝对路径
  projectName: string;
  createdAt: number;
  updatedAt: number;
  overview: {
    description?: string;
    techStack: ProjectTechStack;
    structure: string; // 目录结构描述
    entryPoints: string[];
  };
  decisions: ProjectDecision[];
  knownIssues: ProjectIssue[];
  // 从各个 Thread 聚合的关键信息
  keyFacts: ThreadFact[];
}

// ==================== Memory Context (用于 LLM) ====================

export interface AssembledMemoryContext {
  userProfile?: UserProfile;
  projectMemory?: ProjectMemory;
  threadSummary?: ThreadSummary;
  threadFacts: ThreadFact[];
  recentDecisions: ProjectDecision[];
  relevantSnippets: UserSnippet[];
}

// ==================== Storage Paths ====================

export const MEMORY_PATHS = {
  // Thread level
  threadSummary: (threadId: string) => `/chat/threads/${threadId}/summary.json`,
  threadFacts: (threadId: string) => `/chat/threads/${threadId}/facts.json`,

  // User level
  userProfile: '/memory/user/profile.json',
  userRelationship: '/memory/user/relationship.json',

  // Project level
  project: (projectId: string) => `/memory/projects/${projectId}.json`,
  projectIndex: '/memory/projects/index.json',
};
