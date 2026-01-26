'use client';

import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { getBadgeTierColor, getLevelTier } from '@/lib/gamification';

interface LevelBadgeProps {
    level: number;
    xp?: number;
    size?: 'sm' | 'md' | 'lg';
    showTooltip?: boolean;
}

export function LevelBadge({ level, xp, size = 'md', showTooltip = true }: LevelBadgeProps) {
    const tier = getLevelTier(level);
    const tierColor = getBadgeTierColor(tier);

    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
    };

    const badge = (
        <div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${tierColor} flex items-center justify-center font-bold text-white shadow-lg border-2 border-white dark:border-gray-800`}
        >
            {level}
        </div>
    );

    if (!showTooltip) return badge;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{badge}</TooltipTrigger>
                <TooltipContent>
                    <div className="text-center">
                        <p className="font-semibold">Level {level}</p>
                        {xp !== undefined && (
                            <p className="text-xs text-muted-foreground">{xp.toLocaleString()} XP</p>
                        )}
                        <p className="text-xs text-muted-foreground capitalize">{tier} Tier</p>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
