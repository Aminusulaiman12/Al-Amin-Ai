import React, { useRef, useEffect, useState } from 'react';
import { Send, Mic, MicOff, Square, X, Sparkles } from 'lucide-react';
import { SpeechHandler } from '../utils/speech';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text?: string) => void;
  isLoading: boolean;
  onStop: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // Cap at ~120px max height
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input]);

  // Trigger slight Android haptic feedback
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignored if not permitted
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (unless Shift key is held)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim() && !disabled) {
        triggerHaptic();
        onSend();
      }
    }
  };

  const toggleRecording = () => {
    triggerHaptic();

    if (isRecording) {
      if (recognitionObj) {
        recognitionObj.stop();
      }
      setIsRecording(false);
      return;
    }

    if (!SpeechHandler.isSTTAvailable()) {
      alert('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    const recognizer = SpeechHandler.createRecognizer(
      (transcript) => {
        setInput(transcript);
      },
      (error) => {
        console.warn('Voice input error:', error);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
      }
    );

    if (recognizer) {
      setRecognitionObj(recognizer);
      try {
        recognizer.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start voice recognition:', err);
        setIsRecording(false);
      }
    }
  };

  const handleSendClick = () => {
    triggerHaptic();
    if (isLoading) {
      onStop();
    } else if (input.trim() && !disabled) {
      onSend();
    }
  };

  const handleClear = () => {
    triggerHaptic();
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div
      id="chat-input-container"
      className="sticky bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 p-3 sm:p-4 backdrop-blur-md"
    >
      <div className="mx-auto max-w-3xl">
        {/* Voice recording alert badge */}
        {isRecording && (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300 animate-pulse">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              Listening... Speak clearly into your Android microphone
            </span>
            <button
              onClick={toggleRecording}
              className="text-[11px] font-semibold underline text-emerald-400 hover:text-emerald-200"
            >
              Done
            </button>
          </div>
        )}

        {/* Input Box Card */}
        <div className="relative flex items-end gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-lg shadow-black/40 focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all sm:gap-2">
          {/* Voice Dictation Button */}
          {SpeechHandler.isSTTAvailable() && (
            <button
              id="voice-input-btn"
              type="button"
              onClick={toggleRecording}
              disabled={disabled || isLoading}
              title={isRecording ? 'Stop voice recording' : 'Speak your question'}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
                isRecording
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-300'
              }`}
              aria-label="Voice input"
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}

          {/* Text Area */}
          <div className="relative flex-1">
            <textarea
              id="chat-textarea"
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Ask Al'amin AI anything..."
              rows={1}
              className="w-full resize-none bg-transparent px-2.5 py-2.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none max-h-32 min-h-[40px] leading-relaxed"
            />

            {/* Clear Text button */}
            {input.length > 0 && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                title="Clear input"
                className="absolute right-1 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Send / Stop Button */}
          <button
            id="send-message-btn"
            type="button"
            onClick={handleSendClick}
            disabled={disabled || (!isLoading && !input.trim())}
            title={isLoading ? 'Stop generating' : 'Send message'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-semibold transition-all active:scale-95 ${
              isLoading
                ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-600/30'
                : input.trim()
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/25 font-bold cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            aria-label={isLoading ? 'Stop response' : 'Send question'}
          >
            {isLoading ? (
              <Square className="h-4 w-4 fill-current" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-1.5 flex items-center justify-between px-2 text-[10px] text-slate-500">
          <span>Al'amin AI may make mistakes. Verify critical facts.</span>
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};
