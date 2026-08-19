import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { WelcomeHero } from './components/WelcomeHero';
import { ChatMessageItem } from './components/ChatMessageItem';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { Message } from './types';
import { ArrowDown, AlertTriangle } from 'lucide-react';
import { SpeechHandler } from './utils/speech';

const STORAGE_KEY = 'alamin_ai_messages_v1';
const FONT_SIZE_KEY = 'alamin_ai_font_size';
const MUTE_KEY = 'alamin_ai_mute_pref';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_KEY);
      return (saved as 'sm' | 'base' | 'lg') || 'base';
    } catch {
      return 'base';
    }
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(MUTE_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save messages to local storage:', err);
    }
  }, [messages]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(FONT_SIZE_KEY, fontSize);
    } catch {}
  }, [fontSize]);

  useEffect(() => {
    try {
      localStorage.setItem(MUTE_KEY, JSON.stringify(isMuted));
    } catch {}
  }, [isMuted]);

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isTyping]);

  // Track scroll position to show "scroll to bottom" button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const handleToggleFontSize = () => {
    setFontSize((curr) => {
      if (curr === 'sm') return 'base';
      if (curr === 'base') return 'lg';
      return 'sm';
    });
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      SpeechHandler.stopSpeaking();
    }
    setIsMuted(!isMuted);
  };

  const handleNewChat = () => {
    SpeechHandler.stopSpeaking();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setIsTyping(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsTyping(false);

    setMessages((prev) =>
      prev.map((msg) =>
        msg.isStreaming ? { ...msg, isStreaming: false } : msg
      )
    );
  };

  const sendMessage = async (overridePrompt?: string) => {
    const textToSend = (overridePrompt || input).trim();
    if (!textToSend || isLoading) return;

    // Reset input
    setInput('');
    SpeechHandler.stopSpeaking();

    const userMessage: Message = {
      id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const newMessagesList = [...messages, userMessage];
    setMessages(newMessagesList);
    setIsLoading(true);
    setIsTyping(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Placeholder model message for streaming
    const aiMessageId = 'ai-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    // Prepare message history to send (latest 10 turns for context)
    const contextMessages = newMessagesList.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      // Try streaming endpoint first
      const clientTime = new Date().toISOString();
      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: contextMessages,
          clientTime,
          clientTimeZone,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      setIsTyping(false);
      setMessages((prev) => [...prev, aiMessage]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let accumulatedSources: Array<{ title: string; url: string }> = [];

      if (reader) {
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.text) {
                    accumulatedText += data.text;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, content: accumulatedText, isStreaming: true }
                          : msg
                      )
                    );
                  }
                  if (data.sources && Array.isArray(data.sources)) {
                    accumulatedSources = data.sources;
                  }
                  if (data.done) {
                    done = true;
                  }
                  if (data.error) {
                    throw new Error(data.error);
                  }
                } catch (parseError) {
                  // Skip invalid parse lines
                }
              }
            }
          }
        }
      }

      // Mark streaming complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content:
                  accumulatedText ||
                  '',
                isStreaming: false,
                sources:
                  accumulatedSources.length > 0 ? accumulatedSources : undefined,
              }
            : msg
        )
      );

      // Auto read response if unmuted
      if (!isMuted && accumulatedText) {
        SpeechHandler.speak(accumulatedText);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation stopped by user');
        return;
      }

      console.warn('Streaming failed or unavailable, attempting fallback non-stream chat:', err);

      // Fallback to standard /api/chat
      try {
        const fallbackRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: contextMessages,
            clientTime: new Date().toISOString(),
            clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
          signal: controller.signal,
        });

        if (!fallbackRes.ok) {
          const errJson = await fallbackRes.json().catch(() => ({}));
          throw new Error(errJson.error || `Server error ${fallbackRes.status}`);
        }

        const data = await fallbackRes.json();
        const replyText =
          data.reply ||
          "I'm sorry, I could not generate a response. Please try again.";
        const sources =
          data.sources && Array.isArray(data.sources) && data.sources.length > 0
            ? data.sources
            : undefined;

        setMessages((prev) => {
          const exists = prev.some((m) => m.id === aiMessageId);
          if (exists) {
            return prev.map((m) =>
              m.id === aiMessageId
                ? {
                    ...m,
                    content: replyText,
                    isStreaming: false,
                    isError: false,
                    sources,
                  }
                : m
            );
          } else {
            return [
              ...prev,
              {
                id: aiMessageId,
                role: 'model',
                content: replyText,
                timestamp: Date.now(),
                isStreaming: false,
                sources,
              },
            ];
          }
        });

        if (!isMuted && replyText) {
          SpeechHandler.speak(replyText);
        }
      } catch (fallbackErr: any) {
        if (fallbackErr.name === 'AbortError') return;

        console.error('All chat endpoints failed:', fallbackErr);
        const errMsg =
          fallbackErr.message ||
          'Unable to reach Al\'amin AI. Please check your network connection or try again shortly.';

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== aiMessageId);
          return [
            ...filtered,
            {
              id: aiMessageId,
              role: 'model',
              content: errMsg,
              timestamp: Date.now(),
              isStreaming: false,
              isError: true,
            },
          ];
        });
      }
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetryLastMessage = () => {
    // Find the last user query
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Top Mobile-Friendly Navigation Header */}
      <Header
        onNewChat={handleNewChat}
        messageCount={messages.length}
        fontSize={fontSize}
        onToggleFontSize={handleToggleFontSize}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Conversation & Response Area */}
      <main
        ref={chatContainerRef}
        onScroll={handleScroll}
        id="chat-scroll-area"
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        <div className="mx-auto max-w-3xl pb-6">
          {/* Welcome landing view if empty */}
          {messages.length === 0 ? (
            <WelcomeHero onSelectPrompt={(p) => sendMessage(p)} />
          ) : (
            <div className="flex flex-col divide-y divide-slate-900/60 pt-2">
              {messages.map((message) => (
                <ChatMessageItem
                  key={message.id}
                  message={message}
                  fontSize={fontSize}
                  isMuted={isMuted}
                  onRetry={handleRetryLastMessage}
                />
              ))}

              {/* Animated Typing Indicator while thinking */}
              {isTyping && <TypingIndicator />}
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>
      </main>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          id="scroll-to-bottom-btn"
          onClick={() => scrollToBottom(true)}
          className="fixed bottom-24 right-5 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800/90 text-slate-200 shadow-xl backdrop-blur-md transition-all hover:bg-slate-700 hover:text-white active:scale-95"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}

      {/* Bottom Text Box, Voice Input & Send Button */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={() => sendMessage()}
        isLoading={isLoading}
        onStop={handleStopGeneration}
        disabled={false}
      />
    </div>
  );
}
