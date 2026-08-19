import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Volume2, VolumeX, AlertCircle, RefreshCw, Globe, ExternalLink } from 'lucide-react';
import { Message } from '../types';
import { SpeechHandler } from '../utils/speech';

interface ChatMessageItemProps {
  message: Message;
  fontSize: 'sm' | 'base' | 'lg';
  isMuted: boolean;
  onRetry?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  fontSize,
  isMuted,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      SpeechHandler.stopSpeaking();
      setIsSpeaking(false);
    } else {
      SpeechHandler.speak(
        message.content,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false),
        () => setIsSpeaking(false)
      );
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTextSizeClass = () => {
    switch (fontSize) {
      case 'sm':
        return 'text-xs sm:text-sm leading-relaxed';
      case 'lg':
        return 'text-base sm:text-lg leading-relaxed';
      case 'base':
      default:
        return 'text-sm sm:text-base leading-relaxed';
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group flex w-full gap-2.5 px-3 py-3 sm:px-5 sm:gap-3 transition-colors ${
        isUser ? 'justify-end' : 'justify-start bg-slate-900/30'
      }`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20 text-white mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}

      {/* Message Content Container */}
      <div
        className={`flex flex-col ${
          isUser ? 'items-end max-w-[85%] sm:max-w-[75%]' : 'items-start max-w-[92%] sm:max-w-[85%]'
        }`}
      >
        {/* Author Label & Timestamp */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
          <span className="font-medium text-slate-300">
            {isUser ? 'You' : "Al'amin AI"}
          </span>
          <span>•</span>
          <span>{formatTime(message.timestamp)}</span>
        </div>

        {/* Bubble Box */}
        <div
          className={`relative rounded-2xl p-3.5 sm:p-4 shadow-sm ${
            isUser
              ? 'rounded-tr-sm bg-emerald-600 text-white font-medium shadow-emerald-950/20'
              : message.isError
              ? 'rounded-tl-sm border border-rose-800/60 bg-rose-950/30 text-rose-200'
              : 'rounded-tl-sm border border-slate-800/90 bg-slate-900/90 text-slate-100'
          }`}
        >
          {/* Error notice */}
          {message.isError && (
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs mb-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Response Encountered an Issue</span>
            </div>
          )}

          {/* Body Content */}
          <div className={`${getTextSizeClass()} overflow-x-auto break-words`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-li:my-0.5 prose-pre:my-2 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:p-3 prose-pre:rounded-xl prose-code:text-emerald-300 prose-code:bg-slate-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-cyan-400 prose-a:underline prose-table:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Grounding Web Sources if available */}
          {message.sources && message.sources.length > 0 && !message.isStreaming && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 mb-2">
                <Globe className="h-3.5 w-3.5" />
                <span>Web Sources & Grounding</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {message.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 max-w-[240px] truncate rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Streaming Cursor */}
          {message.isStreaming && (
            <span className="inline-block h-4 w-1.5 animate-pulse bg-emerald-400 align-middle ml-1 rounded-sm" />
          )}

          {/* Retry Button if Error */}
          {message.isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-rose-700/60 bg-rose-900/40 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-900/80 active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Message
            </button>
          )}
        </div>

        {/* Message Actions (Copy & Read Aloud) */}
        {!isUser && !message.isStreaming && !message.isError && (
          <div className="mt-1.5 flex items-center gap-1 px-1">
            <button
              onClick={handleCopy}
              title="Copy answer"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {SpeechHandler.isTTSAvailable() && !isMuted && (
              <button
                onClick={handleSpeak}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors active:scale-95 ${
                  isSpeaking
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="h-3 w-3" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3 w-3" />
                    <span>Read</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300 shadow-sm mt-0.5">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};
