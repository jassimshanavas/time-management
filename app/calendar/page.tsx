'use client';

import { useState, useMemo, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    CheckSquare,
    Target,
    Bell,
    Filter,
    Plus,
    Zap,
    Flame,
    Clock,
    CheckCircle2,
    Circle,
    AlertCircle,
    RotateCcw,
    CalendarDays,
    LayoutGrid,
    AlignJustify,
    Repeat,
    X,
    TrendingUp,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { cn } from '@/lib/utils';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    subDays,
    parseISO,
    addDays,
    isPast,
    isBefore,
    startOfDay,
    endOfDay,
    addWeeks,
    subWeeks,
    getHours,
    getMinutes,
    eachHourOfInterval,
    addHours,
} from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type ViewMode = 'month' | 'week' | 'day';
type QuickAddType = 'task' | 'goal' | 'reminder';

interface DayStats {
    totalTasks: number;
    completedTasks: number;
    totalGoals: number;
    totalReminders: number;
    highPriorityCount: number;
    completionRate: number;
    isOverbooked: boolean;
    totalEstimatedMinutes: number;
    habitCount: number;
    completedHabitCount: number;
}

const OVERBOOK_THRESHOLD_MINUTES = 360; // 6 hours
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Custom Premium Markdown Renderer component
interface MarkdownToken {
    type: 'text' | 'bold' | 'italic' | 'code';
    text: string;
}

const tokenizeInlineMarkdown = (text: string): MarkdownToken[] => {
    const tokens: MarkdownToken[] = [];
    let currentText = '';
    let i = 0;

    while (i < text.length) {
        // Code blocks: `code`
        if (text[i] === '`') {
            if (currentText) {
                tokens.push({ type: 'text', text: currentText });
                currentText = '';
            }
            let code = '';
            i++;
            while (i < text.length && text[i] !== '`') {
                code += text[i];
                i++;
            }
            tokens.push({ type: 'code', text: code });
            i++;
            continue;
        }

        // Bold tags: **bold**
        if (text[i] === '*' && text[i + 1] === '*') {
            if (currentText) {
                tokens.push({ type: 'text', text: currentText });
                currentText = '';
            }
            let bold = '';
            i += 2;
            while (i < text.length && !(text[i] === '*' && text[i + 1] === '*')) {
                bold += text[i];
                i++;
            }
            tokens.push({ type: 'bold', text: bold });
            i += 2;
            continue;
        }

        // Italic tags: *italic*
        if (text[i] === '*') {
            if (currentText) {
                tokens.push({ type: 'text', text: currentText });
                currentText = '';
            }
            let italic = '';
            i++;
            while (i < text.length && text[i] !== '*') {
                italic += text[i];
                i++;
            }
            tokens.push({ type: 'italic', text: italic });
            i++;
            continue;
        }

        currentText += text[i];
        i++;
    }

    if (currentText) {
        tokens.push({ type: 'text', text: currentText });
    }

    return tokens;
};

const renderInlineMarkdown = (text: string) => {
    const tokens = tokenizeInlineMarkdown(text);
    return tokens.map((token, idx) => {
        if (token.type === 'code') {
            return (
                <code key={idx} className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[9px] mx-0.5 border border-primary/5 shrink-0">
                    {token.text}
                </code>
            );
        }
        if (token.type === 'bold') {
            return (
                <strong key={idx} className="font-black text-foreground">
                    {token.text}
                </strong>
            );
        }
        if (token.type === 'italic') {
            return (
                <em key={idx} className="italic text-foreground/80">
                    {token.text}
                </em>
            );
        }
        return <span key={idx}>{token.text}</span>;
    });
};

interface MarkdownRendererProps {
    content: string;
    className?: string;
    sessionStart?: Date | string;
}

const calculateAbsoluteTime = (sessionStart: Date | string | undefined, timestampStr: string): { abs: string; offset: string } | null => {
    if (!sessionStart) return null;
    let start: Date;
    try {
        start = typeof sessionStart === 'string' ? parseISO(sessionStart) : sessionStart;
        if (isNaN(start.getTime())) return null;
    } catch {
        return null;
    }
    
    // Parse timestampStr which could be "[00:05:38]" or "00:05:38" or "05:38"
    const cleanStamp = timestampStr.replace(/[\[\]`]/g, '').trim();
    const parts = cleanStamp.split(':').map(Number);
    
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    
    if (parts.length === 3) {
        hours = parts[0];
        minutes = parts[1];
        seconds = parts[2];
    } else if (parts.length === 2) {
        minutes = parts[0];
        seconds = parts[1];
    } else {
        return null;
    }
    
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;
    
    const offsetSeconds = hours * 3600 + minutes * 60 + seconds;
    const eventTime = new Date(start.getTime() + offsetSeconds * 1000);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const offsetStr = parts.length === 3 
        ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
        
    return {
        abs: format(eventTime, 'h:mm a'),
        offset: offsetStr
    };
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className, sessionStart }) => {
    if (!content) return null;

    // Normalise list layout items that are written sequentially on the same line:
    // e.g. "- [ ] task - [x] task" -> split them to newlines for premium standard vertical layouts
    let normalisedContent = content;
    // Safely insert newlines before checkboxes or list items that are squashed on a single line
    normalisedContent = normalisedContent.replace(/\s+(-\s+\[[ x]\])/g, '\n$1');
    normalisedContent = normalisedContent.replace(/\s+(-\s+\w)/g, '\n$1');

    const lines = normalisedContent.split('\n');

    return (
        <div className={cn("space-y-0 text-left py-1 relative w-full", className)}>
            {lines.map((line, lineIdx) => {
                const trimmed = line.trim();
                const isLastLine = lineIdx === lines.length - 1;

                // 1. Checkboxes with dynamic Chronos timestamps (e.g. "- [ ] `[00:05:38]` node3" or "- [x] [00:05:51] node4")
                const checkboxMatch = trimmed.match(/^-\s+\[([ x])\]\s+`?(\[?\d{1,2}:\d{2}(?::\d{2})?\]?)`?\s*(.*)$/);
                if (checkboxMatch) {
                    const checked = checkboxMatch[1] === 'x';
                    const timestamp = checkboxMatch[2];
                    const text = checkboxMatch[3];
                    const parsedTime = calculateAbsoluteTime(sessionStart, timestamp);

                    return (
                        <div key={lineIdx} className="flex gap-2 min-h-[36px] group/line relative select-none">
                            {/* Left part: Timestamp */}
                            <div className="w-14 shrink-0 text-right flex flex-col justify-start pt-1.5 pr-1">
                                {parsedTime ? (
                                    <>
                                        <span className="text-[9px] font-black tracking-tight text-foreground/95 leading-none">
                                            {parsedTime.abs.split(' ')[0]}
                                        </span>
                                        <span className="text-[7px] font-bold text-muted-foreground/45 font-mono mt-0.5 leading-none">
                                            {parsedTime.abs.split(' ')[1]}
                                        </span>
                                        <span className="text-[6.5px] font-semibold text-primary/40 font-mono mt-0.5 leading-none">
                                            +{parsedTime.offset}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-[8px] font-black font-mono tracking-widest text-muted-foreground/50 bg-primary/5 px-1 py-0.5 rounded leading-none w-max ml-auto">
                                        {timestamp.replace(/[\[\]`]/g, '')}
                                    </span>
                                )}
                            </div>

                            {/* Center part: Axis track & Dot */}
                            <div className="w-5 shrink-0 flex flex-col items-center relative">
                                <div className={cn(
                                    "w-[2px] bg-primary/10 flex-grow",
                                    lineIdx === 0 && "rounded-t-full mt-2.5",
                                    isLastLine && "h-2.5 flex-grow-0"
                                )} />
                                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 bg-background z-10 p-0.5 rounded-full flex items-center justify-center">
                                    {checked ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 rounded-full bg-background" />
                                    ) : (
                                        <Circle className="h-3.5 w-3.5 text-muted-foreground/30 rounded-full bg-background" />
                                    )}
                                </div>
                            </div>

                            {/* Right part: Description */}
                            <div className="flex-1 pt-1 text-left min-w-0">
                                <span className={cn(
                                    "text-[10px] font-bold text-muted-foreground/80 leading-snug break-words",
                                    checked && "line-through opacity-45"
                                )}>
                                    {renderInlineMarkdown(text)}
                                </span>
                            </div>
                        </div>
                    );
                }

                // 2. Standard Checkboxes (without timestamps): e.g. "- [ ] Task"
                const stdCheckboxMatch = trimmed.match(/^-\s+\[([ x])\]\s*(.*)$/);
                if (stdCheckboxMatch) {
                    const checked = stdCheckboxMatch[1] === 'x';
                    const text = stdCheckboxMatch[2];
                    return (
                        <div key={lineIdx} className="flex gap-2 min-h-[36px] group/line relative select-none">
                            {/* Left part: empty spacer */}
                            <div className="w-14 shrink-0" />

                            {/* Center part: Axis track & Dot */}
                            <div className="w-5 shrink-0 flex flex-col items-center relative">
                                <div className={cn(
                                    "w-[2px] bg-primary/10 flex-grow",
                                    lineIdx === 0 && "rounded-t-full mt-2.5",
                                    isLastLine && "h-2.5 flex-grow-0"
                                )} />
                                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 bg-background z-10 p-0.5 rounded-full flex items-center justify-center">
                                    {checked ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 rounded-full bg-background" />
                                    ) : (
                                        <Circle className="h-3.5 w-3.5 text-muted-foreground/30 rounded-full bg-background" />
                                    )}
                                </div>
                            </div>

                            {/* Right part: Description */}
                            <div className="flex-1 pt-1 text-left min-w-0">
                                <span className={cn(
                                    "text-[10px] font-bold text-muted-foreground/80 leading-snug break-words",
                                    checked && "line-through opacity-45"
                                )}>
                                    {renderInlineMarkdown(text)}
                                </span>
                            </div>
                        </div>
                    );
                }

                // 3. Bullets / Header points inside Chronos list: e.g. "- Deep Work:" or "- Operations"
                if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    const text = trimmed.replace(/^[-*]\s*/, '');
                    return (
                        <div key={lineIdx} className="flex gap-2 min-h-[32px] group/line relative">
                            {/* Left part: empty spacer */}
                            <div className="w-14 shrink-0" />

                            {/* Center part: Axis track & Dot */}
                            <div className="w-5 shrink-0 flex flex-col items-center relative">
                                <div className={cn(
                                    "w-[2px] bg-primary/10 flex-grow",
                                    lineIdx === 0 && "rounded-t-full mt-2.5",
                                    isLastLine && "h-2.5 flex-grow-0"
                                )} />
                                <div className="absolute top-[8px] left-1/2 -translate-x-1/2 bg-background z-10 p-0.5 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/15" />
                                </div>
                            </div>

                            {/* Right part: Description */}
                            <div className="flex-1 pt-1 text-left min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">
                                    {renderInlineMarkdown(text)}
                                </span>
                            </div>
                        </div>
                    );
                }

                // 4. Headers (### or ## or #)
                if (trimmed.startsWith('###')) {
                    const text = trimmed.replace(/^###\s*/, '');
                    return (
                        <div key={lineIdx} className="flex gap-2 min-h-[28px] group/line relative">
                            <div className="w-14 shrink-0" />
                            <div className="w-5 shrink-0 flex flex-col items-center relative">
                                <div className={cn(
                                    "w-[2px] bg-primary/10 flex-grow",
                                    lineIdx === 0 && "rounded-t-full mt-2",
                                    isLastLine && "h-2 flex-grow-0"
                                )} />
                                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 bg-background z-10 p-0.5 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full border border-primary/20 bg-background" />
                                </div>
                            </div>
                            <div className="flex-1 pt-0.5 text-left">
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/45">
                                    {renderInlineMarkdown(text)}
                                </h5>
                            </div>
                        </div>
                    );
                }
                if (trimmed.startsWith('##')) {
                    const text = trimmed.replace(/^##\s*/, '');
                    return (
                        <div key={lineIdx} className="flex gap-2 min-h-[30px] group/line relative">
                            <div className="w-14 shrink-0" />
                            <div className="w-5 shrink-0 flex flex-col items-center relative">
                                <div className={cn(
                                    "w-[2px] bg-primary/10 flex-grow",
                                    lineIdx === 0 && "rounded-t-full mt-2",
                                    isLastLine && "h-2 flex-grow-0"
                                )} />
                                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 bg-background z-10 p-0.5 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full border border-primary/30 bg-background" />
                                </div>
                            </div>
                            <div className="flex-1 pt-0.5 text-left">
                                <h4 className="text-xs font-black italic tracking-tight text-foreground">
                                    {renderInlineMarkdown(text)}
                                </h4>
                            </div>
                        </div>
                    );
                }
                if (trimmed.startsWith('#')) {
                    const text = trimmed.replace(/^#\s*/, '');
                    return (
                        <div key={lineIdx} className="flex gap-2 min-h-[32px] group/line relative">
                            <div className="w-14 shrink-0" />
                            <div className="w-5 shrink-0 flex flex-col items-center relative">
                                <div className={cn(
                                    "w-[2px] bg-primary/10 flex-grow",
                                    lineIdx === 0 && "rounded-t-full mt-2",
                                    isLastLine && "h-2 flex-grow-0"
                                )} />
                                <div className="absolute top-[6px] left-1/2 -translate-x-1/2 bg-background z-10 p-0.5 rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full border-2 border-primary/45 bg-background" />
                                </div>
                            </div>
                            <div className="flex-1 pt-0.5 text-left">
                                <h3 className="text-sm font-black italic tracking-tight text-foreground">
                                    {renderInlineMarkdown(text)}
                                </h3>
                            </div>
                        </div>
                    );
                }

                // 5. Empty Line
                if (trimmed === '') {
                    return (
                        <div key={lineIdx} className="flex gap-2 h-3 group/line relative">
                            <div className="w-14 shrink-0" />
                            <div className="w-5 shrink-0 flex flex-col items-center relative">
                                <div className="w-[2px] bg-primary/10 h-full" />
                            </div>
                            <div className="flex-1" />
                        </div>
                    );
                }

                // 6. Plain Line
                return (
                    <div key={lineIdx} className="flex gap-2 min-h-[28px] group/line relative">
                        <div className="w-14 shrink-0" />
                        <div className="w-5 shrink-0 flex flex-col items-center relative">
                            <div className={cn(
                                "w-[2px] bg-primary/10 flex-grow",
                                lineIdx === 0 && "rounded-t-full mt-2.5",
                                isLastLine && "h-2.5 flex-grow-0"
                            )} />
                            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 bg-background z-10 p-0.5 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 bg-background" />
                            </div>
                        </div>
                        <div className="flex-1 pt-0.5 text-left break-words">
                            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
                                {renderInlineMarkdown(line)}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default function CalendarPage() {
    const {
        tasks,
        goals,
        reminders,
        habits,
        timeEntries,
        sleepEntries,
        selectedProjectId,
        updateTask,
        addTask,
        addGoal,
        addReminder,
        toggleHabitCompletion,
        userId,
    } = useStore();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showTasks, setShowTasks] = useState(true);
    const [showGoals, setShowGoals] = useState(true);
    const [showReminders, setShowReminders] = useState(true);
    const [showHabits, setShowHabits] = useState(true);
    const [showTimeEntries, setShowTimeEntries] = useState(true);
    const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>('all');
    
    // Timeline selection frame and state variables
    const [timeFramePreset, setTimeFramePreset] = useState<string>('full');
    const [customStartHour, setCustomStartHour] = useState<number>(9);
    const [customEndHour, setCustomEndHour] = useState<number>(17);

    // Compute visible hours based on preset or custom selections
    const visibleHours = useMemo(() => {
        let start = 0;
        let end = 23;
        if (timeFramePreset === 'full') {
            start = 0;
            end = 23;
        } else if (timeFramePreset === 'active') {
            start = 6;
            end = 22;
        } else if (timeFramePreset === 'work') {
            start = 9;
            end = 17;
        } else if (timeFramePreset === 'morning') {
            start = 6;
            end = 12;
        } else if (timeFramePreset === 'afternoon') {
            start = 12;
            end = 17;
        } else if (timeFramePreset === 'evening') {
            start = 17;
            end = 22;
        } else if (timeFramePreset === 'custom') {
            start = customStartHour;
            end = customEndHour;
        }

        if (start <= end) {
            return Array.from({ length: end - start + 1 }, (_, i) => start + i);
        } else {
            // Support midnight wrap (e.g. night sleep selections like 10 PM to 6 AM)
            const firstPart = Array.from({ length: 24 - start }, (_, i) => start + i);
            const secondPart = Array.from({ length: end + 1 }, (_, i) => i);
            return [...firstPart, ...secondPart];
        }
    }, [timeFramePreset, customStartHour, customEndHour]);

    // Quick-add modal state
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
    const [quickAddType, setQuickAddType] = useState<QuickAddType>('task');
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [quickAddLoading, setQuickAddLoading] = useState(false);

    // Hover & Click Detail States
    const [hoveredEvent, setHoveredEvent] = useState<any | null>(null);
    const [clickedEvent, setClickedEvent] = useState<any | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Double-click tracking
    const lastClickRef = useRef<{ date: string; time: number } | null>(null);

    // ── Workspace filter ──────────────────────────────────────────────────────
    const filterByWorkspace = <T extends { projectId?: string }>(items: T[]) => {
        if (selectedProjectId === null) return items;
        if (selectedProjectId === 'personal') return items.filter((item) => !item.projectId);
        return items.filter((item) => item.projectId === selectedProjectId);
    };

    const filteredTasks = filterByWorkspace(tasks);
    const filteredGoals = filterByWorkspace(goals);
    const filteredReminders = filterByWorkspace(reminders);
    const filteredHabits = filterByWorkspace(habits);
    const filteredTimeEntries = filterByWorkspace(timeEntries);

    const getSleepEntryForTime = (date: Date, hour: number) => {
        const checkTime = addHours(startOfDay(date), hour);
        return sleepEntries.find((entry) => {
            const bed = typeof entry.bedtime === 'string' ? parseISO(entry.bedtime) : new Date(entry.bedtime);
            const wake = typeof entry.wakeTime === 'string' ? parseISO(entry.wakeTime) : new Date(entry.wakeTime);
            return checkTime >= bed && checkTime < wake;
        });
    };

    // ── Day stats map ─────────────────────────────────────────────────────────
    const dayStatsMap = useMemo(() => {
        const statsMap = new Map<string, DayStats>();

        const getOrCreate = (dateKey: string): DayStats => {
            if (!statsMap.has(dateKey)) {
                statsMap.set(dateKey, {
                    totalTasks: 0,
                    completedTasks: 0,
                    totalGoals: 0,
                    totalReminders: 0,
                    highPriorityCount: 0,
                    completionRate: 0,
                    isOverbooked: false,
                    totalEstimatedMinutes: 0,
                    habitCount: 0,
                    completedHabitCount: 0,
                });
            }
            return statsMap.get(dateKey)!;
        };

        if (showTasks) {
            filteredTasks.forEach((task) => {
                const taskDate = task.scheduledStart || task.deadline;
                if (!taskDate) return;
                const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
                const dateKey = format(date, 'yyyy-MM-dd');
                const s = getOrCreate(dateKey);
                s.totalTasks++;
                if (task.status === 'done') s.completedTasks++;
                if (task.priority === 'high') s.highPriorityCount++;
                if (task.estimatedDuration) s.totalEstimatedMinutes += task.estimatedDuration;
                s.completionRate = s.totalTasks > 0 ? (s.completedTasks / s.totalTasks) * 100 : 0;
                s.isOverbooked = s.totalEstimatedMinutes > OVERBOOK_THRESHOLD_MINUTES;
            });
        }

        if (showGoals) {
            filteredGoals.forEach((goal) => {
                if (!goal.targetDate) return;
                const date = typeof goal.targetDate === 'string' ? parseISO(goal.targetDate) : goal.targetDate;
                const dateKey = format(date, 'yyyy-MM-dd');
                getOrCreate(dateKey).totalGoals++;
            });
        }

        if (showReminders) {
            filteredReminders.forEach((reminder) => {
                if (!reminder.dueDate) return;
                const date = typeof reminder.dueDate === 'string' ? parseISO(reminder.dueDate) : reminder.dueDate;
                const dateKey = format(date, 'yyyy-MM-dd');
                getOrCreate(dateKey).totalReminders++;
            });
        }

        if (showHabits) {
            filteredHabits.forEach((habit) => {
                // daily habits show on every day; weekly on the "created" weekday
                const eachDay = habit.frequency === 'daily';
                // We accumulate habit slots for current visible range; simplified: just mark them per today basis
                // We tag each habit on all days for daily, or specific weekday for weekly
                // For the stats map, we'll do it during render per-day instead
                // (handled in getHabitsForDate below)
            });
        }

        return statsMap;
    }, [filteredTasks, filteredGoals, filteredReminders, showTasks, showGoals, showReminders, showHabits, filteredHabits]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getHabitsForDate = (date: Date) => {
        if (!showHabits) return [];
        return filteredHabits.filter((habit) => {
            if (habit.frequency === 'daily') return true;
            if (habit.frequency === 'weekly') {
                const created = typeof habit.createdAt === 'string' ? parseISO(habit.createdAt) : habit.createdAt;
                return created.getDay() === date.getDay();
            }
            return false;
        });
    };

    const isHabitCompletedOnDate = (habit: (typeof habits)[0], date: Date) =>
        habit.completedDates.some((d) => isSameDay(typeof d === 'string' ? parseISO(d as string) : new Date(d), date));

    const getDateItems = (date: Date | null) => {
        if (!date) return { tasks: [], goals: [], reminders: [], habits: [], timeEntries: [] };
        const dateTasks = filteredTasks.filter((task) => {
            const taskDate = task.scheduledStart || task.deadline;
            if (!taskDate) return false;
            const d = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
            return isSameDay(d, date);
        });
        const dateGoals = filteredGoals.filter((goal) => {
            if (!goal.targetDate) return false;
            const d = typeof goal.targetDate === 'string' ? parseISO(goal.targetDate) : goal.targetDate;
            return isSameDay(d, date);
        });
        const dateReminders = filteredReminders.filter((reminder) => {
            if (!reminder.dueDate) return false;
            const d = typeof reminder.dueDate === 'string' ? parseISO(reminder.dueDate) : reminder.dueDate;
            return isSameDay(d, date);
        });
        const dateTimeEntries = filteredTimeEntries.filter((entry) => {
            const d = typeof entry.startTime === 'string' ? parseISO(entry.startTime) : entry.startTime;
            return isSameDay(d, date);
        });
        return { tasks: dateTasks, goals: dateGoals, reminders: dateReminders, habits: getHabitsForDate(date), timeEntries: dateTimeEntries };
    };

    const getDayColor = (date: Date): string => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const stats = dayStatsMap.get(dateKey);
        if (!stats || (stats.totalTasks === 0 && stats.totalGoals === 0 && stats.totalReminders === 0)) return 'transparent';
        const totalItems = stats.totalTasks + stats.totalGoals + stats.totalReminders;
        const intensity = Math.min(totalItems / 8, 1);
        if (stats.isOverbooked) return `rgba(239, 68, 68, ${0.08 + intensity * 0.12})`;
        if (stats.completionRate === 100) return `rgba(16, 185, 129, ${0.1 + intensity * 0.2})`;
        if (stats.completionRate >= 50) return `rgba(59, 130, 246, ${0.1 + intensity * 0.2})`;
        return `rgba(245, 158, 11, ${0.1 + intensity * 0.2})`;
    };

    // ── Productivity streak ───────────────────────────────────────────────────
    const productivityStreak = useMemo(() => {
        let streak = 0;
        let currentDate2 = new Date();
        while (streak <= 30) {
            const dateKey = format(currentDate2, 'yyyy-MM-dd');
            const stats = dayStatsMap.get(dateKey);
            if (!stats || stats.completionRate < 50) break;
            streak++;
            currentDate2 = subDays(currentDate2, 1);
        }
        return streak;
    }, [dayStatsMap]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const navigatePrev = () => {
        if (viewMode === 'month') {
            setCurrentDate(subMonths(currentDate, 1));
        } else if (viewMode === 'week') {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            const nextDay = subDays(currentDate, 1);
            setCurrentDate(nextDay);
            setSelectedDate(nextDay);
        }
    };
    const navigateNext = () => {
        if (viewMode === 'month') {
            setCurrentDate(addMonths(currentDate, 1));
        } else if (viewMode === 'week') {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            const nextDay = addDays(currentDate, 1);
            setCurrentDate(nextDay);
            setSelectedDate(nextDay);
        }
    };
    const navigateTitle = () => {
        if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
        if (viewMode === 'week') {
            const ws = startOfWeek(currentDate);
            const we = endOfWeek(currentDate);
            return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
        }
        return format(currentDate, 'EEEE, MMMM d, yyyy');
    };

    const handleToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    // ── Double-click quick add ────────────────────────────────────────────────
    const handleDayClick = (day: Date) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const now = Date.now();
        if (lastClickRef.current && lastClickRef.current.date === dayKey && now - lastClickRef.current.time < 400) {
            // Double-click
            setQuickAddDate(day);
            setQuickAddTitle('');
            setQuickAddType('task');
            setQuickAddOpen(true);
            lastClickRef.current = null;
        } else {
            lastClickRef.current = { date: dayKey, time: now };
            setSelectedDate(day);
        }
    };

    // ── Quick-add submit ──────────────────────────────────────────────────────
    const handleQuickAddSubmit = async () => {
        if (!quickAddTitle.trim() || !quickAddDate || !userId) return;
        setQuickAddLoading(true);
        try {
            if (quickAddType === 'task') {
                await addTask({
                    title: quickAddTitle.trim(),
                    status: 'todo',
                    priority: 'medium',
                    deadline: quickAddDate,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            } else if (quickAddType === 'goal') {
                await addGoal({
                    title: quickAddTitle.trim(),
                    progress: 0,
                    milestones: [],
                    targetDate: quickAddDate,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            } else {
                await addReminder({
                    title: quickAddTitle.trim(),
                    dueDate: quickAddDate,
                    completed: false,
                    createdAt: new Date(),
                });
            }
            setQuickAddOpen(false);
            setQuickAddTitle('');
        } finally {
            setQuickAddLoading(false);
        }
    };

    // ── Rollover incomplete tasks ──────────────────────────────────────────────
    const getRolloverTasks = (date: Date) => {
        if (!date || !isPast(endOfDay(date)) || isToday(date)) return [];
        return filteredTasks.filter((task) => {
            const taskDate = task.scheduledStart || task.deadline;
            if (!taskDate) return false;
            const d = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
            return isSameDay(d, date) && (task.status === 'todo' || task.status === 'in-progress');
        });
    };

    const handleRollover = async (date: Date) => {
        const today = new Date();
        const incomplete = getRolloverTasks(date);
        for (const task of incomplete) {
            await updateTask(task.id, {
                deadline: today,
                scheduledStart: task.scheduledStart ? today : undefined,
            });
        }
        setSelectedDate(today);
    };

    // ── Calendar days ────────────────────────────────────────────────────────
    const monthDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const weekDays = useMemo(() => {
        const start = startOfWeek(currentDate);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [currentDate]);

    const selectedDateItems = getDateItems(selectedDate);
    const rolloverTasks = selectedDate ? getRolloverTasks(selectedDate) : [];

    // ── Task position in day/week view ────────────────────────────────────────
    const getTaskPosition = (task: (typeof tasks)[0]) => {
        const start = task.scheduledStart
            ? typeof task.scheduledStart === 'string' ? parseISO(task.scheduledStart) : task.scheduledStart
            : null;
        if (!start) return null;
        const topPercent = ((getHours(start) * 60 + getMinutes(start)) / (24 * 60)) * 100;
        const durPct = task.estimatedDuration ? Math.max((task.estimatedDuration / (24 * 60)) * 100, 2) : 2;
        return { top: topPercent, height: durPct };
    };

    // ── Render day cell (month view) ──────────────────────────────────────────
    const renderMonthDayCell = (day: Date, index: number) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const stats = dayStatsMap.get(dateKey);
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isTodayDate = isToday(day);
        const dateTimeEntries = filteredTimeEntries.filter((entry) => {
            const d = typeof entry.startTime === 'string' ? parseISO(entry.startTime) : entry.startTime;
            return isSameDay(d, day);
        });
        const totalItems = (stats ? (stats.totalTasks + stats.totalGoals + stats.totalReminders) : 0) + (showTimeEntries ? dateTimeEntries.length : 0);
        const dayHabits = getHabitsForDate(day);

        return (
            <motion.button
                key={index}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleDayClick(day)}
                title="Click to select · Double-click to add"
                className={cn(
                    'relative h-20 rounded-2xl transition-all duration-200 group border text-left',
                    isSelected && 'ring-2 ring-primary shadow-lg shadow-primary/20 border-primary',
                    isTodayDate && !isSelected && 'ring-1 ring-primary/30 border-primary/30',
                    !isCurrentMonth && 'opacity-25',
                    isCurrentMonth && 'hover:bg-primary/10 border-primary/10',
                    stats?.isOverbooked && 'border-red-500/30'
                )}
                style={{ backgroundColor: isSelected ? 'rgba(var(--primary), 0.1)' : getDayColor(day) }}
            >
                <div className="flex flex-col h-full p-1.5">
                    <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                            'text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full',
                            isSelected && 'bg-primary text-primary-foreground',
                            isTodayDate && !isSelected && 'text-primary',
                            !isCurrentMonth && 'text-muted-foreground'
                        )}>
                            {format(day, 'd')}
                        </span>
                        <div className="flex items-center gap-0.5">
                            {(stats?.highPriorityCount ?? 0) > 0 && (
                                <Zap className="h-2.5 w-2.5 text-red-500 fill-current" />
                            )}
                            {stats?.isOverbooked && (
                                <AlertCircle className="h-2.5 w-2.5 text-red-400" />
                            )}
                            {totalItems > 0 && (
                                <span className="text-[9px] font-black text-muted-foreground/60">{totalItems}</span>
                            )}
                        </div>
                    </div>

                    {/* Event dots */}
                    <div className="flex items-center gap-0.5 flex-wrap mt-auto">
                        {(stats?.totalTasks ?? 0) > 0 && showTasks && (
                            <div className={cn('w-1.5 h-1.5 rounded-full', (stats?.completionRate ?? 0) === 100 ? 'bg-emerald-500' : 'bg-blue-500')} />
                        )}
                        {(stats?.totalGoals ?? 0) > 0 && showGoals && (
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        )}
                        {(stats?.totalReminders ?? 0) > 0 && showReminders && (
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                        )}
                        {showTimeEntries && dateTimeEntries.length > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-1 ring-emerald-400/40" />
                        )}
                        {/* Habit dots */}
                        {dayHabits.slice(0, 3).map((habit) => (
                            <div
                                key={habit.id}
                                className={cn(
                                    'w-1.5 h-1.5 rounded-full transition-all',
                                    isHabitCompletedOnDate(habit, day)
                                        ? 'bg-emerald-400 ring-1 ring-emerald-400/40'
                                        : 'bg-orange-400/60'
                                )}
                            />
                        ))}
                        {dayHabits.length > 3 && (
                            <span className="text-[8px] text-muted-foreground/40">+{dayHabits.length - 3}</span>
                        )}
                    </div>
                </div>
            </motion.button>
        );
    };

    // ── Week view ─────────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const rowHeight = 88; // 88px per hour
        const totalHeight = visibleHours.length * rowHeight;

        return (
            <div className="overflow-auto custom-scrollbar" style={{ maxHeight: '65vh' }}>
                {/* Header row (Sticky) */}
                <div className="grid grid-cols-8 gap-1 mb-2 sticky top-0 z-10 bg-background/80 backdrop-blur-xl pb-2">
                    <div className="col-span-1" />
                    {weekDays.map((day) => (
                        <button
                            key={day.toISOString()}
                            onClick={() => { setSelectedDate(day); setViewMode('day'); setCurrentDate(day); }}
                            className={cn(
                                'col-span-1 py-2 rounded-xl text-center transition-all hover:bg-primary/10',
                                isToday(day) && 'bg-primary/10 ring-1 ring-primary/30'
                            )}
                        >
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                                {format(day, 'EEE')}
                            </p>
                            <p className={cn('text-lg font-black', isToday(day) && 'text-primary')}>
                                {format(day, 'd')}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Time grid canvas */}
                <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
                    {/* Hour Rows & Gridlines */}
                    {visibleHours.map((hour, hourIdx) => (
                        <div
                            key={hour}
                            className="absolute left-0 right-0 border-t border-primary/5 grid grid-cols-8 transition-colors"
                            style={{
                                top: `${hourIdx * rowHeight}px`,
                                height: `${rowHeight}px`,
                            }}
                        >
                            <div className="col-span-1 text-[9px] font-black text-muted-foreground/40 pt-2 text-right pr-3">
                                {format(addHours(startOfDay(currentDate), hour), 'h:mm a')}
                            </div>
                            <div className="col-span-7 border-l border-primary/5 grid grid-cols-7 gap-px h-full">
                                {weekDays.map((day, dIdx) => {
                                    const isSleep = getSleepEntryForTime(day, hour);
                                    return (
                                        <div
                                            key={dIdx}
                                            className={cn(
                                                "border-r border-primary/5 h-full relative transition-colors",
                                                isToday(day) && "bg-primary/[0.01]",
                                                isSleep && "bg-indigo-500/10 bg-[linear-gradient(45deg,rgba(99,102,241,0.05)_25%,transparent_25%,transparent_50%,rgba(99,102,241,0.05)_50%,rgba(99,102,241,0.05)_75%,transparent_75%,transparent)] bg-[size:16px_16px] border-indigo-500/5"
                                            )}
                                            title={isSleep ? "Asleep (Sleep Log)" : undefined}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Events Canvas (Overlay) */}
                    <div className="absolute left-[12.5%] right-0 top-0 bottom-0 pointer-events-none p-1">
                        {/* Red line for current time indicator */}
                        {weekDays.some(day => isToday(day)) && (() => {
                            const now = new Date();
                            const nowHour = now.getHours();
                            const nowMinutes = now.getMinutes();
                            const todayIndex = weekDays.findIndex(day => isToday(day));
                            
                            if (todayIndex !== -1) {
                                const nowHourIdx = visibleHours.indexOf(nowHour);
                                if (nowHourIdx !== -1) {
                                    const currentTop = nowHourIdx * rowHeight + (nowMinutes / 60) * rowHeight;
                                    const dayLeft = (todayIndex / 7) * 100;
                                    const dayWidth = (1 / 7) * 100;
                                    return (
                                        <div
                                            className="absolute flex items-center z-10 pointer-events-none"
                                            style={{
                                                top: `${currentTop}px`,
                                                left: `${dayLeft}%`,
                                                width: `${dayWidth}%`,
                                            }}
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0 animate-pulse" />
                                            <div className="flex-1 h-0.5 bg-red-500" />
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}
                        {weekDays.map((day, dayIndex) => {
                            const dayTasks = filteredTasks.filter((t) => {
                                const ts = t.scheduledStart || t.deadline;
                                if (!ts) return false;
                                const d = typeof ts === 'string' ? parseISO(ts) : ts;
                                return isSameDay(d, day);
                            });

                            const dayEntries = showTimeEntries ? filteredTimeEntries.filter((e) => {
                                const ts = e.startTime;
                                if (!ts) return false;
                                const d = typeof ts === 'string' ? parseISO(ts) : ts;
                                return isSameDay(d, day);
                            }) : [];

                            const events = layoutEvents(dayTasks, dayEntries, day);
                            const dayLeft = (dayIndex / 7) * 100;
                            const dayWidth = (1 / 7) * 100;

                            return (
                                <div
                                    key={day.toISOString()}
                                    className="absolute top-0 bottom-0 pointer-events-auto"
                                    style={{
                                        left: `${dayLeft}%`,
                                        width: `${dayWidth}%`,
                                    }}
                                    onClick={() => {
                                        setSelectedDate(day);
                                        setQuickAddDate(day);
                                    }}
                                >
                                    {events.map((event) => {
                                        const start = event.start;
                                        const hour = getHours(start);
                                        const minute = getMinutes(start);
                                        
                                        const startHourIdx = visibleHours.indexOf(hour);
                                        if (startHourIdx === -1) return null;

                                        // Calculate position based on start time and duration
                                        const top = startHourIdx * rowHeight + (minute / 60) * rowHeight;
                                        const height = (event.duration / 60) * rowHeight;

                                        const leftPercent = (event.colIndex / event.totalCols) * 100;
                                        const widthPercent = (1 / event.totalCols) * 100;

                                        if (event.type === 'task') {
                                            const task = event.original as any;
                                            return (
                                                <motion.div
                                                    key={event.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className={cn(
                                                        'absolute p-1 sm:p-2 rounded-xl text-[8px] sm:text-[10px] font-bold border transition-all pointer-events-auto cursor-pointer hover:shadow-md hover:scale-[1.02] overflow-hidden',
                                                        task.status === 'done'
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 line-through opacity-60'
                                                            : task.priority === 'high'
                                                            ? 'bg-red-500/10 border-red-500/20 text-foreground hover:bg-red-500/20'
                                                            : 'bg-blue-500/10 border-blue-500/20 text-foreground hover:bg-blue-500/20'
                                                    )}
                                                    style={{
                                                        top: `${top + 1}px`,
                                                        height: `${Math.max(height - 2, 24)}px`,
                                                        left: `calc(${leftPercent}% + 1px)`,
                                                        width: `calc(${widthPercent}% - 2px)`,
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (hideTimeoutRef.current) {
                                                            clearTimeout(hideTimeoutRef.current);
                                                            hideTimeoutRef.current = null;
                                                        }
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setHoveredEvent({
                                                            id: event.id,
                                                            type: 'task',
                                                            title: task.title,
                                                            start: event.start,
                                                            duration: event.duration,
                                                            status: task.status,
                                                            priority: task.priority,
                                                            notes: task.notes || task.description,
                                                            rect
                                                        });
                                                    }}
                                                    onMouseLeave={() => {
                                                        hideTimeoutRef.current = setTimeout(() => {
                                                            setHoveredEvent(null);
                                                        }, 400);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDate(day);
                                                        setClickedEvent({ ...event, original: task });
                                                    }}
                                                >
                                                    <div className="flex flex-col h-full justify-between overflow-hidden">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            {task.status === 'done' ? (
                                                                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                                            ) : task.status === 'in-progress' ? (
                                                                <Clock className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                                                            ) : (
                                                                <Circle className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                                            )}
                                                            <span className="truncate flex-1 leading-none">{task.title}</span>
                                                        </div>
                                                        {height >= 48 && (
                                                            <div className="text-[7px] opacity-40 font-black uppercase tracking-widest mt-0.5">
                                                                {task.estimatedDuration || 60}m
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        } else {
                                            const entry = event.original as any;
                                            return (
                                                <motion.div
                                                    key={event.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="absolute p-1 sm:p-2 rounded-xl text-[8px] sm:text-[10px] font-bold border transition-all pointer-events-auto cursor-pointer bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-md hover:scale-[1.02] overflow-hidden"
                                                    style={{
                                                        top: `${top + 1}px`,
                                                        height: `${Math.max(height - 2, 16)}px`, // Lower min-height from 24px to 16px to reflect short durations beautifully
                                                        left: `calc(${leftPercent}% + 1px)`,
                                                        width: `calc(${widthPercent}% - 2px)`,
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (hideTimeoutRef.current) {
                                                            clearTimeout(hideTimeoutRef.current);
                                                            hideTimeoutRef.current = null;
                                                        }
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setHoveredEvent({
                                                            id: event.id,
                                                            type: 'entry',
                                                            title: entry.category,
                                                            start: event.start,
                                                            duration: event.duration,
                                                            status: event.status,
                                                            notes: entry.notes || entry.description,
                                                            rect
                                                        });
                                                    }}
                                                    onMouseLeave={() => {
                                                        hideTimeoutRef.current = setTimeout(() => {
                                                            setHoveredEvent(null);
                                                        }, 400);
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedDate(day);
                                                        setClickedEvent({ ...event, original: entry });
                                                    }}
                                                >
                                                    <div className="flex flex-col h-full justify-between overflow-hidden">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <Clock className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                                                            <span className="truncate flex-1 leading-none">{entry.category}</span>
                                                        </div>
                                                        {height >= 32 && (
                                                            <div className="text-[7px] opacity-75 shrink-0 bg-emerald-500/20 px-1 rounded-sm w-max mt-0.5 font-black uppercase tracking-widest leading-none">
                                                                {entry.duration > 0 ? (
                                                                    `${Math.floor(entry.duration / 60)}h${entry.duration % 60 > 0 ? `${entry.duration % 60}m` : ''}`
                                                                ) : (
                                                                    '< 1m'
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        }
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // Helper to calculate column placement for overlapping events in day/week views
    const layoutEvents = (dayTasks: typeof tasks, dayEntries: typeof timeEntries, targetDate: Date) => {
        const events = [
            ...dayTasks.map(t => ({
                id: t.id,
                type: 'task',
                title: t.title,
                priority: t.priority,
                status: t.status,
                start: typeof t.scheduledStart === 'string' ? parseISO(t.scheduledStart) : t.scheduledStart || t.deadline || new Date(),
                duration: t.estimatedDuration || 60,
                original: t,
                colIndex: 0,
                totalCols: 1
            })),
            ...dayEntries.map(e => {
                const calculatedDuration = e.isRunning
                    ? Math.floor((new Date().getTime() - new Date(e.startTime).getTime()) / 60000)
                    : e.duration || 0;
                return {
                    id: e.id,
                    type: 'entry',
                    title: e.category,
                    priority: 'normal',
                    status: e.isRunning ? 'in-progress' : 'done',
                    start: typeof e.startTime === 'string' ? parseISO(e.startTime) : e.startTime,
                    duration: Math.max(calculatedDuration, 1), // Minimum 1 minute layout duration
                    original: {
                        ...e,
                        duration: calculatedDuration
                    },
                    colIndex: 0,
                    totalCols: 1
                };
            })
        ].filter(ev => ev.start && isSameDay(ev.start, targetDate));

        // Sort by start time, then duration descending
        events.sort((a, b) => a.start.getTime() - b.start.getTime() || b.duration - a.duration);

        // Simple greedy column assignment
        const columns: typeof events[] = [];
        events.forEach(event => {
            let colIndex = 0;
            while (colIndex < columns.length) {
                // Check if event overlaps with any event in this column
                const hasOverlap = columns[colIndex].some(placedEvent => {
                    const placedStart = placedEvent.start.getTime();
                    const placedEnd = placedStart + placedEvent.duration * 60 * 1000;
                    const eventStart = event.start.getTime();
                    const eventEnd = eventStart + event.duration * 60 * 1000;
                    return eventStart < placedEnd && eventEnd > placedStart;
                });
                if (!hasOverlap) {
                    break;
                }
                colIndex++;
            }
            if (colIndex >= columns.length) {
                columns.push([]);
            }
            columns[colIndex].push(event);
            event.colIndex = colIndex;
        });

        // Compute total overlapping columns in the cluster to allocate width
        events.forEach(event => {
            let maxCol = event.colIndex;
            events.forEach(other => {
                if (other.id === event.id) return;
                const aStart = event.start.getTime();
                const aEnd = aStart + event.duration * 60 * 1000;
                const bStart = other.start.getTime();
                const bEnd = bStart + other.duration * 60 * 1000;
                const overlap = aStart < bEnd && aEnd > bStart;
                if (overlap) {
                    maxCol = Math.max(maxCol, other.colIndex);
                }
            });
            event.totalCols = maxCol + 1;
        });

        return events;
    };

    // ── Day view ──────────────────────────────────────────────────────────────
    const renderDayView = () => {
        const dayTasks = filteredTasks.filter((t) => {
            const ts = t.scheduledStart || t.deadline;
            if (!ts) return false;
            const d = typeof ts === 'string' ? parseISO(ts) : ts;
            return isSameDay(d, currentDate);
        });

        const dayEntries = showTimeEntries ? filteredTimeEntries.filter((e) => {
            const ts = e.startTime;
            if (!ts) return false;
            const d = typeof ts === 'string' ? parseISO(ts) : ts;
            return isSameDay(d, currentDate);
        }) : [];

        const rowHeight = 88; // 88px per hour
        const totalHeight = visibleHours.length * rowHeight;

        // Compute layout columns for overlapping items
        const events = layoutEvents(dayTasks, dayEntries, currentDate);

        return (
            <div className="overflow-auto custom-scrollbar" style={{ maxHeight: '65vh' }}>
                <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
                    {/* Hour Rows & Gridlines */}
                    {visibleHours.map((hour, hourIdx) => {
                        const isCurrentHour = isToday(currentDate) && new Date().getHours() === hour;
                        return (
                            <div
                                key={hour}
                                className={cn(
                                    'absolute left-0 right-0 border-t border-primary/5 flex gap-4 transition-colors',
                                    isCurrentHour && 'bg-primary/5'
                                )}
                                style={{
                                    top: `${hourIdx * rowHeight}px`,
                                    height: `${rowHeight}px`,
                                }}
                            >
                                <div className="w-14 shrink-0 text-[9px] font-black text-muted-foreground/40 pt-2 text-right pr-2">
                                    {format(addHours(startOfDay(currentDate), hour), 'h:mm a')}
                                </div>
                                {(() => {
                                    const isSleep = getSleepEntryForTime(currentDate, hour);
                                    return (
                                        <div
                                            className={cn(
                                                "flex-1 border-l border-primary/5 transition-colors relative cursor-pointer hover:bg-primary/[0.02]",
                                                isSleep && "bg-indigo-500/10 bg-[linear-gradient(45deg,rgba(99,102,241,0.05)_25%,transparent_25%,transparent_50%,rgba(99,102,241,0.05)_50%,rgba(99,102,241,0.05)_75%,transparent_75%,transparent)] bg-[size:16px_16px] border-indigo-500/5"
                                            )}
                                            title={isSleep ? "Asleep (Sleep Log)" : undefined}
                                            onClick={() => handleDayClick(currentDate)}
                                        />
                                    );
                                })()}
                            </div>
                        );
                    })}

                    {/* Red line for current time indicator */}
                    {isToday(currentDate) && (() => {
                        const now = new Date();
                        const nowHour = now.getHours();
                        const nowMinutes = now.getMinutes();
                        const nowHourIdx = visibleHours.indexOf(nowHour);
                        if (nowHourIdx !== -1) {
                            const currentTop = nowHourIdx * rowHeight + (nowMinutes / 60) * rowHeight;
                            return (
                                <div
                                    className="absolute left-[72px] right-0 flex items-center z-10 pointer-events-none"
                                    style={{ top: `${currentTop}px` }}
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                                    <div className="flex-1 h-0.5 bg-red-500/50" />
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {/* Events Canvas (Overlay) */}
                    <div className="absolute left-[72px] right-0 top-0 bottom-0 pointer-events-none p-1">
                        {events.map((event) => {
                            const start = event.start;
                            const hour = getHours(start);
                            const minute = getMinutes(start);
                            
                            const startHourIdx = visibleHours.indexOf(hour);
                            if (startHourIdx === -1) return null;

                            // Calculate position based on start time and duration
                            const top = startHourIdx * rowHeight + (minute / 60) * rowHeight;
                            const height = (event.duration / 60) * rowHeight;

                            const leftPercent = (event.colIndex / event.totalCols) * 100;
                            const widthPercent = (1 / event.totalCols) * 100;

                            if (event.type === 'task') {
                                const task = event.original as any;
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={cn(
                                            'absolute p-3 rounded-2xl text-xs font-bold border transition-all pointer-events-auto cursor-pointer hover:shadow-lg',
                                            task.status === 'done'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 line-through opacity-60'
                                                : task.priority === 'high'
                                                ? 'bg-red-500/10 border-red-500/20 text-foreground hover:bg-red-500/20'
                                                : 'bg-blue-500/10 border-blue-500/20 text-foreground hover:bg-blue-500/20'
                                        )}
                                        style={{
                                            top: `${top + 2}px`,
                                            height: `${Math.max(height - 4, 36)}px`,
                                            left: `calc(${leftPercent}% + 2px)`,
                                            width: `calc(${widthPercent}% - 4px)`,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (hideTimeoutRef.current) {
                                                clearTimeout(hideTimeoutRef.current);
                                                hideTimeoutRef.current = null;
                                            }
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setHoveredEvent({
                                                id: event.id,
                                                type: 'task',
                                                title: task.title,
                                                start: event.start,
                                                duration: event.duration,
                                                status: task.status,
                                                priority: task.priority,
                                                notes: task.notes || task.description,
                                                rect
                                            });
                                        }}
                                        onMouseLeave={() => {
                                            hideTimeoutRef.current = setTimeout(() => {
                                                setHoveredEvent(null);
                                            }, 400);
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDate(currentDate);
                                            setClickedEvent({ ...event, original: task });
                                        }}
                                    >
                                        <div className="flex flex-col h-full justify-between overflow-hidden">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {task.status === 'done' ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                ) : task.status === 'in-progress' ? (
                                                    <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0 animate-pulse" />
                                                ) : (
                                                    <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                )}
                                                <span className="truncate flex-1">{task.title}</span>
                                                {task.priority === 'high' && (
                                                    <Zap className="h-3.5 w-3.5 text-red-400 fill-current shrink-0" />
                                                )}
                                            </div>
                                            {height >= 50 && (
                                                <div className="text-[9px] opacity-40 font-black uppercase tracking-widest mt-1">
                                                    {format(start, 'h:mm a')} · {task.estimatedDuration || 60}m
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            } else {
                                const entry = event.original as any;
                                return (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute p-3 rounded-2xl text-xs font-bold border transition-all pointer-events-auto cursor-pointer bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:shadow-lg overflow-hidden"
                                        style={{
                                            top: `${top + 2}px`,
                                            height: `${Math.max(height - 4, 20)}px`, // Lower min-height from 36px to 20px to reflect short durations beautifully
                                            left: `calc(${leftPercent}% + 2px)`,
                                            width: `calc(${widthPercent}% - 4px)`,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (hideTimeoutRef.current) {
                                                clearTimeout(hideTimeoutRef.current);
                                                hideTimeoutRef.current = null;
                                            }
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setHoveredEvent({
                                                id: event.id,
                                                type: 'entry',
                                                title: entry.category,
                                                start: event.start,
                                                duration: event.duration,
                                                status: event.status,
                                                notes: entry.notes || entry.description,
                                                rect
                                            });
                                        }}
                                        onMouseLeave={() => {
                                            hideTimeoutRef.current = setTimeout(() => {
                                                setHoveredEvent(null);
                                            }, 400);
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDate(currentDate);
                                            setClickedEvent({ ...event, original: entry });
                                        }}
                                    >
                                        <div className="flex flex-col h-full justify-between overflow-hidden">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                                <span className="truncate flex-1">{entry.category}</span>
                                            </div>
                                            {height >= 36 && (
                                                <div className="text-[9px] opacity-75 shrink-0 bg-emerald-500/20 px-1.5 py-0.5 rounded-md w-max mt-1 font-black uppercase tracking-widest">
                                                    Audited: {entry.duration > 0 ? (
                                                        `${Math.floor(entry.duration / 60)}h${entry.duration % 60 > 0 ? `${entry.duration % 60}m` : ''}`
                                                    ) : (
                                                        '< 1m'
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            }
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // ── Side panel ─────────────────────────────────────────────────────────────
    const renderSidePanel = () => {
        const dateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
        const stats = dateKey ? dayStatsMap.get(dateKey) : null;
        const totalEstHours = stats ? Math.round((stats.totalEstimatedMinutes / 60) * 10) / 10 : 0;

        return (
            <Card className="p-6 border-none bg-background/60 backdrop-blur-2xl shadow-2xl rounded-[3rem] overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black italic tracking-tight">
                        {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select a Date'}
                    </h3>
                    {selectedDate && (
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black">
                                {selectedDateItems.tasks.length + selectedDateItems.goals.length + selectedDateItems.reminders.length + (showTimeEntries ? selectedDateItems.timeEntries.length : 0)} items
                            </Badge>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-xl hover:bg-primary/10"
                                onClick={() => {
                                    setQuickAddDate(selectedDate);
                                    setQuickAddOpen(true);
                                }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Overbooked warning */}
                {stats?.isOverbooked && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
                    >
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Overbooked</p>
                            <p className="text-[9px] text-red-400/70">{totalEstHours}h of tasks scheduled (limit: 6h)</p>
                        </div>
                    </motion.div>
                )}

                {/* Rollover button */}
                {rolloverTasks.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => selectedDate && handleRollover(selectedDate)}
                            className="w-full h-9 rounded-xl border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10 text-[10px] font-black uppercase tracking-widest gap-2"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Move {rolloverTasks.length} incomplete to today
                        </Button>
                    </motion.div>
                )}

                <div className="space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                    {selectedDate ? (
                        <>
                            {/* Habits section */}
                            {selectedDateItems.habits.length > 0 && showHabits && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Repeat className="h-4 w-4 text-orange-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            Routines ({selectedDateItems.habits.length})
                                        </span>
                                    </div>
                                    {selectedDateItems.habits.map((habit) => {
                                        const done = isHabitCompletedOnDate(habit, selectedDate);
                                        return (
                                            <button
                                                key={habit.id}
                                                onClick={() => toggleHabitCompletion(habit.id, selectedDate)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01]',
                                                    done
                                                        ? 'bg-emerald-500/10 border-emerald-500/20'
                                                        : 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10'
                                                )}
                                            >
                                                {done ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <Circle className="h-4 w-4 text-orange-400/60 shrink-0" />
                                                )}
                                                <span className={cn('text-xs font-bold flex-1 text-left truncate', done && 'line-through opacity-60')}>
                                                    {habit.title}
                                                </span>
                                                {habit.streak > 0 && (
                                                    <div className="flex items-center gap-0.5">
                                                        <Flame className="h-3 w-3 text-orange-400" />
                                                        <span className="text-[9px] font-black text-orange-400">{habit.streak}</span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Tasks */}
                            {selectedDateItems.tasks.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckSquare className="h-4 w-4 text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            Operations ({selectedDateItems.tasks.length})
                                        </span>
                                    </div>
                                    {selectedDateItems.tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-background/40 hover:bg-background/60 transition-colors border border-primary/5"
                                        >
                                            {task.status === 'done' ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                            ) : task.status === 'in-progress' ? (
                                                <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                            ) : (
                                                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={cn('text-xs font-bold truncate', task.status === 'done' && 'line-through opacity-50')}>
                                                    {task.title}
                                                </p>
                                                {task.estimatedDuration && (
                                                    <p className="text-[9px] text-muted-foreground">
                                                        {Math.floor(task.estimatedDuration / 60)}h {task.estimatedDuration % 60}m est.
                                                    </p>
                                                )}
                                            </div>
                                            {task.priority === 'high' && (
                                                <Zap className="h-3 w-3 text-red-500 fill-current flex-shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Goals */}
                            {selectedDateItems.goals.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target className="h-4 w-4 text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            Targets ({selectedDateItems.goals.length})
                                        </span>
                                    </div>
                                    {selectedDateItems.goals.map((goal) => (
                                        <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                            <Target className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                            <p className="text-xs font-bold flex-1 truncate">{goal.title}</p>
                                            <div className="w-12 h-1.5 rounded-full bg-emerald-500/10 overflow-hidden">
                                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${goal.progress}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reminders */}
                            {selectedDateItems.reminders.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Bell className="h-4 w-4 text-pink-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            Alerts ({selectedDateItems.reminders.length})
                                        </span>
                                    </div>
                                    {selectedDateItems.reminders.map((reminder) => (
                                        <div key={reminder.id} className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/5 border border-pink-500/20">
                                            <Bell className="h-4 w-4 text-pink-500 flex-shrink-0" />
                                            <p className="text-xs font-bold flex-1 truncate">{reminder.title}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Time Loggings */}
                            {selectedDateItems.timeEntries.length > 0 && showTimeEntries && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="h-4 w-4 text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            Time Logs ({selectedDateItems.timeEntries.length})
                                        </span>
                                    </div>
                                    {selectedDateItems.timeEntries.map((entry) => (
                                        <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                            <Clock className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{entry.category}</p>
                                                <p className="text-[9px] text-muted-foreground">
                                                    {format(typeof entry.startTime === 'string' ? parseISO(entry.startTime) : entry.startTime, 'h:mm a')}
                                                </p>
                                            </div>
                                            {(() => {
                                                const d = entry.isRunning
                                                    ? Math.floor((new Date().getTime() - new Date(entry.startTime).getTime()) / 60000)
                                                    : entry.duration;
                                                return (d !== undefined && d !== null) ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black shrink-0">
                                                        {d > 0 ? (
                                                            `${Math.floor(d / 60)}h${d % 60 > 0 ? ` ${d % 60}m` : ''}`
                                                        ) : (
                                                            '< 1m'
                                                        )}
                                                    </Badge>
                                                ) : null;
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedDateItems.tasks.length === 0 &&
                                selectedDateItems.goals.length === 0 &&
                                selectedDateItems.reminders.length === 0 &&
                                selectedDateItems.habits.length === 0 &&
                                (!showTimeEntries || selectedDateItems.timeEntries.length === 0) && (
                                    <div className="text-center py-10 opacity-40">
                                        <CalendarIcon className="h-10 w-10 mx-auto mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No events</p>
                                        <p className="text-[9px] text-muted-foreground mt-1">Double-click the date to add</p>
                                    </div>
                                )}
                        </>
                    ) : (
                        <div className="text-center py-10 opacity-40">
                            <CalendarIcon className="h-10 w-10 mx-auto mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Select a date</p>
                            <p className="text-[9px] text-muted-foreground mt-1">Double-click to quick-add</p>
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="space-y-6 pb-12">

                        {/* Header */}
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between px-1">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-2 py-0 h-4">
                                        Event Matrix
                                    </Badge>
                                    {productivityStreak > 0 && (
                                        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px] font-black px-2">
                                            <Flame className="h-2.5 w-2.5 mr-1" />
                                            {productivityStreak} day streak
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                                    Global Event Matrix
                                </h1>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">
                                    Synthesizing multidimensional operational timelines
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* View Mode Switcher */}
                                <div className="flex items-center gap-1 p-1 rounded-xl bg-background/40 border border-primary/10">
                                    {([
                                        { mode: 'month', icon: LayoutGrid, label: 'Month' },
                                        { mode: 'week', icon: CalendarDays, label: 'Week' },
                                        { mode: 'day', icon: AlignJustify, label: 'Day' },
                                    ] as const).map(({ mode, icon: Icon, label }) => (
                                        <Button
                                            key={mode}
                                            size="sm"
                                            variant={viewMode === mode ? 'default' : 'ghost'}
                                            onClick={() => {
                                                setViewMode(mode);
                                                if (mode === 'day' && selectedDate) setCurrentDate(selectedDate);
                                            }}
                                            className={cn(
                                                'h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest gap-1.5 transition-all',
                                                viewMode !== mode && 'text-muted-foreground'
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleToday}
                                    className="h-10 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest bg-background/40 border-primary/10 shadow-sm transition-all hover:scale-105 active:scale-95"
                                >
                                    Today
                                </Button>
                                <Button
                                    size="icon"
                                    className="h-10 w-10 rounded-xl bg-primary shadow-lg shadow-primary/20"
                                    onClick={() => {
                                        setQuickAddDate(selectedDate || new Date());
                                        setQuickAddOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <Card className="px-1 sm:p-5 bg-background/60 backdrop-blur-2xl border-none shadow-2xl rounded-[2rem] overflow-hidden">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-4 sm:p-0">
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                                    <div className="h-8 w-8 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                                        <Filter className="h-4 w-4 text-primary" />
                                    </div>
                                    {[
                                        { key: 'tasks', label: 'Operations', icon: CheckSquare, state: showTasks, toggle: () => setShowTasks(!showTasks) },
                                        { key: 'goals', label: 'Targets', icon: Target, state: showGoals, toggle: () => setShowGoals(!showGoals) },
                                        { key: 'reminders', label: 'Alerts', icon: Bell, state: showReminders, toggle: () => setShowReminders(!showReminders) },
                                        { key: 'habits', label: 'Routines', icon: Repeat, state: showHabits, toggle: () => setShowHabits(!showHabits) },
                                        { key: 'timeEntries', label: 'Audits', icon: Clock, state: showTimeEntries, toggle: () => setShowTimeEntries(!showTimeEntries) },
                                    ].map(({ key, label, icon: Icon, state, toggle }) => (
                                        <Button
                                            key={key}
                                            variant={state ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={toggle}
                                            className={cn(
                                                'h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0',
                                                !state && 'bg-background/40 border-primary/10 text-muted-foreground'
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5 mr-2" />
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {(viewMode === 'week' || viewMode === 'day') && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Select value={timeFramePreset} onValueChange={setTimeFramePreset}>
                                                <SelectTrigger className="h-9 w-44 rounded-xl border-primary/10 bg-background/40 text-[10px] font-black uppercase tracking-widest text-left">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <SelectValue placeholder="Full Day (24h)" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl">
                                                    <SelectItem value="full">Full Day (24h)</SelectItem>
                                                    <SelectItem value="active">Active Day (6am - 10pm)</SelectItem>
                                                    <SelectItem value="work">Work Hours (9am - 5pm)</SelectItem>
                                                    <SelectItem value="morning">Morning (6am - 12pm)</SelectItem>
                                                    <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                                                    <SelectItem value="evening">Evening (5pm - 10pm)</SelectItem>
                                                    <SelectItem value="custom">Custom Range...</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {timeFramePreset === 'custom' && (
                                                <div className="flex items-center gap-1 border border-primary/10 bg-background/40 px-2 py-0.5 rounded-xl h-9 shrink-0">
                                                    <Select
                                                        value={customStartHour.toString()}
                                                        onValueChange={(val) => setCustomStartHour(parseInt(val))}
                                                    >
                                                        <SelectTrigger className="h-7 w-20 border-none bg-transparent p-0 text-[10px] font-black uppercase tracking-widest justify-center shadow-none focus:ring-0">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl max-h-48 overflow-y-auto">
                                                            {Array.from({ length: 24 }, (_, i) => (
                                                                <SelectItem key={i} value={i.toString()}>
                                                                    {format(addHours(startOfDay(new Date()), i), 'h a')}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <span className="text-[10px] font-black text-muted-foreground/40 shrink-0">to</span>
                                                    <Select
                                                        value={customEndHour.toString()}
                                                        onValueChange={(val) => setCustomEndHour(parseInt(val))}
                                                    >
                                                        <SelectTrigger className="h-7 w-20 border-none bg-transparent p-0 text-[10px] font-black uppercase tracking-widest justify-center shadow-none focus:ring-0">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl max-h-48 overflow-y-auto">
                                                            {Array.from({ length: 24 }, (_, i) => (
                                                                <SelectItem key={i} value={i.toString()}>
                                                                    {format(addHours(startOfDay(new Date()), i), 'h a')}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <Select value={selectedGoalFilter} onValueChange={setSelectedGoalFilter}>
                                        <SelectTrigger className="h-9 w-40 rounded-xl border-primary/10 bg-background/40 text-[10px] font-black uppercase tracking-widest shrink-0">
                                            <SelectValue placeholder="All Goals" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            <SelectItem value="all">All Goals</SelectItem>
                                            {goals.map((goal) => (
                                                <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </Card>

                        {/* Main Calendar Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="lg:col-span-2 p-6 border-none bg-background/60 backdrop-blur-2xl shadow-2xl rounded-[3rem] overflow-hidden">
                                {/* Calendar navigation */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={navigatePrev} className="h-9 w-9 rounded-xl hover:bg-primary/10">
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <h2 className="text-xl font-black italic tracking-tight min-w-[200px] text-center">
                                            {navigateTitle()}
                                        </h2>
                                        <Button variant="ghost" size="icon" onClick={navigateNext} className="h-9 w-9 rounded-xl hover:bg-primary/10">
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Done</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-blue-500">Active</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-red-400">Overbooked</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Month view */}
                                {viewMode === 'month' && (
                                    <>
                                        <div className="grid grid-cols-7 gap-2 mb-3">
                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                                <div key={day} className="h-8 flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-2">
                                            {monthDays.map((day, i) => renderMonthDayCell(day, i))}
                                        </div>
                                        <p className="text-center text-[9px] text-muted-foreground/30 font-black uppercase tracking-widest mt-4">
                                            Double-click a date to quick-add
                                        </p>
                                    </>
                                )}

                                {/* Week view */}
                                {viewMode === 'week' && renderWeekView()}

                                {/* Day view */}
                                {viewMode === 'day' && renderDayView()}
                            </Card>

                            {/* Side panel */}
                            {renderSidePanel()}
                        </div>

                        {/* Stats */}
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 px-1">
                            {[
                                { icon: TrendingUp, label: 'Deadlines', value: filteredTasks.filter(t => t.deadline).length, color: 'violet' },
                                { icon: Target, label: 'Targets', value: filteredGoals.filter(g => g.targetDate).length, color: 'emerald' },
                                { icon: Bell, label: 'Alerts', value: filteredReminders.length, color: 'pink' },
                                { icon: Flame, label: 'Day Streak', value: productivityStreak, color: 'orange' },
                            ].map(({ icon: Icon, label, value, color }) => (
                                <Card
                                    key={label}
                                    className={`relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-${color}-500/5 group`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-2xl bg-${color}-500/5 border border-${color}-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                                            <Icon className={`h-5 w-5 text-${color}-500`} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-black italic tabular-nums leading-none mb-1">{value}</p>
                                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{label}</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Quick-Add Modal */}
                    <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
                        <DialogContent className="rounded-3xl border-none bg-background/80 backdrop-blur-2xl shadow-2xl max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black italic tracking-tight">
                                    Quick Add
                                    {quickAddDate && (
                                        <span className="ml-2 text-sm font-bold text-muted-foreground not-italic">
                                            · {format(quickAddDate, 'MMM d, yyyy')}
                                        </span>
                                    )}
                                </DialogTitle>
                            </DialogHeader>

                            {/* Type selector */}
                            <div className="flex gap-2 mt-2">
                                {([
                                    { type: 'task', label: 'Task', icon: CheckSquare },
                                    { type: 'goal', label: 'Goal', icon: Target },
                                    { type: 'reminder', label: 'Reminder', icon: Bell },
                                ] as const).map(({ type, label, icon: Icon }) => (
                                    <Button
                                        key={type}
                                        size="sm"
                                        variant={quickAddType === type ? 'default' : 'outline'}
                                        onClick={() => setQuickAddType(type)}
                                        className={cn(
                                            'flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                                            quickAddType !== type && 'bg-background/40 border-primary/10 text-muted-foreground'
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                                        {label}
                                    </Button>
                                ))}
                            </div>

                            {/* Title input */}
                            <Input
                                autoFocus
                                placeholder={`${quickAddType === 'task' ? 'Task' : quickAddType === 'goal' ? 'Goal' : 'Reminder'} title…`}
                                value={quickAddTitle}
                                onChange={(e) => setQuickAddTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleQuickAddSubmit()}
                                className="rounded-xl border-primary/10 bg-background/40 font-medium h-11 text-sm focus:ring-primary/20"
                            />

                            <DialogFooter className="gap-2 sm:gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setQuickAddOpen(false)}
                                    className="rounded-xl border-primary/10 bg-background/40 font-black text-[10px] uppercase tracking-widest"
                                >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleQuickAddSubmit}
                                    disabled={!quickAddTitle.trim() || quickAddLoading}
                                    className="rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex-1"
                                >
                                    {quickAddLoading ? (
                                        <span className="animate-pulse">Adding…</span>
                                    ) : (
                                        <>
                                            <Plus className="h-3.5 w-3.5 mr-1" />
                                            Add {quickAddType}
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Event Detail Modal Dialog */}
                    <Dialog open={!!clickedEvent} onOpenChange={() => setClickedEvent(null)}>
                        <DialogContent className="max-w-md border-none bg-background/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-6 overflow-hidden">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black italic tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent mb-2">
                                    {clickedEvent?.type === 'task' ? 'Operation Detail' : 'Audit Session Detail'}
                                </DialogTitle>
                            </DialogHeader>

                            {clickedEvent && (
                                <div className="space-y-4 py-2 text-left">
                                    <div className="flex items-center justify-between">
                                        <Badge className={cn("border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-1", clickedEvent.type === 'task' ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400")}>
                                            {clickedEvent.type === 'task' ? 'Task Operation' : 'Audited Session'}
                                        </Badge>
                                        {clickedEvent.original.priority && (
                                            <Badge className={cn("border-none text-[9px] font-black uppercase tracking-widest px-2.5 py-1", clickedEvent.original.priority === 'high' ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground")}>
                                                {clickedEvent.original.priority} Priority
                                            </Badge>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-black tracking-tight leading-snug italic">
                                            {clickedEvent.type === 'task' ? clickedEvent.original.title : clickedEvent.original.category}
                                        </h3>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-background/30 border border-primary/5 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/80">
                                            <Clock className="h-4 w-4 text-primary shrink-0" />
                                            <span>Time Interval</span>
                                        </div>
                                        <div className="pl-6 space-y-1">
                                            <p className="text-xs font-bold">
                                                {format(clickedEvent.start, 'EEEE, MMMM d, yyyy')}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground font-black uppercase tracking-widest">
                                                {format(clickedEvent.start, 'h:mm a')} – {format(addHours(clickedEvent.start, clickedEvent.duration / 60), 'h:mm a')}
                                            </p>
                                            <p className="text-[10px] text-primary font-black uppercase tracking-wider">
                                                Duration: {clickedEvent.duration > 0 ? `${Math.floor(clickedEvent.duration / 60)}h${clickedEvent.duration % 60 > 0 ? ` ${clickedEvent.duration % 60}m` : ''}` : '< 1m'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-background/30 border border-primary/5">
                                        {clickedEvent.status === 'done' ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        ) : clickedEvent.status === 'in-progress' ? (
                                            <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                                        ) : (
                                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none">Operational Status</p>
                                            <p className="text-xs font-bold mt-1 uppercase tracking-wider">{clickedEvent.status || 'todo'}</p>
                                        </div>
                                    </div>

                                    {(clickedEvent.original.notes || clickedEvent.original.description) && (
                                        <div className="space-y-1.5 text-left">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Description & Notes</p>
                                            <div className="p-4 rounded-2xl bg-background/30 border border-primary/5 max-h-48 overflow-y-auto custom-scrollbar">
                                                <MarkdownRenderer content={clickedEvent.original.notes || clickedEvent.original.description} sessionStart={clickedEvent.start} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter className="mt-4">
                                <Button
                                    onClick={() => setClickedEvent(null)}
                                    className="w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-widest"
                                >
                                    Close
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Interactive Floating Hover Popover Tooltip */}
                    <AnimatePresence>
                        {hoveredEvent && (() => {
                            const tooltipWidth = 280;
                            let left = hoveredEvent.rect.right + 12;
                            let top = hoveredEvent.rect.top - 12;
                            
                            if (hoveredEvent.rect.right + 12 + tooltipWidth > window.innerWidth) {
                                left = hoveredEvent.rect.left - tooltipWidth - 12;
                            }

                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                    className="fixed z-50 p-4 w-72 rounded-[2rem] border border-primary/20 bg-background/95 backdrop-blur-3xl shadow-2xl text-left pointer-events-auto cursor-default"
                                    style={{
                                        left: `${left}px`,
                                        top: `${top}px`,
                                    }}
                                    onMouseEnter={() => {
                                        if (hideTimeoutRef.current) {
                                            clearTimeout(hideTimeoutRef.current);
                                            hideTimeoutRef.current = null;
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        hideTimeoutRef.current = setTimeout(() => {
                                            setHoveredEvent(null);
                                        }, 400);
                                    }}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Badge
                                                className={cn(
                                                    "border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5",
                                                    hoveredEvent.type === 'task'
                                                        ? "bg-blue-500/10 text-blue-400"
                                                        : "bg-emerald-500/10 text-emerald-400"
                                                )}
                                            >
                                                {hoveredEvent.type === 'task' ? 'Operation Task' : 'Audited Session'}
                                            </Badge>
                                            
                                            {hoveredEvent.priority && (
                                                <Badge
                                                    className={cn(
                                                        "border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5",
                                                        hoveredEvent.priority === 'high'
                                                            ? "bg-red-500/10 text-red-400"
                                                            : "bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    {hoveredEvent.priority} priority
                                                </Badge>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-black italic tracking-tight leading-snug">
                                                {hoveredEvent.title}
                                            </h4>
                                        </div>

                                        <div className="flex flex-col gap-1 text-[9px] text-muted-foreground font-black uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                                <span>
                                                    {format(hoveredEvent.start, 'h:mm a')} – {format(addHours(hoveredEvent.start, hoveredEvent.duration / 60), 'h:mm a')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 pl-5 text-[8px] text-muted-foreground/60">
                                                <span>Duration: {hoveredEvent.duration > 0 ? `${Math.floor(hoveredEvent.duration / 60)}h${hoveredEvent.duration % 60 > 0 ? ` ${hoveredEvent.duration % 60}m` : ''}` : '< 1m'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 border-t border-primary/5 pt-2 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                {hoveredEvent.status === 'done' ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                ) : hoveredEvent.status === 'in-progress' ? (
                                                    <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                                ) : (
                                                    <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                )}
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Status: {hoveredEvent.status || 'todo'}
                                                </span>
                                            </div>
                                        </div>

                                        {hoveredEvent.notes && (
                                            <div className="border-t border-primary/5 pt-2 mt-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1.5">Details & Notes</p>
                                                <div className="max-h-36 overflow-y-auto custom-scrollbar pr-1">
                                                    <MarkdownRenderer content={hoveredEvent.notes} sessionStart={hoveredEvent.start} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })()}
                    </AnimatePresence>

                    <style jsx global>{`
                        .scrollbar-hide::-webkit-scrollbar { display: none; }
                        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.2); border-radius: 10px; }
                        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.4); }
                    `}</style>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
