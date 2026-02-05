'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import Image from 'next/image';

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
  candidatePhoto?: string | null;
}

const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  messages,
  currentTranscript,
  isListening,
  onEndResponse,
  canSubmit,
  isSubmitting,
  userName = 'You',
  candidatePhoto,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
          >
            {/* AI Avatar (left side) */}
            {message.sender === 'ai' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden shadow-md bg-gradient-to-br from-[#005DDC] to-[#7C3AED] flex items-center justify-center">
                <span className="text-white font-semibold text-sm">AI</span>
              </div>
            )}

            <div className={`max-w-[70%] ${message.sender === 'ai' ? 'items-start' : 'items-end'}`}>
              {/* Sender Label */}
              <div className={`text-xs text-gray-500 mb-1 ${message.sender === 'ai' ? 'text-left' : 'text-right'}`}>
                {message.sender === 'ai' ? 'AI Interviewer' : userName}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.sender === 'ai'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-[#005DDC] text-white'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>

            {/* Candidate Avatar (right side) */}
            {message.sender === 'candidate' && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-200 shadow-md">
                {candidatePhoto ? (
                  <Image
                    src={candidatePhoto}
                    alt={userName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}

        {/* Current Transcript (in progress) */}
        {isListening && currentTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-end"
          >
            <div className="max-w-[70%] items-end">
              <div className="text-xs text-gray-500 mb-1 text-right flex items-center justify-end gap-1">
                {userName}
                <Mic className="w-3 h-3 text-red-500 animate-pulse" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-[#005DDC]/80 text-white">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{currentTranscript}</p>
                <span className="inline-block w-1 h-4 bg-white animate-pulse ml-1"></span>
              </div>
            </div>

            {/* Candidate Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-200 shadow-md">
              {candidatePhoto ? (
                <Image
                  src={candidatePhoto}
                  alt={userName}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Waiting indicator when not listening */}
        {!isListening && messages.length > 0 && (
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
