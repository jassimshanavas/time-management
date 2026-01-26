'use client';

import { Progress } from '@/components/ui/progress';
import type { LevelInfo } from '@/types/gamification';

interface XPProgressProps {
    levelInfo: LevelInfo;
    showDetails?: boolean;
}

export function XPProgress({ levelInfo, showDetails = true }: XPProgressProps) {
    return (
        <div className="space-y-2">
            {showDetails && (
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Level {levelInfo.currentLevel}</span>
                    <span className="text-muted-foreground">
                        {levelInfo.currentXP.toLocaleString()} / {levelInfo.xpForNextLevel.toLocaleString()} XP
                    </span>
                </div>
            )}
            <Progress value={levelInfo.progressPercent} className="h-2" />
            {showDetails && (
                <p className="text-xs text-muted-foreground text-right">
                    {levelInfo.xpToNextLevel.toLocaleString()} XP to level {levelInfo.currentLevel + 1}
                </p>
            )}
        </div>
    );
}
