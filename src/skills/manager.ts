import { getFS, getKV } from '@/lib/file-utils';
import type { Skill, SkillManifest, SkillRegistry } from './types';

const SKILLS_DIR = '/skills';
const REGISTRY_KEY = 'skills:registry';

/**
 * Parse SKILL.md content to extract metadata
 */
function parseSkillMarkdown(content: string, id: string): Partial<Skill> {
  const skill: Partial<Skill> = {
    id,
    instructions: content,
  };

  // Try to extract name from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    skill.name = titleMatch[1].trim();
  }

  // Try to extract description from "Description" section
  const descMatch = content.match(/##\s*Description\s*\n\s*([^#]+)/i);
  if (descMatch) {
    skill.description = descMatch[1].trim().split('\n')[0];
  }

  // Try to extract triggers from "Usage" or "Trigger" section
  const triggerMatch = content.match(/trigger\s*(?:with|by)[:\s]*(.+)/i);
  if (triggerMatch) {
    const triggerText = triggerMatch[1];
    skill.triggers = triggerText
      .split(/[,;]/)
      .map(t => t.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return skill;
}

/**
 * Get skills registry from storage
 */
async function getRegistry(): Promise<SkillRegistry> {
  const kv = await getKV();
  const registry = await kv.get<SkillRegistry>(REGISTRY_KEY);
  return registry || { skills: [], activeSkillIds: [] };
}

/**
 * Save skills registry to storage
 */
async function saveRegistry(registry: SkillRegistry): Promise<void> {
  const kv = await getKV();
  await kv.set(REGISTRY_KEY, registry);
}

/**
 * Load installed skills from AgentFS
 */
export async function loadInstalledSkills(): Promise<Skill[]> {
  const fs = await getFS();
  const skills: Skill[] = [];

  try {
    // Check if skills directory exists
    await fs.access(SKILLS_DIR);
    const skillDirs = await fs.readdir(SKILLS_DIR);

    for (const dir of skillDirs) {
      try {
        const skillPath = `${SKILLS_DIR}/${dir}`;
        const stat = await fs.stat(skillPath);

        if (!stat.isDirectory) continue;

        // Read SKILL.md
        const skillMdPath = `${skillPath}/SKILL.md`;
        await fs.access(skillMdPath);
        const instructions = await fs.readFile(skillMdPath, 'utf-8');

        // Try to read manifest.json for metadata
        let manifest: Partial<Skill> = {};
        try {
          const manifestPath = `${skillPath}/manifest.json`;
          await fs.access(manifestPath);
          const manifestContent = await fs.readFile(manifestPath, 'utf-8');
          manifest = JSON.parse(manifestContent);
        } catch {
          // No manifest, parse from SKILL.md
        }

        // Parse SKILL.md for additional metadata
        const parsed = parseSkillMarkdown(instructions, dir);

        skills.push({
          id: dir,
          name: manifest.name || parsed.name || dir,
          description: manifest.description || parsed.description || '',
          version: manifest.version || '1.0.0',
          author: manifest.author,
          instructions,
          triggers: manifest.triggers || parsed.triggers || [],
          source: 'local',
          isActive: false,
          installedAt: stat.mtime ? stat.mtime.getTime() : Date.now(),
          updatedAt: stat.mtime ? stat.mtime.getTime() : Date.now(),
        });
      } catch {
        // Ignore skill loading errors
      }
    }
  } catch {
    // Skills directory doesn't exist yet
  }

  return skills;
}

/**
 * Install a skill from a URL
 */
export async function installSkillFromUrl(url: string, id?: string): Promise<Skill> {
  const fs = await getFS();

  try {
    // Fetch SKILL.md from URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch skill: ${response.status} ${response.statusText}`);
    }

    const instructions = await response.text();

    // Try to fetch manifest.json if it exists
    let manifest: Partial<Skill> = {};
    try {
      const manifestUrl = url.replace(/SKILL\.md$/, 'manifest.json');
      const manifestResponse = await fetch(manifestUrl);
      if (manifestResponse.ok) {
        manifest = await manifestResponse.json();
      }
    } catch {
      // No manifest available
    }

    // Determine skill ID
    const skillId = id || manifest.id || url.split('/').pop()?.replace('.md', '') || `skill-${Date.now()}`;

    // Parse SKILL.md for metadata
    const parsed = parseSkillMarkdown(instructions, skillId);

    // Create skill directory
    const skillDir = `${SKILLS_DIR}/${skillId}`;
    await fs.mkdir(skillDir);

    // Save SKILL.md
    await fs.writeFile(`${skillDir}/SKILL.md`, instructions);

    // Save manifest.json
    const fullManifest: SkillManifest = {
      id: skillId,
      name: manifest.name || parsed.name || skillId,
      description: manifest.description || parsed.description || '',
      version: manifest.version || '1.0.0',
      author: manifest.author,
      triggers: manifest.triggers || parsed.triggers,
    };
    await fs.writeFile(`${skillDir}/manifest.json`, JSON.stringify(fullManifest, null, 2));

    const skill: Skill = {
      ...fullManifest,
      instructions,
      source: 'remote',
      isActive: false,
      installedAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update registry
    const registry = await getRegistry();
    const existingIndex = registry.skills.findIndex(s => s.id === skillId);
    if (existingIndex >= 0) {
      registry.skills[existingIndex] = skill;
    } else {
      registry.skills.push(skill);
    }
    await saveRegistry(registry);

    return skill;
  } catch (error) {
    throw error;
  }
}

/**
 * Install a skill from GitHub
 */
export async function installSkillFromGitHub(
  owner: string,
  repo: string,
  path: string = 'SKILL.md',
  id?: string
): Promise<Skill> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  return installSkillFromUrl(rawUrl, id || repo);
}

/**
 * Uninstall a skill
 */
export async function uninstallSkill(skillId: string): Promise<void> {
  const fs = await getFS();

  try {
    // Remove skill directory
    const skillDir = `${SKILLS_DIR}/${skillId}`;
    await fs.rm(skillDir, { recursive: true, force: true });

    // Update registry
    const registry = await getRegistry();
    registry.skills = registry.skills.filter(s => s.id !== skillId);
    registry.activeSkillIds = registry.activeSkillIds.filter(id => id !== skillId);
    await saveRegistry(registry);
  } catch (error) {
    throw error;
  }
}

/**
 * Activate a skill
 */
export async function activateSkill(skillId: string): Promise<void> {
  const registry = await getRegistry();

  if (!registry.activeSkillIds.includes(skillId)) {
    registry.activeSkillIds.push(skillId);
    await saveRegistry(registry);
  }

  // Update skill in registry
  const skill = registry.skills.find(s => s.id === skillId);
  if (skill) {
    skill.isActive = true;
    await saveRegistry(registry);
  }
}

/**
 * Deactivate a skill
 */
export async function deactivateSkill(skillId: string): Promise<void> {
  const registry = await getRegistry();
  registry.activeSkillIds = registry.activeSkillIds.filter(id => id !== skillId);

  // Update skill in registry
  const skill = registry.skills.find(s => s.id === skillId);
  if (skill) {
    skill.isActive = false;
  }

  await saveRegistry(registry);
}

/**
 * Get all skills (installed only, no builtin)
 */
export async function getAllSkills(): Promise<Skill[]> {
  const installedSkills = await loadInstalledSkills();

  // Apply active status from registry
  const registry = await getRegistry();
  for (const skill of installedSkills) {
    skill.isActive = registry.activeSkillIds.includes(skill.id);
  }

  return installedSkills;
}

/**
 * Get active skills
 */
export async function getActiveSkills(): Promise<Skill[]> {
  const allSkills = await getAllSkills();
  return allSkills.filter(s => s.isActive);
}

/**
 * Get skill by ID
 */
export async function getSkill(skillId: string): Promise<Skill | null> {
  const skills = await getAllSkills();
  return skills.find(s => s.id === skillId) || null;
}

/**
 * Build system prompt from active skills
 */
export async function buildSkillsPrompt(): Promise<string> {
  const activeSkills = await getActiveSkills();

  if (activeSkills.length === 0) {
    return '';
  }

  const parts = ['\n\n## Active Skills\n'];

  for (const skill of activeSkills) {
    parts.push(`\n### ${skill.name}\n`);
    parts.push(skill.instructions);
  }

  return parts.join('\n');
}

/**
 * Detect if a message triggers a skill
 */
export async function detectTriggeredSkill(message: string): Promise<Skill | null> {
  const skills = await getAllSkills();
  const lowerMessage = message.toLowerCase();

  for (const skill of skills) {
    if (!skill.triggers) continue;

    for (const trigger of skill.triggers) {
      if (lowerMessage.includes(trigger.toLowerCase())) {
        return skill;
      }
    }
  }

  return null;
}

/**
 * Search for skills in a skill marketplace/registry
 * This is a placeholder for future marketplace integration
 */
export async function searchRemoteSkills(query: string): Promise<SkillManifest[]> {
  // Placeholder: In the future, this could search a central registry
  // For now, return some example skills
  const exampleSkills: SkillManifest[] = [
    {
      id: 'web-search',
      name: 'Web Search',
      description: 'Search the web for information',
      version: '1.0.0',
      author: 'localclaw-team',
      triggers: ['search web', 'google', 'lookup'],
    },
    {
      id: 'python-dev',
      name: 'Python Developer',
      description: 'Expert Python development assistant',
      version: '1.0.0',
      author: 'localclaw-team',
      triggers: ['python', 'py', 'django', 'flask'],
    },
    {
      id: 'react-dev',
      name: 'React Developer',
      description: 'Expert React and frontend development assistant',
      version: '1.0.0',
      author: 'localclaw-team',
      triggers: ['react', 'frontend', 'component', 'hook'],
    },
  ];

  const lowerQuery = query.toLowerCase();
  return exampleSkills.filter(skill =>
    skill.name.toLowerCase().includes(lowerQuery) ||
    skill.description.toLowerCase().includes(lowerQuery) ||
    skill.id.toLowerCase().includes(lowerQuery)
  );
}
