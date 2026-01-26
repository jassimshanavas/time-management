'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AchievementCard } from '@/components/gamification/achievement-card';
import { StatsCard } from '@/components/gamification/stats-card';
import { useStore } from '@/lib/store';
import { Trophy, Lock, CheckCircle } from 'lucide-react';
import type { AchievementCategory } from '@/types/gamification';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function AchievementsPage() {
    const { gamification } = useStore();
    const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'unlocked' | 'locked'>('all');

    if (!gamification) {
        return (
            <ProtectedRoute>
                <DataLoader>
                    <MainLayout>
                        <div className="flex items-center justify-center h-96">
                            <p className="text-muted-foreground">Loading achievements...</p>
                        </div>
                    </MainLayout>
                </DataLoader>
            </ProtectedRoute>
        );
    }

    const achievements = gamification.achievements || [];

    // Filter achievements
    const filteredAchievements = achievements.filter((achievement) => {
        const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
        const statusMatch =
            selectedStatus === 'all' ||
            (selectedStatus === 'unlocked' && achievement.unlocked) ||
            (selectedStatus === 'locked' && !achievement.unlocked);
        return categoryMatch && statusMatch;
    });

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const totalCount = achievements.length;
    const completionPercent = (unlockedCount / totalCount) * 100;

    const categories: { value: AchievementCategory | 'all'; label: string; icon: string }[] = [
        { value: 'all', label: 'All', icon: '🏆' },
        { value: 'tasks', label: 'Tasks', icon: '✅' },
        { value: 'habits', label: 'Habits', icon: '📈' },
        { value: 'goals', label: 'Goals', icon: '🎯' },
        { value: 'time', label: 'Time', icon: '⏱️' },
        { value: 'streaks', label: 'Streaks', icon: '🔥' },
        { value: 'special', label: 'Special', icon: '✨' },
    ];

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                    <Trophy className="h-8 w-8 text-yellow-500" />
                                    Achievements
                                </h1>
                                <p className="text-muted-foreground">
                                    Track your progress and unlock rewards
                                </p>
                            </div>
                        </div>

                        {/* Stats Overview */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-center">
                                        <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                                        <p className="text-2xl font-bold">{unlockedCount}</p>
                                        <p className="text-sm text-muted-foreground">Achievements Unlocked</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-center">
                                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                        <p className="text-2xl font-bold">{completionPercent.toFixed(0)}%</p>
                                        <p className="text-sm text-muted-foreground">Completion Rate</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-center">
                                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                        <p className="text-2xl font-bold">{totalCount - unlockedCount}</p>
                                        <p className="text-sm text-muted-foreground">Locked Achievements</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">🎖️</div>
                                        <p className="text-2xl font-bold">{gamification.level}</p>
                                        <p className="text-sm text-muted-foreground">Current Level</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* User Stats */}
                        <StatsCard stats={gamification.stats} />

                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Tabs
                                value={selectedCategory}
                                onValueChange={(value) => setSelectedCategory(value as AchievementCategory | 'all')}
                                className="flex-1"
                            >
                                <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
                                    {categories.map((cat) => (
                                        <TabsTrigger key={cat.value} value={cat.value} className="text-xs sm:text-sm">
                                            <span className="mr-1">{cat.icon}</span>
                                            <span className="hidden sm:inline">{cat.label}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>

                            <div className="flex gap-2">
                                <Button
                                    variant={selectedStatus === 'all' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedStatus('all')}
                                >
                                    All
                                </Button>
                                <Button
                                    variant={selectedStatus === 'unlocked' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedStatus('unlocked')}
                                >
                                    Unlocked
                                </Button>
                                <Button
                                    variant={selectedStatus === 'locked' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedStatus('locked')}
                                >
                                    Locked
                                </Button>
                            </div>
                        </div>

                        {/* Achievements Grid */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredAchievements.length === 0 ? (
                                <div className="col-span-full">
                                    <Card>
                                        <CardContent className="p-8 text-center">
                                            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                            <p className="text-muted-foreground">
                                                No achievements found with the selected filters.
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                filteredAchievements.map((achievement) => (
                                    <AchievementCard key={achievement.id} achievement={achievement} />
                                ))
                            )}
                        </div>
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
