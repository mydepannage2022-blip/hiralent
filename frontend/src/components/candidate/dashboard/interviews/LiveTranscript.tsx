'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'candidate';
  text: string;
  timestamp: Date;
}

interface LiveTranscriptProps {
  messages: Message[];
  currentTranscript: string;
  isListening: boolean;
  onEndResponse: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  userName?: string;
}

const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  messages,
  currentTranscript,
  isListening,
  onEndResponse,
  canSubmit,
  isSubmitting,
  userName = 'You',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const [thinkingLabel, setThinkingLabel] = useState('Analyzing your response...');

  useEffect(() => {
    if (!isSubmitting) {
      setThinkingLabel('Analyzing your response...');
      return;
    }
    const timer = setTimeout(() => setThinkingLabel('Preparing next question...'), 2000);
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentTranscript]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Live Transcript</h3>
      </div>

      {/* Messages */}
      <div
        ref={transcriptContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex ${message.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[70%] ${message.sender === 'ai' ? 'items-start' : 'items-end'}`}>
              <div className={`text-xs text-gray-500 mb-1 ${message.sender === 'ai' ? 'text-left' : 'text-right'}`}>
                {message.sender === 'ai' ? 'Alex' : userName}
              </div>
              <div className={`rounded-2xl px-4 py-3 ${message.sender === 'ai' ? 'bg-gray-100 text-gray-900' : 'bg-[#005DDC] text-white'}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Current Transcript (in progress) */}
        {isListening && currentTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <div className="max-w-[70%]">
              <div className="text-xs text-gray-500 mb-1 text-right flex items-center justify-end gap-1">
                {userName}
                <Mic className="w-3 h-3 text-red-500 animate-pulse" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-[#005DDC]/80 text-white">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentTranscript}</p>
                <span className="inline-block w-1 h-4 bg-white animate-pulse ml-1"></span>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI thinking indicator while submitting */}
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="max-w-[70%]">
              <div className="text-xs text-gray-500 mb-1 text-left">Alex</div>
              <div className="rounded-2xl px-4 py-3 flex items-center gap-2 overflow-hidden relative"
                style={{
                  background: 'linear-gradient(90deg, #f3f4f6, #e8eef8, #f3f4f6)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s ease-in-out infinite',
                }}>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#005DDC] inline-block"
                      animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={thinkingLabel}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-gray-500"
                  >
                    {thinkingLabel}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* Waiting indicator when not listening */}
        {!isListening && !isSubmitting && messages.length > 0 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MicOff className="w-4 h-4" />
              <span>Waiting for response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="px-6 py-4 border-t border-gray-200">
        <button
          onClick={onEndResponse}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            canSubmit && !isSubmitting
              ? 'bg-[#005DDC] text-white hover:bg-[#004EB7] active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'End Response'}
          <span className="ml-2 text-xs opacity-70">(Space)</span>
        </button>
      </div>
    </div>
  );
};

export default LiveTranscript;
