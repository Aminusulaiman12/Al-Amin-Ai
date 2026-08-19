import React, { useState } from 'react';
import { Bot, RotateCcw, Sparkles, Volume2, VolumeX, Type, Trash2, X } from 'lucide-react';

interface HeaderProps {
  onNewChat: () => void;
  messageCount: number;
  fontSize: 'sm' | 'base' | 'lg';
  onToggleFontSize: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNewChat,
  messageCount,
  fontSize,
  onToggleFontSize,
  isMuted,
  onToggleMute,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearClick = () => {
    if (messageCount > 0) {
      setShowClearConfirm(true);
    }
  };

  const confirmClear = () => {
    setShowClearConfirm(false);
    onNewChat();
  };

  return (
    <>
      <header
        id="app-header"
        className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-2.5 backdrop-blur-md transition-all sm:px-5 sm:py-3"
      >
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-md shadow-emerald-500/20">
            <Bot className="h-5 w-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                Al'amin AI
              </h1>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <Sparkles className="mr-0.5 h-2.5 w-2.5" /> v3.7
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Trusted Mobile AI App
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Font Size Cycle */}
          <button
            id="font-size-toggle-btn"
            onClick={onToggleFontSize}
            title={`Font size: ${fontSize.toUpperCase()}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/60 text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white active:scale-95"
            aria-label="Adjust font size"
          >
            <Type className="h-4 w-4" />
          </button>

          {/* Sound / TTS Toggle */}
          <button
            id="speech-toggle-btn"
            onClick={onToggleMute}
            title={isMuted ? 'Voice read-aloud: Muted' : 'Voice read-aloud: Enabled'}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors active:scale-95 ${
              isMuted
                ? 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-slate-200'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
            aria-label="Toggle voice readout"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* New / Clear Chat */}
          {messageCount > 0 && (
            <button
              id="new-chat-btn"
              onClick={handleClearClick}
              title="Start New Chat"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/80 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 active:scale-95 sm:px-3"
              aria-label="Start new conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            id="clear-chat-modal"
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="h-5 w-5" />
                <h3 className="text-base font-semibold text-white">Clear Conversation?</h3>
              </div>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 py-2">
              This will erase all current messages in this conversation and start a fresh session with Al'amin AI.
            </p>

            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                id="cancel-clear-btn"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                id="confirm-clear-btn"
                onClick={confirmClear}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
