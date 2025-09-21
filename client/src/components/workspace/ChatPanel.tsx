import { useChat } from '@ai-sdk/react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageCircle, 
  Send, 
  Target, 
  User, 
  Bot,
  Loader2,
  Square,
  RefreshCw
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface ChatPanelProps {
  workspaceId: string;
}

export function ChatPanel({ workspaceId }: ChatPanelProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasHydratedRef = useRef(false);
  const [selectedScope, setSelectedScope] = useState("whole");

  // Fetch draft for context-aware prompts
  const { data: draftData } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'draft'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/draft`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Fetch persisted message history
  const { data: messagesData } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'messages'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    }
  });

  // Convert persisted messages to AI SDK format
  const persistedMessages = messagesData?.messages?.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content
  })) || [];

  // Modern AI SDK chat hook with persisted history
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    error,
    reload,
    setMessages
  } = useChat({
    api: `/api/workspace/${workspaceId}/chat`,
    body: {
      sectionPath: selectedScope !== 'whole' ? selectedScope : undefined
    },
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('admin-token')}`
    },
    onError: (error) => {
      toast({
        title: "Chat Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    },
    onFinish: () => {
      // Invalidate messages query after successful completion
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/workspaces', workspaceId, 'messages'] 
      });
    }
  });

  // Rehydrate persisted messages when data loads (one-time only)
  useEffect(() => {
    if (messagesData?.messages && persistedMessages.length > 0 && messages.length === 0 && !hasHydratedRef.current) {
      setMessages(persistedMessages);
      hasHydratedRef.current = true;
    }
  }, [messagesData, setMessages, persistedMessages.length, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const draft = draftData?.draft;
  const draftSections = draft?.outline?.sections || [];
  const isEmptyChat = messages.length === 0;

  // Get scope options from draft sections
  const scopeOptions = [
    { value: "whole", label: "Whole Draft" },
    ...draftSections.map((section: any) => ({
      value: section.path,
      label: section.title
    }))
  ];

  return (
    <Card className="h-full flex flex-col" data-testid="chat-panel">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedScope} onValueChange={setSelectedScope}>
              <SelectTrigger className="w-48" data-testid="select-scope">
                <Target className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    data-testid={`scope-option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedScope !== "whole" && (
              <Badge variant="secondary" className="text-xs">
                Scoped
              </Badge>
            )}
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reload}
                disabled={isLoading}
                data-testid="button-reload"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 p-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-4 pr-4">
            {isEmptyChat && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    Ask me about your draft or workspace
                  </p>
                  <p className="text-xs mt-1">
                    I have access to your current draft and can help with content, structure, and ideas
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 animate-in slide-in-from-bottom-2",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
                data-testid={`message-${message.role}-${message.id}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-muted'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Streaming indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error.message || "An error occurred while sending your message."}
            </AlertDescription>
          </Alert>
        )}

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={
              selectedScope === "whole" 
                ? "Ask about your draft, get ideas, or request changes..." 
                : `Ask about ${scopeOptions.find(s => s.value === selectedScope)?.label}...`
            }
            disabled={isLoading}
            className="flex-1"
            data-testid="input-message"
          />
          
          {isLoading ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={stop}
              data-testid="button-stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}