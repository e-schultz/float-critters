import { useState, useEffect, useRef } from 'react';
import { packIssueContext } from '@/lib/packIssueContext';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  references?: string[];
}

interface UseChatOptions {
  issueSlug: string;
}

export function useChat({ issueSlug }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [referencedPatterns, setReferencedPatterns] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load persisted messages on mount or slug change
  useEffect(() => {
    const storageKey = `chat:issue:${issueSlug}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsedMessages = JSON.parse(stored);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Failed to parse stored messages:', error);
        // Initialize with kickoff message
        initializeChat();
      }
    } else {
      initializeChat();
    }
  }, [issueSlug]);

  // Persist messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = `chat:issue:${issueSlug}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, issueSlug]);

  const initializeChat = async () => {
    try {
      // Get issue context for kickoff message
      const response = await fetch('/data/issues.json');
      const data = await response.json();
      const issue = data.issues.find((i: any) => i.slug === issueSlug);
      
      if (issue) {
        const kickoffMessage: ChatMessage = {
          role: 'assistant',
          content: `Hi! I'm your Field Guide assistant, grounded in the current issue context. I can help you understand patterns, explore connections between concepts, and provide deeper insights into the protocols described in **${issue.meta.title}**.\n\nWhat would you like to explore about ${issue.meta.subtitle.toLowerCase()}?`,
          references: [issue.meta.title]
        };
        setMessages([kickoffMessage]);
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      // Fallback kickoff message
      const fallbackMessage: ChatMessage = {
        role: 'assistant',
        content: "Hi! I'm your Field Guide assistant. I can help you understand patterns, explore connections between concepts, and provide insights into system design protocols.\n\nWhat would you like to explore?",
      };
      setMessages([fallbackMessage]);
    }
  };

  const sendMessage = async (content: string) => {
    if (isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Pack issue context for grounding
      const issueContext = await packIssueContext(issueSlug);
      
      // Prepare messages for API (convert to the format expected by the API)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          issueContext,
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
                // Update the assistant message in real-time
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content = assistantContent;
                  } else {
                    newMessages.push({
                      role: 'assistant',
                      content: assistantContent,
                      references: parsed.references || []
                    });
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

      // Extract referenced patterns from the response
      if (response.headers.get('x-referenced-patterns')) {
        const patterns = response.headers.get('x-referenced-patterns')?.split(',') || [];
        setReferencedPatterns(patterns);
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
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const stop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const retry = async () => {
    if (messages.length < 2) return;
    
    // Remove the last assistant message and retry with the last user message
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (lastUserMessage) {
      // Remove last assistant message if it exists
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1].role === 'assistant') {
          newMessages.pop();
        }
        return newMessages;
      });
      
      await sendMessage(lastUserMessage.content);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
    stop,
    retry,
    referencedPatterns
  };
}
