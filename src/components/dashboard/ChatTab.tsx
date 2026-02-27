import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, AlertCircle, Loader2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useLLMSettings } from "@/hooks/use-llm-settings";
import { useChat, Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";

export function ChatTab() {
  const { activeProvider } = useLLMSettings();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatInstance, setChatInstance] = useState<Chat<UIMessage> | null>(null);

  // Create chat instance when provider changes
  useEffect(() => {
    if (!activeProvider) {
      setChatInstance(null);
      return;
    }

    const transport = new DefaultChatTransport<UIMessage>({
      api: "/api/chat",
      body: {
        provider: {
          baseURL: activeProvider.baseURL,
          apiKey: activeProvider.apiKey,
          defaultModel: activeProvider.defaultModel,
        },
      },
    });

    const chat = new Chat<UIMessage>({
      transport,
    });

    setChatInstance(chat);
  }, [activeProvider]);

  const {
    messages,
    status,
    error,
    sendMessage,
    setMessages,
  } = useChat(chatInstance ? { chat: chatInstance } : undefined);

  const [input, setInput] = useState("");
  const isLoading = status === "streaming" || status === "submitted";

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show welcome message if no messages and provider is set
  useEffect(() => {
    if (messages.length === 0 && activeProvider) {
      const welcomeContent = `Hello! I'm connected to ${activeProvider.name} (${activeProvider.defaultModel}). How can I help you today?`;
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          parts: [{ type: "text", text: welcomeContent }],
        } as UIMessage,
      ]);
    }
  }, [activeProvider, messages.length, setMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatInstance) return;

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: input.trim() }],
    });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isReady = activeProvider && activeProvider.apiKey && chatInstance;

  // Helper to get text content from message parts
  const getMessageText = (msg: UIMessage): string => {
    if (!msg.parts || msg.parts.length === 0) return "";
    return msg.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  return (
    <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bot className="w-6 h-6 text-orange-400" />
            <div className="absolute inset-0 blur-lg bg-orange-400/50 -z-10" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              AGENT CHAT
            </h2>
            {activeProvider ? (
              <p className="text-xs text-orange-400/70 font-code">
                {activeProvider.name} • {activeProvider.defaultModel}
              </p>
            ) : (
              <p className="text-xs text-stone-500 font-code">
                No provider configured
              </p>
            )}
          </div>
        </div>
        {isReady && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400 font-code">READY</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
        {!isReady && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="text-sm text-orange-400">
              <p className="font-medium">No Active Provider</p>
              <p className="text-xs text-orange-400/70 mt-1">
                Go to Settings &gt; Config to set up and activate an LLM provider.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="text-sm text-red-400">
              <p className="font-medium">Error</p>
              <p className="text-xs text-red-400/70 mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
                <Bot className="w-4 h-4 text-orange-400" />
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-orange-500 text-white"
                  : "bg-stone-800/50 border border-orange-500/20"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{getMessageText(message)}</p>
            </div>
            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/30">
              <Bot className="w-4 h-4 text-orange-400" />
            </div>
            <div className="bg-stone-800/50 border border-orange-500/20 rounded-lg px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
              <span className="text-sm text-stone-400 font-code">
                Thinking...
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
              isReady
                ? "Type your message..."
                : "Configure a provider to start chatting..."
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
  );
}
