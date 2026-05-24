"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AstraOrbProps {
    isListening?: boolean;
    isSpeaking?: boolean;
    isThinking?: boolean;
    onClick?: () => void;
    className?: string;
}

export function AstraOrb({ isListening, isSpeaking, isThinking, onClick, className }: AstraOrbProps) {
    const [pulse, setPulse] = useState(1);

    useEffect(() => {
        if (isSpeaking) {
            const interval = setInterval(() => {
                setPulse(Math.random() * 0.5 + 1);
            }, 100);
            return () => clearInterval(interval);
        } else {
            setPulse(1);
        }
    }, [isSpeaking]);

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative group cursor-pointer",
                className
            )}
            suppressHydrationWarning={true}
        >
            {/* Outer Glow */}
            <motion.div
                animate={{
                    scale: isSpeaking ? [1, 1.2, 1] : isListening ? [1, 1.1, 1] : 1,
                    opacity: isThinking ? [0.4, 0.8, 0.4] : 1,
                }}
                transition={{
                    duration: isSpeaking ? 0.2 : 2,
                    repeat: Infinity,
                }}
                className={cn(
                    "absolute inset-0 rounded-full blur-xl",
                    isListening ? "bg-red-500/50" : "bg-cyan-500/50"
                )}
                suppressHydrationWarning={true}
            />

            {/* Main Orb */}
            <motion.div
                animate={{
                    rotate: isThinking ? 360 : 0,
                    scale: pulse,
                }}
                transition={{
                    rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                    scale: { duration: 0.1 }
                }}
                className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center border-2 overflow-hidden",
                    "shadow-[0_0_20px_rgba(6,182,212,0.5)]",
                    isListening ? "border-red-400 bg-red-950/30" : "border-cyan-400 bg-cyan-950/30",
                    "backdrop-blur-md"
                )}
                suppressHydrationWarning={true}
            >
                {/* Internal Core */}
                <div 
                    className={cn(
                        "absolute w-8 h-8 rounded-full blur-sm",
                        isListening ? "bg-red-400" : "bg-cyan-400"
                    )} 
                    suppressHydrationWarning={true}
                />

                {/* Spinning Rings */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-1 border border-dashed border-cyan-400/30 rounded-full"
                    suppressHydrationWarning={true}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-3 border border-dotted border-cyan-400/20 rounded-full"
                    suppressHydrationWarning={true}
                />

                {isListening ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="z-10 text-red-100"
                        suppressHydrationWarning={true}
                    >
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </motion.div>
                ) : (
                    <Bot className="w-8 h-8 text-cyan-100 z-10" />
                )}
            </motion.div>

            {/* Label Tooltip */}
            <div 
                className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-cyan-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                suppressHydrationWarning={true}
            >
                ASTRA CORE: ONLINE
            </div>
        </div>
    );
}
