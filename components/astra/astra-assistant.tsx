"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AstraOrb } from "./astra-orb";
import { getAstraResponseWithTools, buildRichContextString, type ChatMessage } from "@/lib/gemini";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import type { ToolAction, AstraContext } from "@/lib/astra-tools";
import {
  Send, X, Mic, Volume2, VolumeX, Terminal,
  Zap, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Timer, ListTodo, BarChart2, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "astra";
  content: string;
  toolActions?: ToolAction[];
  isStreaming?: boolean;
}

// ─── Slash Command shortcuts ──────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { cmd: "/task", hint: "Create a task", icon: "✅", expand: "Create task: " },
  { cmd: "/done", hint: "Complete a task", icon: "🎉", expand: "Mark as done: " },
  { cmd: "/timer", hint: "Start a timer", icon: "⏱️", expand: "Start timer for " },
  { cmd: "/stop", hint: "Stop timer", icon: "⏹️", expand: "Stop the timer" },
  { cmd: "/habit", hint: "Check-in habit", icon: "🔥", expand: "Check in habit: " },
  { cmd: "/breakdown", hint: "AI subtask breakdown", icon: "🧠", expand: "Break down task: " },
  { cmd: "/week", hint: "Weekly analytics", icon: "📊", expand: "Show my weekly analytics" },
  { cmd: "/remind", hint: "Set a reminder", icon: "🔔", expand: "Remind me to " },
];

// ─── Tool Action Card ─────────────────────────────────────────────────────────

function ToolActionCard({ action }: { action: ToolAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-mono border",
        action.success
          ? "bg-cyan-500/5 border-cyan-500/15 text-cyan-300/80"
          : "bg-red-500/5 border-red-500/20 text-red-300/80"
      )}
    >
      <span className="text-sm">{action.emoji}</span>
      <span className="flex-1 truncate">{action.summary}</span>
      {action.success
        ? <CheckCircle2 size={10} className="shrink-0 text-cyan-500/50" />
        : <XCircle size={10} className="shrink-0 text-red-500/50" />}
    </motion.div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const [showActions, setShowActions] = useState(true);
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col gap-1.5 max-w-[88%]", isUser ? "ml-auto items-end" : "items-start")}
    >
      {/* Tool actions (above astra's text) */}
      {!isUser && msg.toolActions && msg.toolActions.length > 0 && (
        <div className="w-full space-y-1">
          <button
            onClick={() => setShowActions(!showActions)}
            className="flex items-center gap-1 text-[9px] text-cyan-500/40 font-mono uppercase tracking-widest hover:text-cyan-500/70 transition-colors"
          >
            <Zap size={8} />
            {msg.toolActions.length} action{msg.toolActions.length > 1 ? "s" : ""} performed
            {showActions ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
          </button>
          {showActions && msg.toolActions.map((a, i) => (
            <ToolActionCard key={i} action={a} />
          ))}
        </div>
      )}

      {/* Bubble */}
      <div className={cn(
        "px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed",
        isUser
          ? "bg-cyan-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.25)]"
          : "bg-gradient-to-br from-cyan-950/60 to-cyan-900/20 border border-cyan-500/10 text-cyan-50/90 rounded-tl-none font-light"
      )}>
        {msg.isStreaming && !msg.content ? (
          <span className="inline-flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.span key={i} className="w-1 h-1 rounded-full bg-cyan-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </span>
        ) : msg.content}
      </div>

      <span className="text-[8px] text-cyan-500/30 font-mono uppercase tracking-widest px-1">
        {isUser ? "You" : "Astra"}
      </span>
    </motion.div>
  );
}

// ─── Slash Command Picker ─────────────────────────────────────────────────────

function SlashPicker({ query, onSelect }: { query: string; onSelect: (text: string) => void }) {
  const filtered = query === "/"
    ? SLASH_COMMANDS
    : SLASH_COMMANDS.filter(c => c.cmd.startsWith(query));

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-black/90 border border-cyan-500/20 rounded-xl overflow-hidden shadow-xl z-10"
    >
      {filtered.map((c) => (
        <button
          key={c.cmd}
          onClick={() => onSelect(c.expand)}
          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-cyan-500/10 transition-colors group"
        >
          <span className="text-base">{c.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-cyan-400 font-mono text-xs">{c.cmd}</span>
            <span className="text-white/30 text-xs ml-2">{c.hint}</span>
          </div>
        </button>
      ))}
    </motion.div>
  );
}

// ─── Morning Briefing ─────────────────────────────────────────────────────────

function MorningBriefingBanner({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/15 rounded-xl text-left hover:border-cyan-500/30 transition-all group"
    >
      <Sparkles size={14} className="text-cyan-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-cyan-300 text-xs font-medium">Good morning briefing ready</p>
        <p className="text-white/30 text-[10px]">Tap to get your personalized daily summary</p>
      </div>
      <ChevronUp size={12} className="text-cyan-500/40 group-hover:text-cyan-500/70 transition-colors" />
    </motion.button>
  );
}

// ─── Quick Action Chips ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "How's my week?", icon: <BarChart2 size={11} /> },
  { label: "Start a timer", icon: <Timer size={11} /> },
  { label: "My tasks", icon: <ListTodo size={11} /> },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function AstraAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const { tasks, habits, goals, timeEntries, sleepEntries, gamification } = useStore();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const recognition = useRef<any>(null);

  // ─── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // ─── Morning briefing trigger ─────────────────────────────────────────────

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const lastOpened = localStorage.getItem("astra_last_opened_date");
      const today = new Date().toDateString();
      if (lastOpened !== today) {
        setShowBriefing(true);
        localStorage.setItem("astra_last_opened_date", today);
      } else {
        deliverGreeting();
      }
    }
  }, [isOpen]);

  // ─── Speech Recognition ───────────────────────────────────────────────────

  useEffect(() => {
    const SR = typeof window !== "undefined"
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    if (!SR) return;
    recognition.current = new SR();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    recognition.current.lang = "en-US";
    recognition.current.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setIsRecognitionActive(false);
      sendMessage(transcript);
    };
    recognition.current.onerror = () => setIsRecognitionActive(false);
    recognition.current.onend = () => setIsRecognitionActive(false);
  }, []);

  const toggleRecognition = () => {
    if (isRecognitionActive) { recognition.current?.stop(); }
    else { setIsRecognitionActive(true); recognition.current?.start(); }
  };

  // ─── TTS ──────────────────────────────────────────────────────────────────

  const speak = (text: string) => {
    if (!voiceEnabled || !synth) return;
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(text.slice(0, 200));
    const voices = synth.getVoices();
    const v = voices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Arthur"));
    if (v) utt.voice = v;
    utt.pitch = 0.9; utt.rate = 1.1;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    synth.speak(utt);
  };

  // ─── Get Firebase Token ───────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try { return await user.getIdToken(); } catch { return null; }
  }, [user]);

  // ─── Build Astra Context ──────────────────────────────────────────────────

  const buildContext = useCallback((): AstraContext => ({
    tasks,
    habits,
    goals,
    timeEntries,
    sleepEntries,
    gamification,
    getToken,
  }), [tasks, habits, goals, timeEntries, sleepEntries, gamification, getToken]);

  // ─── Greeting ─────────────────────────────────────────────────────────────

  const deliverGreeting = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12
      ? "Good morning, Sir. Astra systems online. Your agenda awaits."
      : hour < 17
        ? "Good afternoon. All systems operational. How can I assist?"
        : "Good evening. Ready to review today's progress?";
    appendAstraMessage(greeting, []);
    speak(greeting);
  };

  // ─── Morning Briefing ─────────────────────────────────────────────────────

  const runMorningBriefing = async () => {
    setShowBriefing(false);
    setIsThinking(true);
    appendUserMessage("Give me my morning briefing");

    const ctx = buildContext();
    const result = await getAstraResponseWithTools(
      "Give me a comprehensive morning briefing: overdue tasks, today's priority tasks, habit streaks, sleep quality, and one key recommendation for the day. Be concise but insightful.",
      chatHistory,
      ctx,
      (action) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === "astra") {
            return [...prev.slice(0, -1), { ...last, toolActions: [...(last.toolActions ?? []), action] }];
          }
          return prev;
        });
      }
    );

    setIsThinking(false);
    appendAstraMessage(result.response, result.toolActions);
    speak(result.response);
    updateChatHistory("Give me my morning briefing", result.response);
  };

  // ─── Core Send ────────────────────────────────────────────────────────────

  const appendUserMessage = (text: string) => {
    setMessages(prev => [...prev, { role: "user", content: text }]);
  };

  const appendAstraMessage = (text: string, actions: ToolAction[]) => {
    setMessages(prev => [...prev, { role: "astra", content: text, toolActions: actions }]);
  };

  const updateChatHistory = (userMsg: string, astraMsg: string) => {
    setChatHistory(prev => [
      ...prev,
      { role: 'user' as const, content: userMsg },
      { role: 'assistant' as const, content: astraMsg },
    ].slice(-20)); // Keep last 10 exchanges
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;
    setInput("");
    setShowBriefing(false);
    appendUserMessage(text);
    setIsThinking(true);

    const ctx = buildContext();
    const pendingActions: ToolAction[] = [];

    // Placeholder astra message (shows thinking)
    setMessages(prev => [...prev, { role: "astra", content: "", isStreaming: true, toolActions: [] }]);

    const result = await getAstraResponseWithTools(
      text,
      chatHistory,
      ctx,
      (action) => {
        pendingActions.push(action);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "astra") {
            return [...prev.slice(0, -1), { ...last, toolActions: [...(last.toolActions ?? []), action] }];
          }
          return prev;
        });
      }
    );

    setIsThinking(false);

    // Replace placeholder with real response
    setMessages(prev => {
      const withoutPlaceholder = prev.filter(m => !m.isStreaming);
      return [...withoutPlaceholder, { role: "astra", content: result.response, toolActions: result.toolActions }];
    });

    speak(result.response);
    updateChatHistory(text, result.response);
  };

  const handleSend = () => {
    if (input.trim()) sendMessage(input.trim());
  };

  // ─── Slash command detection ──────────────────────────────────────────────

  const isSlashMode = input.startsWith("/") && !input.includes(" ");
  const isSlashExpanded = input.startsWith("/") && input.includes(" ") && input.length < 4;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Orb trigger */}
      <div className="fixed bottom-6 right-6 z-50">
        <AstraOrb
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          isListening={isRecognitionActive}
          onClick={() => setIsOpen(!isOpen)}
        />
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16, x: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16, x: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-6 w-[400px] z-50 flex flex-col"
            style={{ height: "clamp(520px, 70vh, 680px)" }}
          >
            <div className="flex-1 rounded-3xl border border-cyan-500/25 bg-black/88 backdrop-blur-3xl shadow-[0_0_60px_rgba(6,182,212,0.15),0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">

              {/* Header */}
              <div className="px-4 py-3 border-b border-cyan-500/15 flex items-center justify-between bg-gradient-to-r from-cyan-950/30 to-black/0 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-30" />
                  </div>
                  <div>
                    <p className="text-cyan-400 font-mono tracking-widest uppercase text-[9px]">Astra Interface</p>
                    <p className="text-white/20 text-[9px] font-mono">Llama 3.3 · Tool-enabled</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className="text-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-400 h-7 w-7"
                  >
                    {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-400 h-7 w-7"
                  >
                    <X size={13} />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-3 min-h-0" viewportRef={scrollRef}>
                <div className="space-y-4 pb-2">
                  {messages.length === 0 && !showBriefing && (
                    <div className="text-center pt-8 space-y-3">
                      <div className="text-4xl">⚡</div>
                      <p className="text-cyan-400/60 font-mono text-xs uppercase tracking-widest">Astra Online</p>
                      <p className="text-white/25 text-xs">Ask me anything or use a slash command</p>
                      <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                        {QUICK_ACTIONS.map((qa) => (
                          <button
                            key={qa.label}
                            onClick={() => sendMessage(qa.label)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/8 border border-cyan-500/15 rounded-full text-cyan-400/70 text-[11px] hover:bg-cyan-500/15 hover:text-cyan-400 transition-all"
                          >
                            {qa.icon}
                            {qa.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Morning Briefing Banner */}
                  {showBriefing && (
                    <MorningBriefingBanner onClick={runMorningBriefing} />
                  )}

                  {/* Message list */}
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                  ))}

                  {/* Thinking indicator */}
                  {isThinking && messages[messages.length - 1]?.role !== "astra" && (
                    <div className="flex items-center gap-1.5 text-cyan-500/30 font-mono text-[9px]">
                      <Terminal size={9} className="animate-pulse" />
                      <span className="animate-pulse">PROCESSING...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="p-3 border-t border-cyan-500/10 bg-black/40 shrink-0">

                {/* Slash picker */}
                <div className="relative">
                  <AnimatePresence>
                    {isSlashMode && (
                      <SlashPicker
                        query={input}
                        onSelect={(text) => {
                          setInput(text);
                          inputRef.current?.focus();
                        }}
                      />
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2">
                    {/* Mic */}
                    <button
                      onClick={toggleRecognition}
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-full flex items-center justify-center border transition-all",
                        isRecognitionActive
                          ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                          : "bg-black/50 border-cyan-500/20 text-cyan-400/60 hover:border-cyan-500/40 hover:text-cyan-400"
                      )}
                    >
                      <Mic size={14} className={isRecognitionActive ? "animate-pulse" : ""} />
                    </button>

                    {/* Text input */}
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) handleSend();
                        if (e.key === "Escape" && isSlashMode) setInput("");
                      }}
                      placeholder={
                        isRecognitionActive
                          ? "Listening..."
                          : "Command... (try /task, /timer, /week)"
                      }
                      className="flex-1 bg-black/50 border border-cyan-500/15 rounded-xl px-3 py-2 text-cyan-300 text-[12px] font-mono placeholder:text-cyan-900 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all h-9"
                    />

                    {/* Send */}
                    <button
                      onClick={handleSend}
                      disabled={isThinking || !input.trim()}
                      className="h-9 w-9 shrink-0 rounded-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>

                {/* Audio waveform */}
                <div className="mt-2.5 flex justify-center gap-[2px] h-2 items-center opacity-25">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: (isSpeaking || isRecognitionActive) ? [2, 10, 2] : 2,
                      }}
                      transition={{
                        duration: 0.5 + i * 0.02,
                        repeat: Infinity,
                        delay: i * 0.04,
                        ease: "easeInOut",
                      }}
                      className="w-0.5 bg-cyan-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
