'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { Achievement } from '@/types/gamification';
import { getBadgeTierColor } from '@/lib/gamification';
import { Lock, Check } from 'lucide-react';

interface AchievementCardProps {
    achievement: Achievement;
    showProgress?: boolean;
}

export function AchievementCard({ achievement, showProgress = true }: AchievementCardProps) {
    const progress = achievement.progress || 0;
    const progressPercent = (progress / achievement.requirement) * 100;
    const tierColor = getBadgeTierColor(achievement.tier);

    return (
        <Card
            className={`relative overflow-hidden transition-all ${achievement.unlocked
                    ? 'border-primary shadow-md hover:shadow-lg'
                    : 'opacity-60 hover:opacity-80'
                }`}
        >
            {/* Gradient background for unlocked achievements */}
            {achievement.unlocked && (
                <div
                    className={`absolute inset-0 bg-gradient-to-br ${tierColor} opacity-5`}
                />
            )}

            <CardHeader className="relative pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`text-4xl ${achievement.unlocked ? 'animate-bounce-slow' : 'grayscale'
                                }`}
                        >
                            {achievement.icon}
                        </div>
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                {achievement.title}
                                {achievement.unlocked && (
                                    <Check className="h-4 w-4 text-green-500" />
                                )}
                                {!achievement.unlocked && (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {achievement.description}
                            </p>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={`bg-gradient-to-r ${tierColor} text-white border-0`}
                    >
                        {achievement.tier}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="relative">
                {showProgress && !achievement.unlocked && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                                {progress} / {achievement.requirement}
                            </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                    </div>
                )}

                {achievement.unlocked && achievement.unlockedAt && (
                    <div className="text-xs text-muted-foreground">
                        Unlocked on{' '}
                        {new Date(achievement.unlockedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
