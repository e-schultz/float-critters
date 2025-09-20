import { useState, useEffect, useRef } from "react";
import { X, Bot, User, Send, Square, RefreshCw, CheckCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/useChat";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentIssue?: {
    slug: string;
    meta: { title: string };
  };
}

export function ChatPanel({ isOpen, onClose, currentIssue }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    stop, 
    retry,
    referencedPatterns 
  } = useChat({
    issueSlug: currentIssue?.slug || 'general'
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    await sendMessage(inputValue.trim());
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => {
        const input = document.getElementById('chat-input');
        input?.focus();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50" 
        onClick={onClose}
        data-testid="chat-overlay"
      />
      
      {/* Chat Panel */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l border-border z-50 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`} data-testid="chat-panel">
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-border" data-testid="chat-header">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Field Guide Assistant</h3>
                <p className="text-xs text-muted-foreground">Claude 4.1 Opus</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              aria-label="Close chat"
              data-testid="chat-close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                
                <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'max-w-xs' : ''}`}>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground ml-auto' 
                      : 'bg-card border border-border'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                  
                  {message.role === 'assistant' && message.references && message.references.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center space-x-2" data-testid="message-references">
                      <CheckCircle className="w-3 h-3" />
                      <span>Referenced: {message.references.join(', ')}</span>
                    </div>
                  )}
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
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="border-t border-border p-4" data-testid="chat-input-area">
            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  id="chat-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${currentIssue?.meta.title || 'patterns, protocols, or connections'}...`}
                  className="w-full pr-12 bg-input border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-32"
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
                  aria-label="Send message"
                  data-testid="send-button"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center space-x-3">
                  {isLoading && (
                    <button 
                      onClick={stop}
                      className="hover:text-foreground transition-colors flex items-center"
                      data-testid="stop-button"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Stop
                    </button>
                  )}
                  {!isLoading && messages.length > 0 && (
                    <button 
                      onClick={retry}
                      className="hover:text-foreground transition-colors flex items-center"
                      data-testid="retry-button"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </button>
                  )}
                </div>
                <div className="text-xs">
                  {currentIssue && (
                    <span className="text-muted-foreground">
                      Context: {currentIssue.meta.title}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
