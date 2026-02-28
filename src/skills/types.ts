/**
 * Skill types and interfaces
 */

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  source?: 'local' | 'remote';
  instructions: string;  // SKILL.md content
  tools?: string[];      // Tool names this skill provides
  triggers?: string[];   // Keywords that trigger this skill
  isActive: boolean;
  installedAt: number;
  updatedAt: number;
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  tools?: string[];
  triggers?: string[];
}

export interface SkillRegistry {
  skills: Skill[];
  activeSkillIds: string[];
}

export interface RemoteSkillSource {
  name: string;
  url: string;
  type: 'github' | 'git' | 'url';
}
