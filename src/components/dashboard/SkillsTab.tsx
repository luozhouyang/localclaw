import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Puzzle,
  Search,
  Download,
  Trash2,
  Check,
  X,
  RefreshCw,
  Globe,
  Github,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSkills } from '@/hooks/use-skills';
import type { Skill, SkillManifest } from '@/skills/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * SkillsTab component
 * Skill manager interface for installing and managing skills
 */
export function SkillsTab() {
  const { t } = useTranslation();
  const {
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
    refresh,
  } = useSkills();

  const [activeTab, setActiveTab] = useState('installed');
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<SkillManifest[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Install from URL dialog
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlIdInput, setUrlIdInput] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  // Install from GitHub dialog
  const [showGitHubDialog, setShowGitHubDialog] = useState(false);
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubPath, setGithubPath] = useState('SKILL.md');

  // Uninstall confirmation
  const [uninstallTarget, setUninstallTarget] = useState<Skill | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchRemote(searchQuery);
      setRemoteResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstallFromUrl = async () => {
    if (!urlInput.trim()) return;
    setIsInstalling(true);
    try {
      await installFromUrl(urlInput.trim(), urlIdInput.trim() || undefined);
      setShowUrlDialog(false);
      setUrlInput('');
      setUrlIdInput('');
    } catch (err) {
      console.error('Install failed:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleInstallFromGitHub = async () => {
    if (!githubOwner.trim() || !githubRepo.trim()) return;
    setIsInstalling(true);
    try {
      await installFromGitHub(
        githubOwner.trim(),
        githubRepo.trim(),
        githubPath.trim() || 'SKILL.md'
      );
      setShowGitHubDialog(false);
      setGithubOwner('');
      setGithubRepo('');
      setGithubPath('SKILL.md');
    } catch (err) {
      console.error('Install failed:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!uninstallTarget) return;
    try {
      await uninstall(uninstallTarget.id);
      setUninstallTarget(null);
    } catch (err) {
      console.error('Uninstall failed:', err);
    }
  };

  const renderSkillCard = (skill: Skill, isInstalled = true) => {
    const isActive = skill.isActive;

    return (
      <Card
        key={skill.id}
        className="bg-stone-900/50 border-orange-500/20 hover:border-orange-500/40 transition-colors"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Puzzle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-white text-base">{skill.name}</CardTitle>
                <CardDescription className="text-stone-400 text-xs">
                  {skill.id} • v{skill.version}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Check className="w-3 h-3 mr-1" />
                  {t('skills.card.active')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-300 mb-3 line-clamp-2">
            {skill.description || t('skills.card.noDescription')}
          </p>
          {skill.triggers && skill.triggers.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {skill.triggers.map((trigger) => (
                <Badge
                  key={trigger}
                  variant="secondary"
                  className="bg-stone-800 text-stone-400 text-xs"
                >
                  {trigger}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">
              {skill.author ? t('skills.card.byAuthor', { author: skill.author }) : t('skills.card.byTeam')}
            </span>
            <div className="flex items-center gap-2">
              {isInstalled ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUninstallTarget(skill)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={isActive ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => (isActive ? deactivate(skill.id) : activate(skill.id))}
                    className={
                      isActive
                        ? 'border-orange-500/30 text-orange-400'
                        : 'bg-orange-500 hover:bg-orange-400'
                    }
                  >
                    {isActive ? (
                      <>
                        <X className="w-4 h-4 mr-1" />
                        {t('skills.card.deactivate')}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        {t('skills.card.activate')}
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => installFromUrl(`https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/main/${githubPath}`)}
                  className="bg-orange-500 hover:bg-orange-400"
                >
                  <Download className="w-4 h-4 mr-1" />
                  {t('common.install')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Puzzle className="w-6 h-6 text-orange-400" />
            <div className="absolute inset-0 blur-lg bg-orange-400/50 -z-10" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">{t('skills.title')}</h2>
            <p className="text-xs text-orange-400/70 font-code">
              {t('skills.stats', { active: activeSkills.length, total: skills.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="border-orange-500/30 hover:bg-orange-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border-b border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-2 bg-stone-800/50">
            <TabsTrigger value="installed" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('skills.tabs.installed')}
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <Globe className="w-4 h-4 mr-2" />
              {t('skills.tabs.marketplace')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="installed" className="flex-1 overflow-y-auto px-6 py-4 m-0">
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500">
              <Puzzle className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-code text-sm">{t('skills.emptyState.noSkills')}</p>
              <p className="text-xs mt-2">{t('skills.emptyState.browseMarketplace')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skills.map((skill) => renderSkillCard(skill))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="flex-1 flex flex-col m-0">
          {/* Search */}
          <div className="px-6 py-4 border-b border-orange-500/10">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder={t('skills.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-stone-800/50 border-orange-500/30 text-white"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-orange-500 hover:bg-orange-400"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUrlDialog(true)}
                className="border-orange-500/30 hover:bg-orange-500/10"
              >
                <Globe className="w-4 h-4 mr-2" />
                {t('skills.install.fromUrl')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGitHubDialog(true)}
                className="border-orange-500/30 hover:bg-orange-500/10"
              >
                <Github className="w-4 h-4 mr-2" />
                {t('skills.install.fromGitHub')}
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {remoteResults.length === 0 && !isSearching && (
              <div className="flex flex-col items-center justify-center h-full text-stone-500">
                <Globe className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-code text-sm">{t('skills.emptyState.searchMarketplace')}</p>
                <p className="text-xs mt-2">{t('skills.emptyState.findSkills')}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {remoteResults.map((skill) => renderSkillCard(skill as Skill, false))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Install from URL Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent className="bg-stone-900 border-orange-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">{t('skills.dialogs.url.title')}</DialogTitle>
            <DialogDescription className="text-stone-400">
              {t('skills.dialogs.url.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t('skills.install.urlPlaceholder')}
              className="bg-stone-800 border-orange-500/30 text-white"
            />
            <Input
              value={urlIdInput}
              onChange={(e) => setUrlIdInput(e.target.value)}
              placeholder={t('skills.install.idPlaceholder')}
              className="bg-stone-800 border-orange-500/30 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUrlDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleInstallFromUrl}
              disabled={!urlInput.trim() || isInstalling}
              className="bg-orange-500 hover:bg-orange-400"
            >
              {isInstalling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('skills.dialogs.url.install')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Install from GitHub Dialog */}
      <Dialog open={showGitHubDialog} onOpenChange={setShowGitHubDialog}>
        <DialogContent className="bg-stone-900 border-orange-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">{t('skills.dialogs.github.title')}</DialogTitle>
            <DialogDescription className="text-stone-400">
              {t('skills.dialogs.github.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={githubOwner}
                onChange={(e) => setGithubOwner(e.target.value)}
                placeholder={t('skills.install.ownerPlaceholder')}
                className="bg-stone-800 border-orange-500/30 text-white"
              />
              <span className="text-stone-500 flex items-center">/</span>
              <Input
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder={t('skills.install.repoPlaceholder')}
                className="bg-stone-800 border-orange-500/30 text-white"
              />
            </div>
            <Input
              value={githubPath}
              onChange={(e) => setGithubPath(e.target.value)}
              placeholder={t('skills.install.pathPlaceholder')}
              className="bg-stone-800 border-orange-500/30 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGitHubDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleInstallFromGitHub}
              disabled={!githubOwner.trim() || !githubRepo.trim() || isInstalling}
              className="bg-orange-500 hover:bg-orange-400"
            >
              {isInstalling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('skills.dialogs.github.install')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uninstall Confirmation */}
      <Dialog open={!!uninstallTarget} onOpenChange={() => setUninstallTarget(null)}>
        <DialogContent className="bg-stone-900 border-red-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">{t('skills.dialogs.uninstall.title')}</DialogTitle>
            <DialogDescription className="text-stone-400">
              {t('skills.dialogs.uninstall.description', { name: uninstallTarget?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUninstallTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUninstall} variant="destructive">
              {t('skills.dialogs.uninstall.uninstall')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
