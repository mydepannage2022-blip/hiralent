// components/candidate/dashboard/chatbot/AIChatbot.tsx
"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Image from "next/image";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  User,
  AlertCircle,
  WifiOff,
  LogIn,
  Zap,
  Copy,
  Check,
  FileText,
  Target,
  Brain,
  ChevronRight,
  Download,
  Award,
  TrendingUp,
  Edit3,
  Shield,
  Clock,
  Plus,
  Sparkles,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/src/context/AuthContext";

/* ═══════════ Constants ═══════════ */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const HIRALENT_BLUE = "#0B5CFF";
const HIRA_AVATAR = "/images/hira-avatar.png";

/* ═══════════ Types ═══════════ */
type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
  timestamp?: Date;
  error?: boolean;
  copied?: boolean;
}

interface ConversationListItem {
  conversation_id: string;
  title: string;
  last_message_at?: string | null;
  created_at?: string | null;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  prompt: string;
}

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ═══════════ Helpers ═══════════ */
function toDateMaybe(v: any): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/* ═══════════ Smart Chips ═══════════ */
const SMART_CHIPS = [
  { key: "more", label: "More" },
  { key: "example", label: "Example" },
  { key: "next", label: "Next steps" },
  { key: "simplify", label: "Simplify" },
] as const;

type SmartChipKey = (typeof SMART_CHIPS)[number]["key"];

/* ═══════════ Animation Variants ═══════════ */
const messageVariants: Variants = {
  hidden: (isUser: boolean) => ({
    opacity: 0,
    x: isUser ? 14 : -14,
    y: 6,
    scale: 0.96,
  }),
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};

const chipContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.15 },
  },
};

const chipVariants: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.85 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 30 },
  },
};

const tabContentVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

/* ═══════════ Typing Indicator ═══════════ */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex gap-2"
    >
      <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm ring-1 ring-gray-100">
        <Image
          src={HIRA_AVATAR}
          alt="Hira"
          width={28}
          height={28}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="px-3 py-2.5 rounded-2xl bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: HIRALENT_BLUE }}
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay,
                ease: "easeInOut",
              }}
            />
          ))}
          <span className="text-[11px] text-gray-400 ml-1 font-medium">
            Thinking
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════ Main Component ═══════════ */
export default function AIChatbot({ isOpen, onClose }: ChatbotProps) {
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking" | "unauthorized"
  >("checking");

  const [activeTab, setActiveTab] = useState<"chat" | "actions" | "history">(
    "chat"
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  const greeting = useMemo(
    () =>
      isAuthenticated
        ? `Hello${
            user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""
          }. I'm Hira, your AI career assistant.`
        : "Hello. I'm Hira, your AI career assistant. Please log in to get personalized help.",
    [isAuthenticated, user?.full_name]
  );

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: greeting, timestamp: new Date() },
  ]);

  const [inputMessage, setInputMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  /* ─── Quick Actions ─── */
  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: "profile-review",
        title: "Profile Review",
        description: "Get instant feedback",
        icon: <FileText className="w-4 h-4 text-white" />,
        color: "from-blue-500 to-blue-600",
        prompt: "Review my profile and give me actionable feedback to improve it",
      },
      {
        id: "score-improvement",
        title: "Boost Score",
        description: "Increase profile score",
        icon: <TrendingUp className="w-4 h-4 text-white" />,
        color: "from-green-500 to-emerald-600",
        prompt:
          "How can I improve my profile score? What specific sections should I focus on?",
      },
      {
        id: "badge-unlock",
        title: "Unlock Badges",
        description: "Earn achievements",
        icon: <Award className="w-4 h-4 text-white" />,
        color: "from-purple-500 to-violet-600",
        prompt:
          "What badges can I unlock next and what do I need to do to earn them?",
      },
      {
        id: "cv-optimization",
        title: "CV Tips",
        description: "Optimize resume",
        icon: <Edit3 className="w-4 h-4 text-white" />,
        color: "from-amber-500 to-orange-600",
        prompt: "Give me tips to optimize my CV/resume for better job opportunities",
      },
      {
        id: "skill-analysis",
        title: "Skill Analysis",
        description: "Improve skills",
        icon: <Brain className="w-4 h-4 text-white" />,
        color: "from-pink-500 to-rose-600",
        prompt:
          "Analyze my current skills and suggest which ones I should focus on developing",
      },
      {
        id: "job-match",
        title: "Job Matching",
        description: "Find best matches",
        icon: <Target className="w-4 h-4 text-white" />,
        color: "from-cyan-500 to-teal-600",
        prompt: "What types of jobs would be the best match for my profile and skills?",
      },
    ],
    []
  );

  /* ═══════════ Connection ═══════════ */
  useEffect(() => {
    if (isOpen) checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated, token, authLoading]);

  const checkConnection = async () => {
    try {
      if (authLoading) {
        setConnectionStatus("checking");
        return;
      }
      if (!isAuthenticated || !token) {
        setConnectionStatus("unauthorized");
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/v1/candidates/health`, {
        timeout: 5000,
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnectionStatus(response.status === 200 ? "connected" : "disconnected");
    } catch (error: any) {
      if (
        error.response?.status === 401 ||
        String(error.message || "").includes("401")
      ) {
        setConnectionStatus("unauthorized");
      } else {
        setConnectionStatus("disconnected");
      }
    }
  };

  const authEnabled =
    isOpen && isAuthenticated && !!token && connectionStatus === "connected";

  /* ═══════════ Conversations List ═══════════ */
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ["chatbot-conversations", token],
    enabled: authEnabled,
    queryFn: async () => {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/candidates/chatbot/conversations?limit=30`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!res.data?.success) throw new Error("Failed to fetch conversations");
      return (res.data?.data?.conversations || []) as ConversationListItem[];
    },
    staleTime: 30000,
    retry: 1,
  });

  /* ─── Create Conversation ─── */
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token");
      const res = await axios.post(
        `${API_BASE_URL}/api/v1/candidates/chatbot/conversations`,
        {},
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!res.data?.success) throw new Error("Failed to create conversation");
      const convo = res.data?.data;
      if (!convo?.conversation_id) throw new Error("conversation_id missing");
      return convo as { conversation_id: string; title: string };
    },
    onSuccess: (convo) => {
      setActiveConversationId(convo.conversation_id);
      setActiveTab("chat");
      setEditingConversationId(null);
      setEditingTitle("");
      setMessages([{ role: "assistant", content: greeting, timestamp: new Date() }]);
      queryClient.invalidateQueries({ queryKey: ["chatbot-conversations", token] });
      setTimeout(() => inputRef.current?.focus(), 120);
    },
    onError: (e) => console.error("Create conversation error:", e),
  });

  /* ─── Rename Conversation ─── */
  const renameConversationMutation = useMutation({
    mutationFn: async (payload: { conversationId: string; title: string }) => {
      if (!token) throw new Error("No token");
      const res = await axios.patch(
        `${API_BASE_URL}/api/v1/candidates/chatbot/conversations/${payload.conversationId}`,
        { title: payload.title },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to rename conversation");
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["chatbot-conversations", token],
      });
    },
    onError: (e) => console.error("Rename conversation error:", e),
  });

  const beginRename = useCallback((c: ConversationListItem) => {
    setEditingConversationId(c.conversation_id);
    setEditingTitle((c.title || "New chat").slice(0, 80));
  }, []);

  const cancelRename = useCallback(() => {
    setEditingConversationId(null);
    setEditingTitle("");
  }, []);

  const saveRename = useCallback(async () => {
    const id = editingConversationId;
    const title = (editingTitle || "").trim().slice(0, 80);
    if (!id) return;
    if (!title) return;
    await renameConversationMutation.mutateAsync({ conversationId: id, title });
    cancelRename();
  }, [editingConversationId, editingTitle, renameConversationMutation, cancelRename]);

  useEffect(() => {
    if (editingConversationId && editingConversationId !== activeConversationId) {
      cancelRename();
    }
  }, [activeConversationId, editingConversationId, cancelRename]);

  /* ═══════════ Conversation Messages ═══════════ */
  const { data: conversationMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ["chatbot-messages", token, activeConversationId],
    enabled: authEnabled && !!activeConversationId,
    queryFn: async () => {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/candidates/chatbot/conversations/${activeConversationId}/messages?limit=200`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      );
      if (!res.data?.success) throw new Error("Failed to fetch messages");
      return (
        (res.data?.data?.messages || []) as Array<{
          role: Role;
          content: string;
          created_at?: string;
        }>
      ).map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: toDateMaybe(m.created_at),
      })) as Message[];
    },
    staleTime: 15000,
    retry: 1,
  });

  useEffect(() => {
    if (!activeConversationId || !conversationMessages) return;
    setMessages([
      { role: "assistant", content: greeting, timestamp: new Date() },
      ...conversationMessages,
    ]);
  }, [activeConversationId, conversationMessages, greeting]);

  /* ═══════════ Suggestions ═══════════ */
  const { data: suggestedQuestions } = useQuery({
    queryKey: ["chatbot-suggestions", token],
    enabled: authEnabled,
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/v1/candidates/chatbot/suggestions`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      if (!res.data?.success) throw new Error("Failed to fetch suggestions");
      return (res.data?.data?.questions || []) as string[];
    },
    staleTime: 60000,
    retry: 1,
  });

  /* ═══════════ Send Message ═══════════ */
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!token) throw new Error("Please log in to use the chatbot");

      let convId = activeConversationId;

      if (!convId) {
        const created = await axios.post(
          `${API_BASE_URL}/api/v1/candidates/chatbot/conversations`,
          {},
          { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
        );
        if (!created.data?.success) throw new Error("Failed to create conversation");
        convId = created.data?.data?.conversation_id;
        if (!convId) throw new Error("conversation_id missing");
        setActiveConversationId(convId);
        queryClient.invalidateQueries({ queryKey: ["chatbot-conversations", token] });
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/v1/candidates/chatbot/message`,
        { conversation_id: convId, message },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (!res.data?.success)
        throw new Error(res.data?.message || "Failed to get response");
      return {
        response: res.data?.data?.response as string,
        convId: convId as string,
      };
    },
    onSuccess: ({ response, convId }) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response, timestamp: new Date() },
      ]);
      queryClient.invalidateQueries({ queryKey: ["chatbot-conversations", token] });
      queryClient.invalidateQueries({ queryKey: ["chatbot-messages", token, convId] });
    },
    onError: (error: any) => {
      let errorMessage = "Please check your connection and try again.";
      if (error.response?.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
        setConnectionStatus("unauthorized");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I encountered an error: ${errorMessage}`,
          timestamp: new Date(),
          error: true,
        },
      ]);
    },
  });

  /* ═══════════ Auto-scroll ═══════════ */
  useEffect(() => {
    if (!messagesEndRef.current || !chatContainerRef.current) return;
    const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
    if (scrollHeight - clientHeight <= scrollTop + 100) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 80);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        checkConnection();
      }, 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated]);

  /* ═══════════ Handlers ═══════════ */
  const pushAndSend = useCallback(
    (text: string) => {
      const clean = (text || "").trim();
      if (!clean || sendMessageMutation.isPending) return;
      if (!isAuthenticated || connectionStatus !== "connected") return;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: clean, timestamp: new Date() },
      ]);
      sendMessageMutation.mutate(clean);
      setInputMessage("");
    },
    [connectionStatus, isAuthenticated, sendMessageMutation]
  );

  const handleSend = () => pushAndSend(inputMessage);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setActiveTab("chat");
    setInputMessage(prompt);
    setTimeout(() => pushAndSend(prompt), 50);
  };

  const handleCopyMessage = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setMessages((prev) =>
        prev.map((m, i) => (i === index ? { ...m, copied: true } : m))
      );
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m, i) => (i === index ? { ...m, copied: false } : m))
        );
      }, 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSmartChip = (key: SmartChipKey) => {
    const promptMap: Record<SmartChipKey, string> = {
      more: "Tell me more about your last answer. Add extra detail.",
      example: "Give a concrete example based on your last answer.",
      next: "Give me the next steps based on your last answer. Keep it actionable.",
      simplify: "Simplify your last answer. Use very simple words and short bullets.",
    };
    const prompt = promptMap[key];
    setInputMessage(prompt);
    setTimeout(() => pushAndSend(prompt), 0);
  };

  const activeConversationTitle = useMemo(() => {
    const c = (conversations || []).find(
      (x) => x.conversation_id === activeConversationId
    );
    return c?.title || "New chat";
  }, [conversations, activeConversationId]);

  const handleExportChat = () => {
    const chatText = messages
      .map(
        (m) =>
          `${m.role === "user" ? "You" : "Hira"}: ${m.content}\n${
            m.timestamp?.toLocaleString() || ""
          }\n`
      )
      .join("\n");
    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hira-${activeConversationTitle}-${new Date()
      .toISOString()
      .split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && !messages[i].error) return i;
    }
    return -1;
  }, [messages]);

  if (!isOpen) return null;

  const inputDisabled =
    sendMessageMutation.isPending ||
    connectionStatus !== "connected" ||
    !isAuthenticated;

  const hasConversationStarted = messages.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed bottom-5 right-5 w-[360px] h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
    >
      {/* ═══════════ HEADER ═══════════ */}
      <div
        className="px-4 pt-3.5 pb-3 border-b flex flex-col relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${HIRALENT_BLUE} 0%, #0847CC 100%)`,
        }}
      >
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <motion.div
            className="absolute -top-4 -right-4 w-28 h-28 bg-white rounded-full blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        <div className="flex items-center justify-between mb-2.5 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md ring-2 ring-white/20 flex-shrink-0">
              <Image
                src={HIRA_AVATAR}
                alt="Hira AI"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            <div className="min-w-0">
              <h3 className="text-white font-bold text-[13px] leading-tight">Hira AI</h3>
              <p className="text-white/70 text-[11px] truncate max-w-[180px] leading-tight mt-0.5">
                {activeConversationTitle}
              </p>

              <div className="flex items-center gap-1.5 mt-0.5">
                <motion.div
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-400"
                      : connectionStatus === "disconnected"
                      ? "bg-red-400"
                      : "bg-yellow-400"
                  }`}
                  animate={
                    connectionStatus === "connected"
                      ? { scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }
                      : {}
                  }
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="text-white/70 text-[10px] font-medium">
                  {connectionStatus === "connected"
                    ? "Online"
                    : connectionStatus === "disconnected"
                    ? "Offline"
                    : connectionStatus === "unauthorized"
                    ? "Login required"
                    : "Connecting"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleExportChat}
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
              title="Export chat"
              disabled={messages.length <= 1}
            >
              <Download className="w-3.5 h-3.5 text-white" />
            </button>

            {isAuthenticated && (
              <button
                onClick={() => createConversationMutation.mutate()}
                className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                title="New chat"
                disabled={
                  createConversationMutation.isPending ||
                  connectionStatus !== "connected"
                }
              >
                {createConversationMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 relative z-10">
          {(
            [
              { id: "chat", label: "Chat", icon: MessageCircle },
              { id: "actions", label: "Actions", icon: Zap },
              { id: "history", label: "History", icon: Clock },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                activeTab === tab.id
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ CONTENT ═══════════ */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3 bg-gradient-to-b from-gray-50/80 to-white"
      >
        {/* Connection banners */}
        <AnimatePresence>
          {connectionStatus === "unauthorized" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3"
            >
              <div className="flex items-center gap-2 text-yellow-800">
                <LogIn className="w-4 h-4" />
                <p className="text-xs font-medium">Authentication Required</p>
              </div>
              <p className="text-[11px] text-yellow-700 mt-1.5 mb-2">
                Log in to get personalized AI assistance.
              </p>
              <button
                onClick={() => (window.location.href = "/auth/login")}
                className="w-full py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                Go to Login
              </button>
            </motion.div>
          )}

          {connectionStatus === "disconnected" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3"
            >
              <div className="flex items-center gap-2 text-red-800">
                <WifiOff className="w-4 h-4" />
                <p className="text-xs font-medium">Connection Issue</p>
              </div>
              <p className="text-[11px] text-red-700 mt-1.5 mb-2">
                Unable to connect to Hira AI.
              </p>
              <button
                onClick={() => {
                  setConnectionStatus("checking");
                  checkConnection();
                }}
                className="w-full py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-lg transition-colors"
              >
                Retry Connection
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* ═══ ACTIONS TAB ═══ */}
          {activeTab === "actions" && isAuthenticated && (
            <motion.div
              key="actions"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <h4 className="text-[13px] font-bold text-gray-900">Quick Actions</h4>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, i) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="p-3 bg-white border border-gray-200 rounded-xl text-left group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 shadow-sm`}
                    >
                      {action.icon}
                    </div>
                    <h5 className="text-xs font-bold text-gray-900 mb-0.5">
                      {action.title}
                    </h5>
                    <p className="text-[10px] text-gray-500 mb-1.5">{action.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-blue-600 font-semibold">Use now</span>
                      <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ HISTORY TAB ═══ */}
          {activeTab === "history" && isAuthenticated && (
            <motion.div
              key="history"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-2"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <h4 className="text-[13px] font-bold text-gray-900">Conversations</h4>
                </div>

                <button
                  onClick={() => createConversationMutation.mutate()}
                  className="px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all flex items-center gap-1.5"
                  disabled={
                    createConversationMutation.isPending ||
                    connectionStatus !== "connected"
                  }
                >
                  {createConversationMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  New
                </button>
              </div>

              {conversationsLoading ? (
                <div className="flex items-center justify-center gap-2 py-5">
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  <p className="text-[11px] text-gray-500">Loading...</p>
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-1.5">
                  {conversations.map((c, i) => {
                    const isActive = c.conversation_id === activeConversationId;
                    const isEditing = editingConversationId === c.conversation_id;

                    return (
                      <motion.div
                        key={c.conversation_id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`w-full rounded-lg border transition-colors ${
                          isActive ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 p-2.5">
                          <div className="w-7 h-7 rounded-lg overflow-hidden shadow-sm ring-1 ring-gray-200 flex-shrink-0">
                            <Image
                              src={HIRA_AVATAR}
                              alt="Hira"
                              width={28}
                              height={28}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  autoFocus
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveRename();
                                    if (e.key === "Escape") cancelRename();
                                  }}
                                  className="w-full text-xs font-semibold text-gray-900 bg-white border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                  placeholder="Chat name..."
                                />
                                <button
                                  type="button"
                                  onClick={saveRename}
                                  disabled={renameConversationMutation.isPending}
                                  className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-semibold disabled:opacity-50"
                                >
                                  {renameConversationMutation.isPending ? "..." : "OK"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelRename}
                                  className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveConversationId(c.conversation_id);
                                    setActiveTab("chat");
                                  }}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <p className="text-xs font-semibold text-gray-900 truncate">
                                    {c.title || "New chat"}
                                  </p>
                                  <p className="text-[10px] text-gray-500 truncate mt-0.5">
                                    {c.last_message_at
                                      ? new Date(c.last_message_at).toLocaleString()
                                      : "No messages yet"}
                                  </p>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => beginRename(c)}
                                  className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Rename"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-gray-500">No conversations yet</p>
                  <p className="text-[10px] text-gray-400 mt-1">Start a new chat</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══ CHAT TAB ═══ */}
          {activeTab === "chat" && (
            <motion.div
              key="chat"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {!activeConversationId &&
                isAuthenticated &&
                connectionStatus === "connected" && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center py-4"
                  >
                    <div className="mx-auto w-16 h-16 rounded-xl overflow-hidden mb-3 shadow-lg ring-3 ring-blue-100">
                      <Image
                        src={HIRA_AVATAR}
                        alt="Hira AI"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        priority
                      />
                    </div>
                    <h4 className="text-[13px] font-bold text-gray-900 mb-1">
                      Hello, {user?.full_name?.split(" ")[0] || "there"}.
                    </h4>
                    <p className="text-xs text-gray-500 mb-4 max-w-[240px] mx-auto">
                      Start typing - a conversation will be created automatically.
                    </p>

                    {suggestedQuestions?.length ? (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-400 mb-1.5">
                          Suggestions
                        </p>
                        {suggestedQuestions.slice(0, 3).map((q, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.06 }}
                            whileHover={{ x: 3, backgroundColor: "rgb(239 246 255)" }}
                            onClick={() => {
                              setInputMessage(q);
                              setTimeout(() => pushAndSend(q), 50);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-200 transition-all text-xs text-gray-700 group flex items-center justify-between"
                          >
                            <span className="truncate">{q}</span>
                            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    ) : null}
                  </motion.div>
                )}

              {!!activeConversationId && messagesLoading && (
                <div className="flex items-center justify-center gap-1.5 py-5">
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  <p className="text-[11px] text-gray-500">Loading messages...</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((message, index) => {
                  const isUser = message.role === "user";
                  const showChips =
                    index === lastAssistantIndex &&
                    !sendMessageMutation.isPending;

                  return (
                    <motion.div
                      key={`msg-${index}`}
                      custom={isUser}
                      variants={messageVariants}
                      initial="hidden"
                      animate="visible"
                      className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm overflow-hidden ${
                          isUser
                            ? "bg-gradient-to-br from-blue-500 to-blue-600"
                            : message.error
                            ? "bg-red-100"
                            : "ring-1 ring-gray-100"
                        }`}
                      >
                        {isUser ? (
                          <User className="w-3.5 h-3.5 text-white" />
                        ) : message.error ? (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Image
                            src={HIRA_AVATAR}
                            alt="Hira"
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div
                        className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                        style={{ maxWidth: "78%" }}
                      >
                        <div
                          className={`px-3 py-2.5 rounded-2xl group relative ${
                            isUser
                              ? "text-white shadow-sm"
                              : message.error
                              ? "bg-red-50 border border-red-200 text-red-700"
                              : "bg-white border border-gray-100 text-gray-900 shadow-sm"
                          }`}
                          style={
                            isUser
                              ? {
                                  background: `linear-gradient(135deg, ${HIRALENT_BLUE} 0%, #0847CC 100%)`,
                                }
                              : {}
                          }
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed text-[12px]">
                            {message.content}
                          </p>

                          <div className="flex items-center justify-between mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {!isUser && !message.error && (
                              <button
                                onClick={() => handleCopyMessage(message.content, index)}
                                className={`p-1 rounded-md transition-colors ${
                                  message.copied
                                    ? "text-green-600 bg-green-50"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                }`}
                                title={message.copied ? "Copied!" : "Copy"}
                              >
                                {message.copied ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            {message.timestamp && (
                              <span
                                className={`text-[10px] ${
                                  isUser
                                    ? "text-blue-100"
                                    : message.error
                                    ? "text-red-400"
                                    : "text-gray-400"
                                }`}
                              >
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {showChips && hasConversationStarted && (
                          <motion.div
                            variants={chipContainerVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex items-center gap-1 mt-1.5"
                          >
                            {SMART_CHIPS.map((c) => (
                              <motion.button
                                key={c.key}
                                variants={chipVariants}
                                whileHover={{
                                  scale: 1.05,
                                  borderColor: HIRALENT_BLUE,
                                  backgroundColor: "rgb(239 246 255)",
                                }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleSmartChip(c.key)}
                                disabled={
                                  sendMessageMutation.isPending ||
                                  !isAuthenticated ||
                                  connectionStatus !== "connected"
                                }
                                className="px-2 py-0.5 text-[10px] font-semibold rounded-full border border-gray-200 bg-white text-gray-600 hover:text-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {c.label}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <AnimatePresence>
                {sendMessageMutation.isPending && <TypingIndicator />}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════ INPUT ═══════════ */}
      {activeTab === "chat" && (
        <div className="px-3 py-2.5 border-t bg-white/95 backdrop-blur-sm">
          <div className="flex gap-1.5">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  connectionStatus === "unauthorized"
                    ? "Log in to chat..."
                    : connectionStatus === "disconnected"
                    ? "Reconnect to chat..."
                    : "Ask Hira anything..."
                }
                className="w-full px-3 py-2.5 pl-8 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                disabled={inputDisabled}
              />
              <MessageCircle className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            </div>

            <button
              onClick={handleSend}
              disabled={
                !inputMessage.trim() ||
                sendMessageMutation.isPending ||
                connectionStatus !== "connected" ||
                !isAuthenticated
              }
              className="px-3.5 py-2.5 rounded-lg text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${HIRALENT_BLUE} 0%, #0847CC 100%)`,
                boxShadow:
                  !inputMessage.trim() || inputDisabled
                    ? "none"
                    : `0 4px 12px ${HIRALENT_BLUE}30`,
              }}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Shield className="w-2.5 h-2.5" />
              <span className="font-medium">Secure</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Sparkles className="w-2.5 h-2.5" />
              <span className="font-medium">AI Powered</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}