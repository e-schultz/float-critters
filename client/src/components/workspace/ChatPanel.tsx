import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageCircle, 
  Send, 
  Target, 
  User, 
  Bot,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

interface ChatPanelProps {
  workspaceId: string;
}

interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ChatPanel({ workspaceId }: ChatPanelProps) {
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const [selectedScope, setSelectedScope] = useState("whole");
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch message history
  const { data: messagesData, isLoading, error } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'messages'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds when not streaming
    refetchIntervalInBackground: false,
    enabled: !isStreaming
  });

  // Fetch draft for context-aware prompts
  const { data: draftData } = useQuery({
    queryKey: ['/api/admin/workspaces', workspaceId, 'draft'],
    queryFn: async () => {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/draft`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return null;
      return response.json();
    }
  });

  const sendMessage = async (message: string, sectionPath?: string) => {
    if (!message.trim() || isStreaming) return;

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    // Add user message immediately
    const userMessage: StreamingMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message
    };

    // Initialize streaming assistant message
    const assistantMessage: StreamingMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true
    };

    setStreamingMessage(assistantMessage);

    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`/api/admin/workspaces/${workspaceId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          sectionPath: sectionPath || null
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to send message`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              setStreamingMessage(null);
              // Invalidate queries to refresh message history
              queryClient.invalidateQueries({ 
                queryKey: ['/api/admin/workspaces', workspaceId, 'messages'] 
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingMessage(prev => prev ? {
                  ...prev,
                  content: fullContent
                } : null);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (parseError) {
              // Ignore parsing errors for individual chunks
              if (data !== '') {
                console.warn('Failed to parse streaming data:', data);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat streaming error:', error);
      setIsStreaming(false);
      setStreamingMessage(null);
      
      if (error.name !== 'AbortError') {
        toast({
          title: "Message Failed",
          description: error.message || "Failed to send message to AI assistant.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSendMessage = async () => {
    const message = messageInput.trim();
    if (!message) return;

    const sectionPath = selectedScope !== 'whole' ? selectedScope : undefined;
    setMessageInput("");
    
    await sendMessage(message, sectionPath);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setStreamingMessage(null);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData, streamingMessage]);

  const messages: Message[] = messagesData?.messages || [];
  const draft = draftData?.draft;
  const draftSections = draft?.outline?.sections || [];

  // Get scope options from draft sections
  const scopeOptions = [
    { value: 'whole', label: 'Whole workspace' },
    ...draftSections.map((section: any) => ({
      value: section.path || section.id,
      label: section.title || section.name
    }))
  ];

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-sm">
            <MessageCircle className="w-4 h-4 mr-2" />
            AI Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load chat messages. Please try refreshing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-sm">
            <MessageCircle className="w-4 h-4 mr-2" />
            AI Chat
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {messages.length} messages
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
        {/* Scope Selector */}
        <div className="flex-shrink-0">
          <div className="flex items-center space-x-2 text-xs">
            <Target className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">Scope:</span>
            <Select
              value={selectedScope}
              onValueChange={setSelectedScope}
              disabled={isStreaming}
            >
              <SelectTrigger className="h-6 text-xs" data-testid="select-chat-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4" data-testid="chat-messages">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                      <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className="flex items-start space-x-3"
                    data-testid={`message-${message.role}-${message.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {message.role === 'user' ? 'You' : 'AI Assistant'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </span>
                        {message.sectionPath && (
                          <Badge variant="outline" className="text-xs">
                            {message.sectionPath}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Streaming message */}
                {streamingMessage && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">AI Assistant</span>
                        <Badge variant="secondary" className="text-xs animate-pulse">
                          <Loader2 className="w-2 h-2 mr-1 animate-spin" />
                          typing...
                        </Badge>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {streamingMessage.content}
                        <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 space-y-2">
          <div className="flex space-x-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask about ${selectedScope === 'whole' ? 'the workspace' : selectedScope}...`}
              disabled={isStreaming}
              className="flex-1"
              data-testid="input-chat-message"
            />
            {isStreaming ? (
              <Button 
                onClick={stopStreaming}
                variant="outline"
                size="icon"
                data-testid="button-stop-chat"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
              </Button>
            ) : (
              <Button 
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isLoading}
                size="icon"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </CardContent>
    </Card>
  );
}