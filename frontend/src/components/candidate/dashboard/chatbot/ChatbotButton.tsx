// components/candidate/dashboard/chatbot/ChatbotButton.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, WifiOff, Sparkles, ArrowRight } from "lucide-react";
import Image from "next/image";
import AIChatbot from "./AIChatbot";
import { API_HOST } from "@/src/lib/config/api";
import axios from "axios";

const HIRALENT_BLUE = "#0B5CFF";
const HIRA_AVATAR = "/images/hira-avatar.png";

export default function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");
  const [hasNotification, setHasNotification] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 60000);

    // Delay bubble appearance for a nice entrance
    const bubbleTimer = setTimeout(() => setShowBubble(true), 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(bubbleTimer);
    };
  }, []);

  const checkConnection = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        setConnectionStatus("disconnected");
        return;
      }
      const response = await axios.get(
        `${API_HOST}/api/v1/candidates/health`,
        { timeout: 3000, headers: { Authorization: `Bearer ${token}` } }
      );
      setConnectionStatus(
        response.status === 200 ? "connected" : "disconnected"
      );
    } catch {
      setConnectionStatus("disconnected");
    }
  };

  return (
    <>
      {/* ═══════════ Speech Bubble Notification ═══════════ */}
      <AnimatePresence>
        {hasNotification && !isOpen && showBubble && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20, originX: 1, originY: 1 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 25,
            }}
            className="fixed bottom-[92px] right-6 z-40"
          >
            <button
              onClick={() => {
                setHasNotification(false);
                setIsOpen(true);
              }}
              className="group relative"
            >
              {/* Glow */}
              <motion.div
                className="absolute -inset-2 rounded-3xl blur-xl"
                style={{
                  background: `linear-gradient(135deg, ${HIRALENT_BLUE}30, #6366f130)`,
                }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />

              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100/80 px-5 py-4 max-w-[260px] backdrop-blur-sm">
                {/* Accent bar */}
                <motion.div
                  className="absolute top-0 left-4 right-4 h-[3px] rounded-b-full"
                  style={{
                    background: `linear-gradient(90deg, ${HIRALENT_BLUE}, #6366f1, ${HIRALENT_BLUE})`,
                  }}
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />

                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <motion.div
                      className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-100"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Image
                        src={HIRA_AVATAR}
                        alt="Hira"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    {/* Typing dots */}
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      <div className="flex gap-[3px] bg-gray-100 rounded-full px-1.5 py-[3px]">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <motion.div
                            key={i}
                            className="w-[4px] h-[4px] rounded-full bg-blue-500"
                            animate={{ y: [0, -3, 0] }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 leading-tight">
                      Hi! I&apos;m Hira
                    </p>
                    <p className="text-[12px] text-gray-500 mt-1 leading-snug">
                      Need help with your profile?
                    </p>
                    <motion.div
                      className="flex items-center gap-1 mt-2 text-[11px] font-semibold"
                      style={{ color: HIRALENT_BLUE }}
                      whileHover={{ x: 4 }}
                    >
                      <span>Let&apos;s chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </motion.div>
                  </div>
                </div>

                {/* Tail */}
                <div className="absolute -bottom-[7px] right-8 w-3.5 h-3.5 bg-white border-r border-b border-gray-100/80 transform rotate-45" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ Floating Avatar Button ═══════════ */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
      >
        {/* Pulsing rings */}
        {!isOpen && (
          <>
            {[0, 0.8].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${HIRALENT_BLUE}` }}
                animate={{
                  scale: [1, 1.6],
                  opacity: [0.35, 0],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay,
                }}
              />
            ))}
          </>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsOpen(!isOpen);
            setHasNotification(false);
            setShowBubble(false);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative w-[62px] h-[62px] rounded-full shadow-2xl flex items-center justify-center group overflow-visible"
          style={{
            boxShadow: isOpen
              ? "0 4px 20px rgba(0,0,0,0.15)"
              : `0 8px 32px ${HIRALENT_BLUE}55, 0 2px 8px rgba(0,0,0,0.1)`,
          }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.25, ease: "backOut" }}
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${HIRALENT_BLUE} 0%, #0847CC 100%)`,
                }}
              >
                <X className="w-7 h-7 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="avatar"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.25, ease: "backOut" }}
                className="relative w-full h-full"
              >
                {/* Gradient ring border */}
                <div
                  className="absolute inset-0 rounded-full p-[3px]"
                  style={{
                    background: `linear-gradient(135deg, ${HIRALENT_BLUE} 0%, #6366f1 50%, ${HIRALENT_BLUE} 100%)`,
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-white">
                    <Image
                      src={HIRA_AVATAR}
                      alt="Chat with Hira AI"
                      width={62}
                      height={62}
                      className="w-full h-full object-cover scale-[1.15] translate-y-[2px]"
                      priority
                    />
                  </div>
                </div>

                {/* Status dot */}
                <div className="absolute -top-0.5 -right-0.5 z-10">
                  {connectionStatus === "connected" ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 border-[2.5px] border-white shadow-md"
                    />
                  ) : connectionStatus === "disconnected" ? (
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-pink-600 border-[2.5px] border-white shadow-md flex items-center justify-center">
                      <WifiOff className="w-2 h-2 text-white" />
                    </div>
                  ) : null}
                </div>

                {/* Notification badge */}
                {hasNotification && (
                  <div className="absolute -top-1 -left-1 z-10">
                    <motion.span
                      className="absolute inline-flex w-5 h-5 rounded-full bg-red-500"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 border-2 border-white text-[9px] font-bold text-white shadow-md">
                      1
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Hover tooltip */}
        <AnimatePresence>
          {isHovered && !isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="absolute right-[72px] top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <div className="relative">
                <div className="bg-gray-900 text-white text-xs font-medium px-3.5 py-2.5 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>Chat with Hira</span>
                </div>
                <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-l-[6px] border-l-gray-900 border-b-[5px] border-b-transparent" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ═══════════ Chatbot Window ═══════════ */}
      <AnimatePresence>
        {isOpen && (
          <AIChatbot isOpen={isOpen} onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}