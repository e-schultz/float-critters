import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bot, 
  User, 
  Send, 
  Square, 
  RefreshCw, 
  Loader, 
  Sparkles,
  Settings,
  Trash2,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  timestamp: Date;
}

export default function AdminChat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: `Hello! I'm your Field Guide Zine Admin Assistant. I can help you with:

• **Content Management**: Create, edit, and delete zine issues
• **Content Import**: Transform raw content into structured formats
• **Issue Analysis**: Analyze existing content and suggest improvements
• **Workflow Automation**: Help streamline your content creation process

I have access to all admin tools and can perform actual operations on your content. What would you like to work on today?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      abortControllerRef.current = new AbortController();
      
      // Build admin context for the AI
      const adminContext = {
        userRole: 'admin',
        capabilities: [
          'create_issues',
          'update_issues', 
          'delete_issues',
          'transform_content',
          'manage_imports'
        ],
        availableTools: [
          '/api/admin/issues',
          '/api/admin/transform-content',
          '/api/admin/imports'
        ]
      };

      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // For now, use the regular chat endpoint but with admin context
      // In the future, this could be a specialized admin chat endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin-token')}`
        },
        body: JSON.stringify({
          messages: apiMessages,
          issueContext: null, // No specific issue context
          adminContext,
          modelId: 'claude-sonnet-4-20250514'
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      
      // Add assistant message placeholder
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                // Update the last message with streaming content
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content = assistantContent;
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parsing errors for streaming chunks
            }
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Chat Error",
        description: "Failed to get response from AI assistant.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    // Re-add welcome message
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: "Chat cleared! I'm ready to help with your Field Guide Zine administration. What would you like to work on?",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <LayoutShell 
      breadcrumb={[
        { label: "Admin", href: "/admin" },
        { label: "AI Assistant", href: "/admin/chat" }
      ]}
    >
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
              <p className="text-muted-foreground">
                Get help with content creation and management tasks.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Claude 4.1
              </Badge>
              <Button variant="outline" size="sm" onClick={handleClearChat} data-testid="button-clear-chat">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          {/* Chat Interface */}
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2 text-primary" />
                Admin Assistant
              </CardTitle>
              <CardDescription>
                Specialized assistant with access to all admin tools and capabilities
              </CardDescription>
            </CardHeader>
            
            {/* Messages Area */}
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="p-6 space-y-4" data-testid="chat-messages">
                {messages.map((message, index) => (
                  <div key={index} className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    
                    <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'max-w-xs' : ''}`}>
                      <div className={`rounded-lg p-4 ${
                        message.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : 'bg-card border border-border'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                        
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="text-xs text-muted-foreground mb-2">Tool Calls:</div>
                            <div className="space-y-1">
                              {message.toolCalls.map((call, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {call.function?.name || call.type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Assistant is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            
            {/* Input Area */}
            <div className="border-t border-border p-4">
              <div className="space-y-3">
                <div className="relative">
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me to help with content management, issue creation, or any admin task..."
                    className="pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-32"
                    rows={2}
                    disabled={isLoading}
                    data-testid="chat-input"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    className="absolute bottom-2 right-2 p-2"
                    size="icon"
                    variant="ghost"
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center space-x-3">
                    {isLoading && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleStop}
                        className="h-auto p-1"
                        data-testid="button-stop"
                      >
                        <Square className="w-3 h-3 mr-1" />
                        Stop
                      </Button>
                    )}
                    <span>Press Enter to send, Shift+Enter for new line</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Admin Mode
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>
                Common admin tasks you can ask me to help with
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setInputValue("Help me import and transform some content into a new zine issue.")}
                  data-testid="quick-action-import"
                >
                  Import & Transform Content
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setInputValue("Show me all the issues I have and help me organize them.")}
                  data-testid="quick-action-organize"
                >
                  Review & Organize Issues
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setInputValue("Analyze my latest content and suggest improvements.")}
                  data-testid="quick-action-analyze"
                >
                  Analyze Content
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setInputValue("Help me plan my next zine issue based on current trends.")}
                  data-testid="quick-action-plan"
                >
                  Plan Next Issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </LayoutShell>
  );
}