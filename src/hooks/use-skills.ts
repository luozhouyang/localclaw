import { useState, useEffect, useCallback } from 'react';
import type { Skill, SkillManifest } from '@/skills/types';
import {
  getAllSkills,
  getActiveSkills,
  activateSkill,
  deactivateSkill,
  installSkillFromUrl,
  installSkillFromGitHub,
  uninstallSkill,
  searchRemoteSkills,
} from '@/skills/manager';

interface UseSkillsReturn {
  skills: Skill[];
  activeSkills: Skill[];
  isLoading: boolean;
  error: string | null;
  activate: (skillId: string) => Promise<void>;
  deactivate: (skillId: string) => Promise<void>;
  installFromUrl: (url: string, id?: string) => Promise<void>;
  installFromGitHub: (owner: string, repo: string, path?: string) => Promise<void>;
  uninstall: (skillId: string) => Promise<void>;
  searchRemote: (query: string) => Promise<SkillManifest[]>;
  refresh: () => Promise<void>;
}

export function useSkills(): UseSkillsReturn {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeSkills, setActiveSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSkills = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [allSkills, active] = await Promise.all([
        getAllSkills(),
        getActiveSkills(),
      ]);
      setSkills(allSkills);
      setActiveSkills(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
      console.error('Failed to load skills:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const activate = useCallback(async (skillId: string) => {
    try {
      await activateSkill(skillId);
      await loadSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate skill');
      throw err;
    }
  }, [loadSkills]);

  const deactivate = useCallback(async (skillId: string) => {
    try {
      await deactivateSkill(skillId);
      await loadSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate skill');
      throw err;
    }
  }, [loadSkills]);

  const installFromUrl = useCallback(async (url: string, id?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await installSkillFromUrl(url, id);
      await loadSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install skill');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSkills]);

  const installFromGitHub = useCallback(async (owner: string, repo: string, path?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await installSkillFromGitHub(owner, repo, path);
      await loadSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install skill from GitHub');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSkills]);

  const uninstall = useCallback(async (skillId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await uninstallSkill(skillId);
      await loadSkills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uninstall skill');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSkills]);

  const searchRemote = useCallback(async (query: string) => {
    try {
      return await searchRemoteSkills(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search remote skills');
      return [];
    }
  }, []);

  return {
    skills,
    activeSkills,
    isLoading,
    error,
    activate,
    deactivate,
    installFromUrl,
    installFromGitHub,
    uninstall,
    searchRemote,
    refresh: loadSkills,
  };
}
