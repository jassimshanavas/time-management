"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AstraOrb } from "./astra-orb";
import { getAstraResponse } from "@/lib/gemini";
import { useStore } from "@/lib/store";
import { Send, X, Mic, Volume2, VolumeX, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
    role: "user" | "astra";
    content: string;
}

export function AstraAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isRecognitionActive, setIsRecognitionActive] = useState(false);

    const { tasks, habits, goals, projects, gamification } = useStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    const recognition = useRef<any>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    useEffect(() => {
        const SpeechRecognition = typeof window !== "undefined"
            ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
            : null;

        if (SpeechRecognition) {
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = false;
            recognition.current.interimResults = false;
            recognition.current.lang = "en-US";

            recognition.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setIsRecognitionActive(false);
                processVoiceCommand(transcript);
            };

            recognition.current.onerror = (event: any) => {
                if (event.error === 'no-speech') {
                    console.warn("No speech detected.");
                } else {
                    console.error("Speech recognition error", event.error);
                }
                setIsRecognitionActive(false);
            };

            recognition.current.onend = () => {
                setIsRecognitionActive(false);
            };
        }
    }, []);

    const toggleRecognition = () => {
        if (isRecognitionActive) {
            recognition.current?.stop();
        } else {
            setIsRecognitionActive(true);
            recognition.current?.start();
        }
    };

    const speak = (text: string) => {
        if (!voiceEnabled || !synth) return;

        synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synth.getVoices();
        const jarvisVoice = voices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Arthur"));
        if (jarvisVoice) utterance.voice = jarvisVoice;

        utterance.pitch = 0.9;
        utterance.rate = 1.1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);

        synth.speak(utterance);
    };

    const getContext = () => ({
        activeTasks: tasks.filter(t => t.status !== 'done').length,
        highPriorityTasks: tasks.filter(t => t.priority === 'high').length,
        habitStreaks: habits.map(h => ({ name: h.title, streak: h.streak })),
        level: gamification?.level || 1,
        xp: gamification?.xp || 0,
        recentGoals: goals.slice(0, 3).map(g => g.title),
    });

    const processVoiceCommand = async (text: string) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setIsThinking(true);
        setInput("");

        const response = await getAstraResponse(text, getContext());
        setIsThinking(false);
        setMessages(prev => [...prev, { role: "astra", content: response }]);
        speak(response);
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        processVoiceCommand(input.trim());
    };

    const initialGreeting = async () => {
        if (messages.length > 0) return;
        setIsThinking(true);
        const greeting = "Systems online, Sir. Astra is at your service. How may I assist you with your schedule today?";
        setMessages([{ role: "astra", content: greeting }]);
        setIsThinking(false);
        speak(greeting);
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            initialGreeting();
        }
    }, [isOpen]);

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <AstraOrb
                    isThinking={isThinking}
                    isSpeaking={isSpeaking}
                    isListening={isRecognitionActive}
                    onClick={() => setIsOpen(!isOpen)}
                />
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        className="fixed bottom-24 right-6 w-[380px] h-[580px] z-50 flex flex-col"
                    >
                        <div className="flex-1 rounded-3xl border border-cyan-500/30 bg-black/85 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-cyan-950/20">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    <span className="text-cyan-400 font-mono tracking-widest uppercase text-[10px]">Astra Interface v1.0</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => setVoiceEnabled(!voiceEnabled)} className="text-cyan-400 hover:bg-cyan-500/10 h-7 w-7">
                                        {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-cyan-400 hover:bg-cyan-500/10 h-7 w-7">
                                        <X size={14} />
                                    </Button>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                                <div className="space-y-4">
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className={cn("flex flex-col max-w-[85%]", msg.role === "user" ? "ml-auto items-end" : "items-start")}
                                        >
                                            <div className={cn(
                                                "px-4 py-2 rounded-2xl text-[13px] leading-relaxed",
                                                msg.role === "user"
                                                    ? "bg-cyan-600 text-white rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                                                    : "bg-cyan-900/30 border border-cyan-500/10 text-cyan-50/90 rounded-tl-none font-light backdrop-blur-sm"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[8px] text-cyan-500/40 mt-1 font-mono uppercase tracking-widest ml-1 mr-1">
                                                {msg.role === "user" ? "User" : "Astra"}
                                            </span>
                                        </motion.div>
                                    ))}
                                    {isThinking && (
                                        <div className="flex items-center gap-2 text-cyan-500/40 font-mono text-[9px] animate-pulse">
                                            <Terminal size={10} />
                                            ANALYZING...
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="p-4 border-t border-cyan-500/10 bg-black/40">
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={toggleRecognition}
                                        variant="outline"
                                        size="icon"
                                        className={cn(
                                            "h-9 w-9 shrink-0 rounded-full",
                                            isRecognitionActive ? "bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]" : "bg-black border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                                        )}
                                    >
                                        <Mic size={16} className={isRecognitionActive ? "animate-pulse" : ""} />
                                    </Button>
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                        placeholder={isRecognitionActive ? "Listening..." : "Command..."}
                                        className="bg-black/50 border-cyan-500/20 text-cyan-400 placeholder:text-cyan-900 focus-visible:ring-cyan-500/20 h-9 text-[13px] font-mono"
                                    />
                                    <Button
                                        onClick={handleSend}
                                        disabled={isThinking || !input.trim()}
                                        className="bg-cyan-700 hover:bg-cyan-600 text-white rounded-full h-9 w-9 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)] p-0"
                                    >
                                        <Send size={14} />
                                    </Button>
                                </div>

                                <div className="mt-3 flex justify-center gap-[2px] h-2 items-center opacity-30">
                                    {[...Array(15)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                height: (isSpeaking || isRecognitionActive) ? [3, 10, 3] : 3,
                                            }}
                                            transition={{
                                                duration: 0.5,
                                                repeat: Infinity,
                                                delay: i * 0.05,
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
