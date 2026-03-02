import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Loader2, Wrench, CheckCircle, XCircle } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLLMSettings } from "@/hooks/use-llm-settings";
import { usePersistentAgent } from "@/hooks/use-persistent-agent";
import { ThreadSidebar } from "@/components/chat/ThreadSidebar";
import type { UIMessage, DynamicToolUIPart } from "ai";

/**
 * ChatTab component
 * Main chat interface for interacting with the AI agent
 */
export function ChatTab() {
  const { t } = useTranslation();
  const { provider: activeProvider, isLoading: isProviderLoading } = useLLMSettings();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  const provider = activeProvider ? {
    baseURL: activeProvider.baseURL,
    apiKey: activeProvider.apiKey,
    model: activeProvider.defaultModel,
  } : null;

  const {
    messages,
    isLoading,
    sendMessage,
    clear,
    currentThread,
    createNewThread,
  } = usePersistentAgent({ threadId: currentThreadId, provider });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !provider || isLoading) return;

    // Create new thread if none selected
    let targetThreadId = currentThreadId;
    if (!targetThreadId) {
      targetThreadId = await createNewThread();
      setCurrentThreadId(targetThreadId);
      // Wait for thread to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const content = input.trim();
    setInput("");
    await sendMessage(content, targetThreadId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCreateThread = async () => {
    const newThreadId = await createNewThread();
    setCurrentThreadId(newThreadId);
  };

  const handleSelectThread = (id: string) => {
    setCurrentThreadId(id);
  };

  // Ready when provider is loaded and unlocked
  const isReady = !!provider && !isProviderLoading;

  // Header status text
  const getHeaderStatus = () => {
    if (isProviderLoading) {
      return { text: t('chat.loading'), color: 'text-stone-500' };
    }
    if (activeProvider) {
      return { text: `${activeProvider.name} • ${activeProvider.defaultModel}`, color: 'text-orange-400/70' };
    }
    return { text: t('chat.configuring'), color: 'text-stone-500' };
  };

  const headerStatus = getHeaderStatus();

  const renderMessage = (message: UIMessage, index: number) => {
    const isUser = message.role === 'user';

    return (
      <div key={message.id || index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
            <Bot className="w-4 h-4 text-orange-400" />
          </div>
        )}

        <div className={`max-w-[70%] space-y-2`}>
          {message.parts.map((part, partIndex) => {
            switch (part.type) {
              case 'text':
                return (
                  <div
                    key={partIndex}
                    className={`rounded-lg px-4 py-2 ${
                      isUser
                        ? 'bg-orange-500 text-white'
                        : 'bg-stone-800/50 border border-orange-500/20'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{part.text}</p>
                  </div>
                );

              case 'dynamic-tool':
                return <DynamicTool key={partIndex} tool={part} />;

              default:
                return null;
            }
          })}
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[600px] rounded-xl overflow-hidden border border-orange-500/20">
      {/* Sidebar */}
      <ThreadSidebar
        currentThreadId={currentThreadId}
        onSelectThread={handleSelectThread}
        onCreateThread={handleCreateThread}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-stone-950">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bot className="w-6 h-6 text-orange-400" />
              <div className="absolute inset-0 blur-lg bg-orange-400/50 -z-10" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                {currentThread?.title || t('chat.title')}
              </h2>
              <p className={`text-xs font-code ${headerStatus.color}`}>
                {headerStatus.text}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentThreadId && messages.length > 0 && (
              <button
                onClick={clear}
                className="text-xs text-stone-400 hover:text-orange-400 transition-colors"
              >
                {t('chat.clear')}
              </button>
            )}
            {isReady && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs text-amber-400 font-code">{t('chat.ready')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-stone-500">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-code text-sm">
                  {currentThreadId
                    ? t('chat.emptyState.startConversation')
                    : t('chat.emptyState.selectOrCreate')}
                </p>
                {currentThreadId && (
                  <p className="text-xs mt-2">{t('chat.emptyState.tryCommands')}</p>
                )}
              </div>
            </div>
          )}

          {messages.map((message, index) => renderMessage(message, index))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                <Bot className="w-4 h-4 text-orange-400" />
              </div>
              <div className="bg-stone-800/50 border border-orange-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                <span className="text-sm text-stone-400 font-code">
                  {t('chat.thinking')}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-orange-500/20">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder={
                isProviderLoading
                  ? t('chat.placeholder.loadingProvider')
                  : !activeProvider
                    ? t('chat.placeholder.configuringProvider')
                    : currentThreadId
                      ? t('chat.placeholder.typeMessage')
                      : t('chat.placeholder.createNewChat')
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isReady || isLoading}
              className="flex-1 bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!isReady || isLoading || !input.trim()}
              className="bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * DynamicTool component
 * Renders tool execution status in chat
 */
function DynamicTool({ tool }: { tool: DynamicToolUIPart }) {
  const { t } = useTranslation();
  const { state, toolName, output } = tool;

  if (state === 'input-available' || state === 'input-streaming') {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-400/70 font-code bg-stone-800/30 rounded px-3 py-2">
        <Wrench className="w-3 h-3" />
        <span>{t('chat.tool.using', { toolName })}</span>
      </div>
    );
  }

  if (state === 'output-available') {
    const hasError = output && typeof output === 'object' && 'error' in output;
    return (
      <div className={`flex items-center gap-2 text-xs font-code rounded px-3 py-2 ${
        hasError ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
      }`}>
        {hasError ? (
          <XCircle className="w-3 h-3" />
        ) : (
          <CheckCircle className="w-3 h-3" />
        )}
        <span>{t('chat.tool.completed', { toolName })}</span>
      </div>
    );
  }

  return null;
}
