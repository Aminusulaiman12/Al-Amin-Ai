import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div id="typing-indicator" className="flex w-full items-start gap-2.5 px-3 py-3 sm:px-5 sm:gap-3 bg-slate-900/20">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20 text-white mt-0.5">
        <Bot className="h-4 w-4" />
      </div>

      <div className="flex flex-col items-start max-w-[85%]">
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
          <span className="font-medium text-emerald-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 animate-spin" /> Al'amin AI is thinking...
          </span>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
