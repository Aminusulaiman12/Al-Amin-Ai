import React from 'react';
import { Bot, Sparkles, PenTool, Lightbulb, BookOpen, CheckCircle2, Code, ShieldCheck, Zap, Smartphone } from 'lucide-react';
import { QUICK_PROMPTS } from '../data/prompts';
import { QuickPrompt } from '../types';

interface WelcomeHeroProps {
  onSelectPrompt: (promptText: string) => void;
}

export const WelcomeHero: React.FC<WelcomeHeroProps> = ({ onSelectPrompt }) => {
  const getPromptIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="h-4 w-4 text-amber-400" />;
      case 'PenTool':
        return <PenTool className="h-4 w-4 text-cyan-400" />;
      case 'Lightbulb':
        return <Lightbulb className="h-4 w-4 text-emerald-400" />;
      case 'BookOpen':
        return <BookOpen className="h-4 w-4 text-indigo-400" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="h-4 w-4 text-teal-400" />;
      case 'Code':
        return <Code className="h-4 w-4 text-violet-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <div id="welcome-hero" className="flex flex-col items-center justify-center py-6 px-4 text-center max-w-2xl mx-auto">
      {/* Visual Avatar */}
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 shadow-xl shadow-emerald-500/25 border border-emerald-400/20">
        <Bot className="h-10 w-10 text-white" />
        <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-emerald-500/30">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      </div>

      {/* Greeting */}
      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Peace & Welcome to <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Al'amin AI</span>
      </h2>
      <p className="mt-2 text-sm text-slate-300 max-w-md leading-relaxed">
        Your trusted mobile AI app. Ask any question, draft content, solve problems, or have an open conversation.
      </p>

      {/* Android Feature Highlights */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-emerald-300">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Universal Intelligence
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-cyan-300">
          <Zap className="h-3.5 w-3.5 text-cyan-400" /> Live Web Search
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-400" /> 100% Reliable
        </span>
      </div>

      {/* Quick Starter Suggestions */}
      <div className="mt-7 w-full text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mb-3">
          Suggested Questions & Starters
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {QUICK_PROMPTS.map((item: QuickPrompt) => (
            <button
              key={item.id}
              id={`quick-prompt-${item.id}`}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col items-start justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 text-left transition-all hover:border-emerald-500/40 hover:bg-slate-800/80 hover:shadow-md hover:shadow-emerald-950/30 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 mb-1.5 w-full">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60 group-hover:bg-slate-700">
                  {getPromptIcon(item.iconName)}
                </span>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                  {item.title}
                </span>
                <span className="ml-auto text-[10px] text-slate-500 border border-slate-800 rounded px-1.5 py-0.5">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                "{item.prompt}"
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
