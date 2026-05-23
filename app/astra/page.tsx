"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { DataLoader } from "@/components/data-loader";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { getAstraResponseWithTools, cleanTextForSpeech, type ChatMessage } from "@/lib/gemini";
import type { ToolAction, AstraContext } from "@/lib/astra-tools";
import {
  Bot, Mic, Volume2, VolumeX, Send, Terminal, Zap, CheckCircle2, XCircle,
  Clock, Flame, Target, Trophy, Sparkles, BookOpen, Search, ArrowRight,
  TrendingUp, RefreshCw, Cpu, Activity, Play, Square, Layers, ShieldAlert,
  ChevronDown, ChevronUp, Radio, AlertCircle, Maximize2, Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ConsoleLog {
  id: string;
  time: string;
  text: string;
  type: "boot" | "command" | "system" | "astra" | "error";
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  category: "ai" | "tech" | "jobs" | "trends";
  url?: string;
}

// News fetched from /api/v1/news (HackerNews Firebase API)


// ─── Slash Commands hint ──────────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { cmd: "/task", hint: "Create a task", expand: "Create task: " },
  { cmd: "/done", hint: "Complete a task", expand: "Mark as done: " },
  { cmd: "/update", hint: "Update a task", expand: "Update task: " },
  { cmd: "/delete", hint: "Delete a task", expand: "Delete task: " },
  { cmd: "/timer", hint: "Start a focus timer", expand: "Start timer for " },
  { cmd: "/stop", hint: "Stop current timer", expand: "Stop the timer" },
  { cmd: "/habit", hint: "Check-in a habit", expand: "Check in habit: " },
  { cmd: "/habits", hint: "List all habits", expand: "Show my habits" },
  { cmd: "/habit-new", hint: "Create a new habit", expand: "Create habit: " },
  { cmd: "/goals", hint: "Show goals & progress", expand: "Show my goals" },
  { cmd: "/goal-new", hint: "Create a new goal", expand: "Create goal: " },
  { cmd: "/goal", hint: "Update goal progress", expand: "Update goal progress: " },
  { cmd: "/reminders", hint: "List my reminders", expand: "Show my reminders" },
  { cmd: "/sleep", hint: "Get sleep stats", expand: "Show my sleep stats" },
  { cmd: "/sleep-log", hint: "Log sleep entry", expand: "Log sleep: went to bed at " },
  { cmd: "/breakdown", hint: "AI subtask steps", expand: "Break down task: " },
  { cmd: "/week", hint: "Weekly stats summary", expand: "Show my weekly analytics" },
  { cmd: "/search", hint: "Search the web", expand: "Search for " },
];


// ─── Formatting & Natural Speech Helpers ──────────────────────────────────────

function formatAstraMessage(content: string) {
  if (!content) return null;

  const lines = content.split("\n");
  const parsedNodes: React.ReactNode[] = [];
  
  let currentTableLines: string[] = [];

  const flushTable = (key: number) => {
    if (currentTableLines.length === 0) return null;

    const headerLine = currentTableLines[0];
    const rowsLines = currentTableLines.slice(2); // Skip separator

    // Parse header columns
    const headers = headerLine.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    
    // Parse rows
    const rows = rowsLines.map(rowLine => 
      rowLine.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    ).filter(row => row.length > 0);

    currentTableLines = [];

    return (
      <div key={`table-${key}`} className="w-full my-3.5 overflow-x-auto rounded-xl border border-cyan-500/20 bg-black/60 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.05)]">
        <table className="w-full text-left border-collapse text-[11px] font-sans">
          <thead>
            <tr className="border-b border-cyan-500/30 bg-cyan-950/40">
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-black uppercase tracking-wider text-cyan-400 font-mono text-[9px]">
                  {parseInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr 
                key={rIdx} 
                className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors duration-150 last:border-b-0"
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-cyan-100 font-light whitespace-normal max-w-[200px] break-words">
                    {parseInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Helper to parse bold stars and slash commands inside table cells
  const parseInlineMarkdown = (text: string) => {
    const parts = text.split(/(\/[a-zA-Z0-9\-]+|\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong 
            key={idx} 
            className="font-extrabold text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.35)]"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("/") && !part.includes(" ")) {
        return (
          <code 
            key={idx} 
            className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 font-mono text-[10px] mx-0.5"
          >
            {part}
          </code>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if it is a table line
    const isTableLine = line.startsWith('|') && line.endsWith('|');

    if (isTableLine) {
      currentTableLines.push(line);
    } else {
      // If we were parsing a table, flush it first
      if (currentTableLines.length > 0) {
        const tableNode = flushTable(i);
        if (tableNode) parsedNodes.push(tableNode);
      }

      if (!line) {
        parsedNodes.push(<div key={i} className="h-1" />);
        continue;
      }

      // Check if it is a list item/bullet
      const isBullet = line.startsWith("- ") || line.startsWith("* ");
      let cleanLineText = isBullet ? line.slice(2) : line;

      const parsedLine = parseInlineMarkdown(cleanLineText);

      if (isBullet) {
        parsedNodes.push(
          <div key={i} className="flex items-start gap-2 pl-2">
            <span className="text-cyan-400 mt-1 shrink-0 text-[10px] animate-pulse">⚡</span>
            <span className="flex-1 text-[12px] leading-relaxed text-cyan-100">{parsedLine}</span>
          </div>
        );
      } else {
        parsedNodes.push(<p key={i} className="leading-relaxed text-[12px] text-cyan-100">{parsedLine}</p>);
      }
    }
  }

  // Flush any remaining table at the end of the lines loop
  if (currentTableLines.length > 0) {
    const tableNode = flushTable(lines.length);
    if (tableNode) parsedNodes.push(tableNode);
  }

  return <div className="space-y-1.5 font-sans">{parsedNodes}</div>;
}

export default function AstraJarvisPage() {
  const { tasks, habits, goals, timeEntries, sleepEntries, gamification, addTimeEntry, stopTimeEntry } = useStore();
  const { user } = useAuth();

  // App States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [newsFilter, setNewsFilter] = useState<"all" | "ai" | "tech" | "jobs" | "trends">("all");
  const [newsSearch, setNewsSearch] = useState("");
  const [liveNews, setLiveNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [preferredProvider, setPreferredProvider] = useState<string>("auto");
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  
  // Custom Speech Synthesis parameters
  const [voiceRate, setVoiceRate] = useState(1.05); // slightly faster
  const [voicePitch, setVoicePitch] = useState(0.95); // slightly deeper

  // References
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const modalChatScrollRef = useRef<HTMLDivElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const recognition = useRef<any>(null);

  // ─── Auto-Scrolls ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (isChatMaximized && modalChatScrollRef.current) {
      modalChatScrollRef.current.scrollTo({ top: modalChatScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isThinking, isChatMaximized]);

  useEffect(() => {
    if (isChatMaximized) {
      setTimeout(() => {
        modalInputRef.current?.focus();
      }, 100);
    }
  }, [isChatMaximized]);

  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTo({ top: terminalScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [consoleLogs]);

  // ─── Terminal Log Helper ────────────────────────────────────────────────────

  const addLog = useCallback((text: string, type: ConsoleLog["type"] = "system") => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + "." + String(new Date().getMilliseconds()).padStart(3, '0');
    setConsoleLogs(prev => [...prev, { id: Math.random().toString(), time, text, type }].slice(-60)); // Keep last 60 logs
  }, []);

  // ─── Live News Fetcher ──────────────────────────────────────────────────────

  const fetchLiveNews = useCallback(async () => {
    setIsLoadingNews(true);
    addLog("SCANNING LIVE INTEL STREAMS: fetching HackerNews signals...", "system");
    try {
      const res = await fetch('/api/v1/news');
      const data = await res.json();
      if (data.news && data.news.length > 0) {
        setLiveNews(data.news);
        addLog(`INTEL STREAM ACQUIRED: ${data.news.length} live signals locked in.`, "astra");
      } else {
        addLog(`INTEL SCAN RETURNED EMPTY: ${data.error || 'No results'}`, "error");
      }
    } catch (e: any) {
      addLog(`INTEL STREAM ERROR: ${e.message}`, "error");
    } finally {
      setIsLoadingNews(false);
    }
  }, [addLog]);

  // ─── Cinematic Boot Sequence ────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ASTRA_PREFERRED_PROVIDER") || "auto";
      setPreferredProvider(saved);
    }

    const bootSequence = [
      { text: "INITIALIZING ASTRA NEXUS INTERFACE [v4.2.1-SECURE]...", type: "boot" as const, delay: 0 },
      { text: "LINKING TO FIRESTORE DATA CHANNELS...", type: "boot" as const, delay: 350 },
      { text: "CALIBRATING QUANTUM SPEECH SYNTHESIS ENGINE (JARVIS MALE MATRIX)...", type: "boot" as const, delay: 750 },
      { text: `DIAGNOSTIC COMPLETE: LEVEL ${gamification?.level ?? 1} USER VERIFIED · CORE INTEGRITY OPTIMAL`, type: "system" as const, delay: 1100 },
      { text: `SYNAPTIC STATS LOADED: ${tasks.filter(t => t.status !== 'done').length} DIRECTION VECTORS pending.`, type: "system" as const, delay: 1400 },
      { text: "CORE SYSTEMS FLUID. WELL GREETED, SIR. ASTRA ONLINE AND VIGILANT.", type: "astra" as const, delay: 1800 },
    ];

    bootSequence.forEach(step => {
      setTimeout(() => {
        addLog(step.text, step.type);
        if (step.type === "astra") {
          speak("Good evening, Sir. Astra systems are operational. All diagnostics report optimal parameters. How shall we coordinate today?");
          setMessages([
            { role: "assistant" as const, content: "Astra core online, Sir. Diagnostics are fully optimized. We have multiple directive vectors awaiting your command." }
          ]);
          // Fetch live news after boot
          setTimeout(() => fetchLiveNews(), 2200);
        }
      }, step.delay);
    });

    // Setup speech recognition
    const SpeechRec = typeof window !== "undefined"
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;
    
    if (SpeechRec) {
      recognition.current = new SpeechRec();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = "en-US";
      
      recognition.current.onstart = () => {
        setIsListening(true);
        addLog("VOICE INPUT TRIGGERED: CAPTURING AUDIO STREAM...", "system");
      };

      recognition.current.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        addLog(`VOICE STT PARSED: "${transcript}"`, "command");
        sendMessage(transcript);
      };

      recognition.current.onerror = (e: any) => {
        addLog(`AUDIO STREAM CORRUPTED: ${e.error || "UNKNOWN INTERFERENCE"}`, "error");
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      addLog("WEB SPEECH COGNITIVE RECOGNITION NOT SUPPORTED BY BROWSER ENVIRONMENT", "error");
    }

    return () => {
      if (synth) synth.cancel();
    };
  }, []);

  // ─── Speech Synthesis (TTS) ─────────────────────────────────────────────────

  const speak = (text: string) => {
    if (!voiceEnabled || !synth) return;
    synth.cancel();
    const cleanText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = synth.getVoices();
    // Prioritize premium sounding British or US male voices to copy Jarvis
    const voice = voices.find(v => 
      v.name.includes("Google UK English Male") || 
      v.name.includes("Arthur") || 
      v.name.includes("Daniel") || 
      v.name.includes("Microsoft David") ||
      (v.lang.startsWith("en-GB") && v.name.toLowerCase().includes("male"))
    ) || voices.find(v => v.lang.startsWith("en"));

    if (voice) utterance.voice = voice;
    utterance.pitch = voicePitch;
    utterance.rate = voiceRate;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synth.speak(utterance);
  };

  // ─── Toggle Speech Recognition ──────────────────────────────────────────────

  const toggleVoiceInput = () => {
    if (isListening) {
      recognition.current?.stop();
    } else {
      if (synth) synth.cancel();
      setIsSpeaking(false);
      try {
        recognition.current?.start();
      } catch (err) {
        addLog("RECOGNITION CORE REBOOT REQ: CORE ALREADY AWAKE", "error");
      }
    }
  };

  // ─── Provider Preference Change Handler ──────────────────────────────────────

  const handleProviderChange = (val: string) => {
    setPreferredProvider(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("ASTRA_PREFERRED_PROVIDER", val);
    }
    const displayName = val === 'auto' ? 'AUTOMATIC SMART FALLBACK' : val.toUpperCase();
    addLog(`NEURAL CORE RECONFIGURED: Pinned to "${displayName}"`, "system");
    speak(`Neural core reconfigured, Sir. Pinned to ${val === 'auto' ? 'automatic smart fallback' : val} core.`);
  };

  // ─── Get Auth Token Hook ────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try { return await user.getIdToken(); } catch { return null; }
  }, [user]);

  // ─── Context Packager ───────────────────────────────────────────────────────

  const buildContext = useCallback((): AstraContext => ({
    tasks,
    habits,
    goals,
    timeEntries,
    sleepEntries,
    gamification,
    getToken,
  }), [tasks, habits, goals, timeEntries, sleepEntries, gamification, getToken]);

  // ─── Send Chat Message Logic ────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;
    setInput("");
    
    // Log user input to terminal
    addLog(`USER COMMAND INPUT: "${text}"`, "command");
    
    // Append to conversation
    setMessages(prev => [...prev, { role: "user" as const, content: text }]);
    setIsThinking(true);

    const ctx = buildContext();

    try {
      const result = await getAstraResponseWithTools(
        text,
        chatHistory,
        ctx,
        (action) => {
          addLog(`[TOOL CALL] Executing "${action.tool}" -> ${action.summary}`, action.success ? "system" : "error");
        }
      );

      setIsThinking(false);
      
      // Append Astra's reply
      setMessages(prev => [...prev, { role: "assistant" as const, content: result.response }]);
      addLog(`ASTRA NUCLEUS REPLY (${result.providerUsed || 'Groq'}): "${result.response.slice(0, 80)}..."`, "astra");
      
      // Speak reply
      speak(result.response);

      // Save to localized history
      setChatHistory(prev => [
        ...prev,
        { role: 'user' as const, content: text },
        { role: 'assistant' as const, content: result.response },
      ].slice(-16));

    } catch (err: any) {
      setIsThinking(false);
      addLog(`NEURAL COMM FAILURE: ${err.message || "Interference"}`, "error");
      setMessages(prev => [...prev, { role: "assistant" as const, content: "Apologies, Sir. An disruption occurred in my reasoning pathways. I was unable to complete the query." }]);
    }
  };

  // ─── X-News Jarvis Consultation ─────────────────────────────────────────────

  const consultJarvisOnNews = (item: NewsItem) => {
    addLog(`FEEDING INTEL BLOCK: "${item.title}" into Astra Analyzer...`, "system");
    const query = `Astra, evaluate this news item: "${item.title} - ${item.summary}". In a classic JARVIS style, give me a swift, 2-sentence highly analytical breakdown of what this implies for fullstack developers, productivity, and our operational goals, Sir.`;
    sendMessage(query);
  };

  // ─── Quick Focus Start Action ───────────────────────────────────────────────

  const handleQuickTimer = async () => {
    addLog("MANUAL DIRECTIVE: Initiating 25-minute deep focus cycle...", "system");
    try {
      await addTimeEntry({
        category: "Deep Work",
        description: "Astra Core Focus Protocol",
        startTime: new Date(),
        isRunning: true,
      });
      addLog("DEEP WORK PROTOCOL LAUNCHED: focus timer initialized.", "system");
      speak("Deep Focus Protocol initiated, Sir. Timer stands at twenty-five minutes. Power grids redirected to core work vectors.");
    } catch (err: any) {
      addLog(`TIMER BOOT FAIL: ${err.message}`, "error");
    }
  };

  const handleQuickTimerStop = async (activeEntry: any) => {
    addLog("MANUAL OVERRIDE: Aborting deep focus session...", "system");
    try {
      await stopTimeEntry(activeEntry.id, "Jarvis HUD Terminated Cycle", 4);
      addLog("FOCUS TIMER ABORTED: session logged successfully.", "system");
      speak("Session aborted, Sir. The cognitive investment has been safely recorded.");
    } catch (err: any) {
      addLog(`TIMER TERMINATION FAIL: ${err.message}`, "error");
    }
  };

  // ─── Calculations for workspace diagnostics ────────────────────────────────

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const completedTasksCount = tasks.filter(t => t.status === 'done').length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  
  const peakHabitStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak), 0) : 0;
  const runningTimer = timeEntries.find(e => e.isRunning);

  // Time entries total duration for today
  const totalFocusMinsToday = timeEntries
    .filter(entry => {
      const entryDate = new Date(entry.startTime);
      const today = new Date();
      return entryDate.toDateString() === today.toDateString();
    })
    .reduce((acc, entry) => acc + (entry.duration || 0), 0);

  // Use live news if available, fallback to empty
  const newsSource = liveNews.length > 0 ? liveNews : [];
  const filteredNews = newsSource.filter(item => {
    const matchesCat = newsFilter === "all" || item.category === newsFilter;
    const matchesSearch = item.title.toLowerCase().includes(newsSearch.toLowerCase()) || 
                          item.summary.toLowerCase().includes(newsSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const isSlashMode = input.startsWith("/") && !input.includes(" ");

  return (
    <>
      <ProtectedRoute>
        <DataLoader>
          <MainLayout>
          {/* Immersive Black Cyberpunk Canvas overlay */}
          <div className="absolute inset-0 bg-[#030712] z-0 pointer-events-none opacity-40 mix-blend-overlay" />
          <div className="relative z-10 flex flex-col h-[calc(100vh-100px)] select-none text-cyan-50/90 font-mono">
            
            {/* HUD Status Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border border-cyan-500/20 bg-black/60 backdrop-blur-md rounded-2xl p-4 mb-4 gap-4 shadow-[0_0_25px_rgba(6,182,212,0.05)]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute" />
                  <div className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-300 relative" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-widest bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-1.5 uppercase">
                    Astra Nexus Command Center
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[8px] tracking-widest font-black uppercase py-0 px-1 animate-pulse">HUD_v4.2</Badge>
                  </h1>
                  <p className="text-[10px] text-cyan-500/50 uppercase font-bold tracking-widest mt-0.5">
                    Holographic interface to coordinate vectors, analyze streams, and query Llama cores
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {/* Voice customization controls */}
                <div className="hidden xl:flex items-center gap-4 border-r border-cyan-500/10 pr-4">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] text-cyan-500/40 uppercase font-black">Voice Rate</span>
                    <input 
                      type="range" min="0.8" max="1.5" step="0.05" 
                      value={voiceRate} onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-cyan-950 accent-cyan-400 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] text-cyan-500/40 uppercase font-black">Pitch Depth</span>
                    <input 
                      type="range" min="0.7" max="1.3" step="0.05" 
                      value={voicePitch} onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-cyan-950 accent-cyan-400 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-cyan-500/40 uppercase font-black">Astra Speech</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setVoiceEnabled(!voiceEnabled);
                      addLog(`SPEECH OUTPUT CHANGED: ${!voiceEnabled ? "ENABLED" : "MUTED"}`, "system");
                    }}
                    className={cn(
                      "h-8 w-8 rounded-lg transition-all border",
                      voiceEnabled 
                        ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                        : "border-red-500/20 bg-red-950/10 text-red-500 hover:text-red-400"
                    )}
                  >
                    {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </Button>
                </div>

                <div className="flex flex-col items-end border-l border-cyan-500/10 pl-4">
                  <span className="text-[9px] text-cyan-500/30 uppercase font-black">Processor Link</span>
                  <select 
                    value={preferredProvider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="bg-black/90 border border-cyan-500/25 rounded px-2 py-0.5 text-[9px] font-black text-cyan-400 focus:outline-none focus:border-cyan-400 mt-1 cursor-pointer font-mono tracking-wider"
                  >
                    <option value="auto" className="bg-black text-cyan-400">AUTO ROTATE</option>
                    <option value="groq" className="bg-black text-cyan-400">GROQ 70B</option>
                    <option value="cerebras" className="bg-black text-cyan-400">CEREBRAS 120B</option>
                    <option value="openrouter-llama" className="bg-black text-cyan-400">OR LLAMA 70B</option>
                    <option value="openrouter-qwen" className="bg-black text-cyan-400">OR QWEN 72B</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Immersive HUD Grid */}
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
              
              {/* LEFT COLUMN: Workspace Diagnostics & Terminal logs (Cols 1-4) */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 min-h-0">
                
                {/* Diagnostics Stats HUD */}
                <Card className="border-cyan-500/20 bg-black/50 backdrop-blur-md rounded-2xl overflow-hidden flex-1 flex flex-col shadow-[0_0_20px_rgba(6,182,212,0.02)]">
                  <div className="px-4 py-2.5 border-b border-cyan-500/15 bg-cyan-950/20 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                      <Cpu size={12} className="text-cyan-400 animate-pulse" />
                      Workspace Diagnostics
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  
                  <ScrollArea className="flex-1 px-4 py-3 min-h-0">
                    <div className="space-y-4">
                      {/* Active timer status */}
                      <div className="p-3.5 rounded-xl border border-cyan-500/15 bg-cyan-950/5 relative overflow-hidden group">
                        {runningTimer && (
                          <div className="absolute right-3 top-3">
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                          </div>
                        )}
                        <h4 className="text-[10px] text-cyan-500/40 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1">
                          <Radio size={10} className={runningTimer ? "animate-pulse text-cyan-400" : ""} />
                          Temporal Engine Core
                        </h4>
                        
                        {runningTimer ? (
                          <div>
                            <p className="text-cyan-200 text-sm font-black italic tracking-wide truncate">{runningTimer.category}</p>
                            <p className="text-[10px] text-cyan-500/60 truncate mt-0.5">{runningTimer.description || "Active Focus protocols running"}</p>
                            <Button
                              onClick={() => handleQuickTimerStop(runningTimer)}
                              size="sm"
                              variant="outline"
                              className="mt-3 w-full h-7 rounded-lg border-red-500/30 hover:border-red-500/60 text-[10px] font-black text-red-400 hover:bg-red-500/5 uppercase tracking-widest transition-all"
                            >
                              <Square size={10} className="mr-1.5 shrink-0" />
                              Deactivate focus core
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-cyan-500/60 font-bold italic">No active temporal streams initialized.</p>
                            <Button
                              onClick={handleQuickTimer}
                              size="sm"
                              variant="outline"
                              className="mt-3 w-full h-7 rounded-lg border-cyan-500/25 hover:border-cyan-500/60 text-[10px] font-black text-cyan-400 hover:bg-cyan-500/5 uppercase tracking-widest transition-all"
                            >
                              <Play size={10} className="mr-1.5 shrink-0" />
                              Ignite 25m focus reactor
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Level and XP */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline px-1">
                          <span className="text-[10px] text-cyan-500/40 uppercase font-black">Astra Synapse Level</span>
                          <span className="text-sm font-black text-cyan-400 italic">Lvl {gamification?.level ?? 1}</span>
                        </div>
                        <Progress value={((gamification?.xp ?? 0) % 1000) / 10} className="h-1.5 rounded-full bg-cyan-950/50" />
                        <div className="flex justify-between text-[8px] text-cyan-500/40 uppercase tracking-widest px-1">
                          <span>{(gamification?.xp ?? 0) % 1000} / 1000 XP</span>
                          <span>TOTAL: {gamification?.xp ?? 0} XP</span>
                        </div>
                      </div>

                      {/* Task completion rates */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-baseline px-1">
                          <span className="text-[10px] text-cyan-500/40 uppercase font-black">Directive Velocity</span>
                          <span className="text-sm font-black text-cyan-400 italic">{taskCompletionRate}%</span>
                        </div>
                        <Progress value={taskCompletionRate} className="h-1.5 rounded-full bg-cyan-950/50" />
                        <div className="flex justify-between text-[8px] text-cyan-500/40 uppercase tracking-widest px-1">
                          <span>{completedTasksCount} COMPLETED LOGS</span>
                          <span>{pendingTasks.length} PENDING VECTORS</span>
                        </div>
                      </div>

                      {/* Habits streaks */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 border border-cyan-500/10 bg-cyan-950/5 rounded-xl text-center">
                          <span className="text-[8px] text-cyan-500/40 uppercase font-black block mb-1">Consistency Pulse</span>
                          <span className="text-lg font-black text-cyan-400 italic tracking-tighter flex items-center justify-center gap-1">
                            <Flame size={14} className="text-amber-500 animate-pulse shrink-0" />
                            {peakHabitStreak} <span className="text-[10px] text-cyan-500/40">DAYS</span>
                          </span>
                        </div>
                        <div className="p-3 border border-cyan-500/10 bg-cyan-950/5 rounded-xl text-center">
                          <span className="text-[8px] text-cyan-500/40 uppercase font-black block mb-1">Active Protocols</span>
                          <span className="text-lg font-black text-cyan-400 italic tracking-tighter flex items-center justify-center gap-1">
                            <Target size={14} className="text-violet-500 shrink-0" />
                            {goals.length} <span className="text-[10px] text-cyan-500/40">VECTORS</span>
                          </span>
                        </div>
                      </div>

                      {/* Daily temporal metrics */}
                      <div className="p-3 border border-cyan-500/10 bg-cyan-950/5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Clock size={15} className="text-cyan-400 shrink-0" />
                          <div className="text-left">
                            <span className="text-[8px] text-cyan-500/40 uppercase font-black block">Total Investment Today</span>
                            <span className="text-xs font-black text-cyan-300">Temporal audit active</span>
                          </div>
                        </div>
                        <span className="text-base font-black text-cyan-400 italic">{Math.floor(totalFocusMinsToday / 60)}h {totalFocusMinsToday % 60}m</span>
                      </div>

                    </div>
                  </ScrollArea>
                </Card>

                {/* Cyberpunk Terminal Console Log Card */}
                <Card className="border-cyan-500/20 bg-black/80 backdrop-blur-md rounded-2xl overflow-hidden h-[180px] md:h-[220px] flex flex-col shadow-[0_0_20px_rgba(6,182,212,0.02)]">
                  <div className="px-4 py-2 border-b border-cyan-500/15 bg-cyan-950/20 flex items-center gap-2 shrink-0">
                    <Terminal size={11} className="text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex-1">Jarvis Diagnostic Console</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    </div>
                  </div>
                  
                  <div ref={terminalScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1 font-mono text-[9px] leading-tight custom-scrollbar bg-black/40">
                    {consoleLogs.map((log) => (
                      <div key={log.id} className="flex gap-2 items-start hover:bg-cyan-500/5 p-0.5 rounded transition-colors">
                        <span className="text-cyan-500/40 shrink-0 select-none">[{log.time}]</span>
                        <span className={cn(
                          "flex-1 break-all",
                          log.type === "boot" && "text-indigo-400 font-bold",
                          log.type === "command" && "text-cyan-300 font-bold",
                          log.type === "astra" && "text-cyan-400 italic",
                          log.type === "error" && "text-red-400 font-black tracking-wider animate-pulse",
                          log.type === "system" && "text-cyan-500/80"
                        )}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

              </div>

              {/* MIDDLE COLUMN: Core reactor visualizer & Conversational log (Cols 5-8) */}
              <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 gap-4">
                
                {/* Arc Reactor Central Visual Card */}
                <Card className="border-cyan-500/20 bg-black/55 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 relative overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.03)] shrink-0">
                  <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
                    <Activity size={10} className="text-cyan-500/50 animate-pulse" />
                    <span className="text-[8px] text-cyan-500/30 uppercase tracking-widest font-black">Astra core matrix</span>
                  </div>

                  {/* Arc Reactor SVG Container */}
                  <div 
                    onClick={toggleVoiceInput}
                    className="relative w-44 h-44 rounded-full flex items-center justify-center cursor-pointer group select-none mt-2"
                  >
                    {/* Glowing Blur Sphere */}
                    <div className={cn(
                      "absolute inset-0 rounded-full blur-2xl transition-all duration-700",
                      isListening ? "bg-red-500/25 scale-110" : 
                      isThinking ? "bg-white/10 scale-105" : 
                      isSpeaking ? "bg-violet-500/20 scale-105" : "bg-cyan-500/10 scale-100"
                    )} />

                    {/* Reactor Rings SVG */}
                    <svg className="w-full h-full absolute inset-0 z-10 overflow-visible" viewBox="0 0 100 100">
                      
                      {/* Outer Ring: Rotating Ticks */}
                      <motion.circle
                        cx="50" cy="50" r="46"
                        fill="none"
                        stroke={isListening ? "rgba(239,68,68,0.25)" : "rgba(6,182,212,0.15)"}
                        strokeWidth="1.5"
                        strokeDasharray="2, 4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
                      />

                      {/* Heavy Outer Shield */}
                      <motion.circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke={
                          isListening ? "#ef4444" : 
                          isThinking ? "#ffffff" : 
                          isSpeaking ? "#a78bfa" : "#06b6d4"
                        }
                        strokeWidth="1"
                        strokeDasharray="20, 80"
                        className="transition-all duration-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
                      />

                      {/* Middle Complex Blueprint Ring */}
                      <motion.circle
                        cx="50" cy="50" r="36"
                        fill="none"
                        stroke={isListening ? "rgba(239,68,68,0.3)" : "rgba(6,182,212,0.25)"}
                        strokeWidth="0.5"
                        strokeDasharray="4, 2, 8, 4"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      />

                      {/* Dashed Core Bracket */}
                      <motion.circle
                        cx="50" cy="50" r="28"
                        fill="none"
                        stroke={isListening ? "rgba(239,68,68,0.4)" : "rgba(6,182,212,0.3)"}
                        strokeWidth="1.5"
                        strokeDasharray="1, 12"
                        className="drop-shadow-[0_0_4px_rgba(6,182,212,0.3)]"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />

                      {/* Dynamic Vocal Jump Waves (Speaking effect radiating lines) */}
                      {isSpeaking && [...Array(8)].map((_, i) => {
                        const angle = (i * 360) / 8;
                        const radians = (angle * Math.PI) / 180;
                        const lineScale = 1.35;
                        const x2 = 50 + 24 * Math.cos(radians) * lineScale;
                        const y2 = 50 + 24 * Math.sin(radians) * lineScale;
                        return (
                          <motion.line
                            key={i}
                            x1={50 + 20 * Math.cos(radians)}
                            y1={50 + 20 * Math.sin(radians)}
                            x2={x2}
                            y2={y2}
                            stroke="#a78bfa"
                            strokeWidth="1.5"
                            className="drop-shadow-[0_0_6px_rgba(167,139,250,0.6)]"
                            animate={{
                              x2: [50 + 22 * Math.cos(radians), x2, 50 + 22 * Math.cos(radians)],
                              y2: [50 + 22 * Math.sin(radians), y2, 50 + 22 * Math.sin(radians)]
                            }}
                            transition={{ duration: 0.15, repeat: Infinity, delay: i * 0.02 }}
                          />
                        );
                      })}
                    </svg>

                    {/* Central Core Sphere */}
                    <motion.div
                      animate={{
                        scale: isListening ? [0.95, 1.15, 0.95] : isSpeaking ? [1, 1.08, 1] : 1,
                      }}
                      transition={{ duration: isListening ? 0.3 : 1.5, repeat: Infinity }}
                      className={cn(
                        "w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 z-20 backdrop-blur-sm transition-all duration-500",
                        isListening ? "border-red-400 bg-red-950/45 shadow-[0_0_25px_rgba(239,68,68,0.5)]" :
                        isThinking ? "border-white bg-zinc-900/40 shadow-[0_0_20px_rgba(255,255,255,0.4)]" :
                        isSpeaking ? "border-violet-400 bg-violet-950/30 shadow-[0_0_25px_rgba(167,139,250,0.4)]" :
                        "border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.45)]"
                      )}
                    >
                      {isListening ? (
                        <Mic className="w-8 h-8 text-red-200 animate-pulse" />
                      ) : (
                        <Bot className={cn(
                          "w-8 h-8 z-30 transition-colors duration-500",
                          isThinking ? "text-white" : isSpeaking ? "text-violet-200" : "text-cyan-200"
                        )} />
                      )}
                      
                      <span className={cn(
                        "text-[7px] font-bold font-mono tracking-widest mt-1 uppercase",
                        isListening ? "text-red-300" : isSpeaking ? "text-violet-300" : "text-cyan-400/80"
                      )}>
                        {isListening ? "LISTENING" : isThinking ? "THINKING" : isSpeaking ? "SPEAKING" : "IDLE"}
                      </span>
                    </motion.div>
                  </div>

                  <p className="text-[10px] text-cyan-400/40 mt-4 uppercase tracking-[0.2em] font-black group-hover:text-cyan-400 transition-colors">
                    {isListening ? "Tapping core stops recording" : "Tap core to activate speech capture"}
                  </p>
                </Card>

                {/* Conversation HUD Panel */}
                <Card className="border-cyan-500/20 bg-black/60 backdrop-blur-md rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.02)]">
                  <div className="px-4 py-2 border-b border-cyan-500/15 bg-cyan-950/20 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                      <Sparkles size={11} className="text-cyan-400 animate-pulse" />
                      Coordinated Link Stream
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono text-cyan-500/40 font-bold uppercase tracking-widest">Astra Dialogue</span>
                      <button
                        onClick={() => setIsChatMaximized(true)}
                        title="Maximize to modal"
                        className="p-1 rounded text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      >
                        <Maximize2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Message dialogue viewport */}
                  <ScrollArea className="flex-1 p-4 min-h-0 viewport-chat" viewportRef={chatScrollRef}>
                    <div className="space-y-4">
                      {messages.map((msg, i) => {
                        const isUser = msg.role === "user";
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              "flex flex-col gap-1.5 max-w-[85%]",
                              isUser ? "ml-auto items-end" : "items-start"
                            )}
                          >
                            <div className={cn(
                              "px-3.5 py-2 rounded-2xl text-[12px] leading-relaxed",
                              isUser 
                                ? "bg-cyan-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                                : "bg-gradient-to-br from-cyan-950/60 to-cyan-900/15 border border-cyan-500/10 text-cyan-100 rounded-tl-none font-light shadow-inner"
                            )}>
                              {formatAstraMessage(msg.content)}
                            </div>
                            <span className="text-[8px] text-cyan-500/35 uppercase font-mono tracking-widest px-1">
                              {isUser ? "USER" : "ASTRA"}
                            </span>
                          </motion.div>
                        );
                      })}

                      {isThinking && (
                        <div className="flex items-center gap-1.5 text-cyan-500/40 text-[9px] uppercase animate-pulse">
                          <Terminal size={9} />
                          Astra reasoning stream active...
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Terminal input console */}
                  <div className="p-3 border-t border-cyan-500/10 bg-black/40 shrink-0">
                    <div className="relative">
                      {/* Slash command suggestions dropdown */}
                      <AnimatePresence>
                        {isSlashMode && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            className="absolute bottom-full left-0 right-0 mb-2 bg-black border border-cyan-500/20 rounded-xl overflow-hidden shadow-2xl z-50 text-[10px]"
                          >
                            {SLASH_COMMANDS.map((c) => (
                              <button
                                key={c.cmd}
                                onClick={() => {
                                  setInput(c.expand);
                                  inputRef.current?.focus();
                                }}
                                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-cyan-500/10 transition-colors text-left group"
                              >
                                <span className="text-cyan-400 font-bold">{c.cmd}</span>
                                <span className="text-cyan-500/40 group-hover:text-cyan-400/80 transition-colors">{c.hint}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-2">
                        {/* Audio capture trigger */}
                        <button
                          onClick={toggleVoiceInput}
                          className={cn(
                            "h-9 w-9 shrink-0 rounded-full flex items-center justify-center border transition-all duration-300",
                            isListening 
                              ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                              : "bg-black/50 border-cyan-500/20 text-cyan-400/60 hover:border-cyan-500/40 hover:text-cyan-400"
                          )}
                        >
                          <Mic size={14} className={isListening ? "animate-pulse" : ""} />
                        </button>

                        {/* Input line */}
                        <input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) sendMessage(input.trim());
                            if (e.key === "Escape" && isSlashMode) setInput("");
                          }}
                          placeholder={
                            isListening ? "Astra is listening, speak..." : "Type directive... (try /task, /timer)"
                          }
                          className="flex-1 bg-black/60 border border-cyan-500/15 rounded-xl px-3 py-2 text-cyan-300 text-[11px] font-mono placeholder:text-cyan-900 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.08)] transition-all h-9"
                        />

                        {/* Send button */}
                        <button
                          onClick={() => sendMessage(input.trim())}
                          disabled={isThinking || !input.trim()}
                          className="h-9 w-9 shrink-0 rounded-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-20 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all"
                        >
                          <Send size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                </Card>

              </div>

              {/* RIGHT COLUMN: Holographic X-News feed (Cols 9-12) */}
              <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
                <Card className="border-cyan-500/20 bg-black/50 backdrop-blur-md rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.02)]">
                  
                  {/* News Header & Search */}
                  <div className="p-4 border-b border-cyan-500/15 bg-cyan-950/20 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                        <BookOpen size={12} className="text-cyan-400 animate-pulse" />
                        Holographic News Vector
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/35 rounded font-mono uppercase tracking-widest py-0.5 px-1">X-FEED</span>
                        <button
                          onClick={() => fetchLiveNews()}
                          disabled={isLoadingNews}
                          title="Refresh live news"
                          className="h-5 w-5 rounded flex items-center justify-center border border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all disabled:opacity-30"
                        >
                          <RefreshCw size={9} className={cn("text-cyan-400", isLoadingNews && "animate-spin")} />
                        </button>
                      </div>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-cyan-500/30 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        value={newsSearch}
                        onChange={(e) => setNewsSearch(e.target.value)}
                        placeholder="Scan news streams..."
                        className="w-full bg-black/60 border border-cyan-500/15 rounded-xl pl-8 pr-3 py-1.5 text-cyan-300 text-[10px] font-mono placeholder:text-cyan-900 focus:outline-none focus:border-cyan-500/40 transition-all"
                      />
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex flex-wrap gap-1">
                      {["all", "ai", "tech", "jobs", "trends"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setNewsFilter(cat as any);
                            addLog(`NEWS STREAM RE-FILTERED: ${cat.toUpperCase()}`, "system");
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all border",
                            newsFilter === cat 
                              ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" 
                              : "bg-transparent border-cyan-500/5 text-cyan-500/45 hover:text-cyan-400"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4 min-h-0 bg-black/10">
                    {isLoadingNews ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4" />
                        <p className="text-[10px] uppercase tracking-widest font-black text-cyan-500/50 animate-pulse">Scanning live intel streams...</p>
                      </div>
                    ) : filteredNews.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                        <AlertCircle className="w-10 h-10 text-cyan-500/40 mb-3 animate-pulse" />
                        <p className="text-[10px] uppercase tracking-widest font-black">No signals detected</p>
                        <p className="text-[9px] text-cyan-500/60 mt-1">Refine scan parameters or reset query filter.</p>
                        <button
                          onClick={() => fetchLiveNews()}
                          className="mt-4 px-3 py-1.5 rounded-lg border border-cyan-500/20 text-[9px] uppercase font-black text-cyan-400 hover:border-cyan-500/40 transition-all"
                        >
                          Rescan Streams
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {filteredNews.map((news) => (
                          <div 
                            key={news.id} 
                            className="group relative p-4 rounded-xl border border-cyan-500/10 bg-cyan-950/5 hover:border-cyan-500/35 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)] transition-all duration-300 overflow-hidden"
                          >
                            {/* Scanning lines decorative effect */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,36,0)_95%,rgba(6,182,212,0.08)_95%)] bg-[length:100%_15px] pointer-events-none group-hover:opacity-100 opacity-20 transition-opacity" />
                            
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[8px] bg-cyan-500/10 border border-cyan-500/15 rounded text-cyan-400 font-mono tracking-widest uppercase py-0 px-1 font-black">
                                {news.category}
                              </span>
                              <span className="text-[8px] text-cyan-500/30 font-bold uppercase tracking-widest flex items-center gap-1">
                                {news.time === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />}
                                {news.time}
                              </span>
                            </div>

                            <h4 className="text-xs font-black text-cyan-100 leading-snug tracking-tight mb-1 group-hover:text-cyan-400 transition-colors italic">
                              {news.url ? (
                                <a href={news.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{news.title}</a>
                              ) : news.title}
                            </h4>
                            
                            <p className="text-[10px] text-cyan-500/70 font-light leading-relaxed mb-3 pr-1">
                              {news.summary}
                            </p>

                            <div className="flex items-center justify-between border-t border-cyan-500/5 pt-2.5 shrink-0">
                              <span className="text-[8px] text-cyan-500/40 uppercase font-black">SOURCE: {news.source}</span>
                              <Button
                                onClick={() => consultJarvisOnNews(news)}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/15 hover:border-cyan-500/40 text-[9px] font-black text-cyan-400 hover:text-white uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                              >
                                Consult Jarvis
                                <ArrowRight className="ml-1 w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                </Card>
              </div>

            </div>

          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>

    {/* ─── Maximized Chat Modal Overlay ─────────────────────────── */}
    <AnimatePresence>
      {isChatMaximized && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="w-full max-w-4xl h-[85vh] rounded-3xl border border-cyan-500/25 bg-black/90 backdrop-blur-3xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-cyan-500/15 bg-cyan-950/20 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <Sparkles size={13} className="text-cyan-400 animate-pulse" />
                Astra Coordinated Nexus Stream (Maximized View)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-cyan-500/40 font-bold uppercase tracking-widest">Quantum Dialogue Link</span>
                <button
                  onClick={() => setIsChatMaximized(false)}
                  title="Minimize chat"
                  className="p-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-300 transition-all flex items-center gap-1.5"
                >
                  <Minimize2 size={13} />
                  <span className="text-[9px] font-bold uppercase tracking-widest font-mono">Minimize</span>
                </button>
              </div>
            </div>

            {/* Message dialogue viewport */}
            <ScrollArea className="flex-1 p-6 min-h-0 bg-black/20" viewportRef={modalChatScrollRef}>
              <div className="space-y-5 max-w-3xl mx-auto pb-4">
                {messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col gap-2 max-w-[85%]",
                        isUser ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className={cn(
                        "px-4.5 py-3 rounded-2xl text-[13px] leading-relaxed shadow-lg",
                        isUser 
                          ? "bg-cyan-600 text-white rounded-tr-none shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                          : "bg-gradient-to-br from-cyan-950/70 to-cyan-900/20 border border-cyan-500/15 text-cyan-100 rounded-tl-none font-light shadow-inner"
                      )}>
                        {formatAstraMessage(msg.content)}
                      </div>
                      <span className="text-[8px] text-cyan-500/35 uppercase font-mono tracking-widest px-1.5">
                        {isUser ? "USER" : "ASTRA"}
                      </span>
                    </motion.div>
                  );
                })}

                {isThinking && (
                  <div className="flex items-center gap-2 text-cyan-500/40 text-[10px] uppercase animate-pulse">
                    <Terminal size={10} />
                    Astra reasoning stream active...
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Terminal input console */}
            <div className="p-4 border-t border-cyan-500/10 bg-black/60 shrink-0">
              <div className="max-w-3xl mx-auto relative">
                {/* Slash command suggestions dropdown */}
                <AnimatePresence>
                  {isSlashMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute bottom-full left-0 right-0 mb-2 bg-black border border-cyan-500/20 rounded-xl overflow-hidden shadow-2xl z-50 text-[10px]"
                    >
                      {SLASH_COMMANDS.map((c) => (
                        <button
                          key={c.cmd}
                          onClick={() => {
                            setInput(c.expand);
                            modalInputRef.current?.focus();
                          }}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-cyan-500/10 transition-colors text-left group"
                        >
                          <span className="text-cyan-400 font-bold">{c.cmd}</span>
                          <span className="text-cyan-500/40 group-hover:text-cyan-400/80 transition-colors">{c.hint}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-3">
                  {/* Audio capture trigger */}
                  <button
                    onClick={toggleVoiceInput}
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-full flex items-center justify-center border transition-all duration-300",
                      isListening 
                        ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                        : "bg-black/50 border-cyan-500/20 text-cyan-400/60 hover:border-cyan-500/40 hover:text-cyan-400"
                    )}
                  >
                    <Mic size={16} className={isListening ? "animate-pulse" : ""} />
                  </button>

                  {/* Input line */}
                  <input
                    ref={modalInputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) sendMessage(input.trim());
                      if (e.key === "Escape" && isSlashMode) setInput("");
                    }}
                    placeholder={
                      isListening ? "Astra is listening, speak..." : "Type directive... (try /task, /timer)"
                    }
                    className="flex-1 bg-black/70 border border-cyan-500/20 rounded-xl px-4 py-2.5 text-cyan-200 text-xs font-mono placeholder:text-cyan-900 focus:outline-none focus:border-cyan-500/40 focus:shadow-[0_0_10px_rgba(6,182,212,0.08)] transition-all h-10"
                  />

                  {/* Send button */}
                  <button
                    onClick={() => sendMessage(input.trim())}
                    disabled={isThinking || !input.trim()}
                    className="h-10 w-10 shrink-0 rounded-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-20 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>
);
}
