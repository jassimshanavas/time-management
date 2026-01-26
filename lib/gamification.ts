// Gamification Utilities and Configuration

import type {
    Achievement,
    AchievementCategory,
    BadgeTier,
    XPSource,
    XPReward,
    LevelInfo,
    UserStats
} from '@/types/gamification';

// Re-export XPSource for convenience
export { XPSource } from '@/types/gamification';

// XP Rewards Configuration
export const XP_REWARDS: Record<XPSource, number> = {
    [XPSource.TASK_COMPLETED_LOW]: 10,
    [XPSource.TASK_COMPLETED_MEDIUM]: 25,
    [XPSource.TASK_COMPLETED_HIGH]: 50,
    [XPSource.HABIT_STREAK]: 5,
    [XPSource.GOAL_MILESTONE]: 25,
    [XPSource.GOAL_COMPLETED]: 100,
    [XPSource.TIME_TRACKED]: 10, // per hour
    [XPSource.DAILY_LOGIN]: 5,
    [XPSource.ACHIEVEMENT_UNLOCKED]: 50,
};

// Level Calculation
export function getXPForLevel(level: number): number {
    // Exponential progression: Level 1 = 100 XP, Level 2 = 250 XP, etc.
    return Math.floor(100 * Math.pow(level, 1.5));
}

export function calculateLevel(xp: number): number {
    let level = 1;
    let totalXPRequired = 0;

    while (totalXPRequired + getXPForLevel(level) <= xp) {
        totalXPRequired += getXPForLevel(level);
        level++;
    }

    return level;
}

export function getLevelInfo(xp: number): LevelInfo {
    const currentLevel = calculateLevel(xp);
    let xpForCurrentLevel = 0;

    // Calculate total XP earned up to current level
    for (let i = 1; i < currentLevel; i++) {
        xpForCurrentLevel += getXPForLevel(i);
    }

    const xpForNextLevel = getXPForLevel(currentLevel);
    const currentXP = xp - xpForCurrentLevel;
    const xpToNextLevel = xpForNextLevel - currentXP;
    const progressPercent = (currentXP / xpForNextLevel) * 100;

    return {
        currentLevel,
        currentXP,
        xpForCurrentLevel,
        xpForNextLevel,
        xpToNextLevel,
        progressPercent,
    };
}

// Achievement Definitions
export const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
    // Task Achievements
    {
        id: 'task_starter',
        title: 'Task Starter',
        description: 'Complete your first task',
        icon: '✅',
        category: 'tasks',
        requirement: 1,
        tier: 'bronze',
    },
    {
        id: 'task_apprentice',
        title: 'Task Apprentice',
        description: 'Complete 10 tasks',
        icon: '📝',
        category: 'tasks',
        requirement: 10,
        tier: 'bronze',
    },
    {
        id: 'task_master',
        title: 'Task Master',
        description: 'Complete 50 tasks',
        icon: '🎯',
        category: 'tasks',
        requirement: 50,
        tier: 'silver',
    },
    {
        id: 'task_legend',
        title: 'Task Legend',
        description: 'Complete 100 tasks',
        icon: '👑',
        category: 'tasks',
        requirement: 100,
        tier: 'gold',
    },
    {
        id: 'task_champion',
        title: 'Task Champion',
        description: 'Complete 500 tasks',
        icon: '🏆',
        category: 'tasks',
        requirement: 500,
        tier: 'platinum',
    },

    // Habit/Streak Achievements
    {
        id: 'streak_starter',
        title: 'Streak Starter',
        description: 'Maintain a 3-day habit streak',
        icon: '🔥',
        category: 'streaks',
        requirement: 3,
        tier: 'bronze',
    },
    {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day habit streak',
        icon: '💪',
        category: 'streaks',
        requirement: 7,
        tier: 'bronze',
    },
    {
        id: 'month_master',
        title: 'Month Master',
        description: 'Maintain a 30-day habit streak',
        icon: '🌟',
        category: 'streaks',
        requirement: 30,
        tier: 'silver',
    },
    {
        id: 'century_streak',
        title: 'Century Streak',
        description: 'Maintain a 100-day habit streak',
        icon: '💯',
        category: 'streaks',
        requirement: 100,
        tier: 'gold',
    },
    {
        id: 'year_champion',
        title: 'Year Champion',
        description: 'Maintain a 365-day habit streak',
        icon: '🎊',
        category: 'streaks',
        requirement: 365,
        tier: 'platinum',
    },

    // Goal Achievements
    {
        id: 'goal_getter',
        title: 'Goal Getter',
        description: 'Complete your first goal',
        icon: '🎯',
        category: 'goals',
        requirement: 1,
        tier: 'bronze',
    },
    {
        id: 'goal_achiever',
        title: 'Goal Achiever',
        description: 'Complete 5 goals',
        icon: '🏅',
        category: 'goals',
        requirement: 5,
        tier: 'silver',
    },
    {
        id: 'goal_crusher',
        title: 'Goal Crusher',
        description: 'Complete 10 goals',
        icon: '💎',
        category: 'goals',
        requirement: 10,
        tier: 'gold',
    },
    {
        id: 'goal_master',
        title: 'Goal Master',
        description: 'Complete 25 goals',
        icon: '👑',
        category: 'goals',
        requirement: 25,
        tier: 'platinum',
    },

    // Time Tracking Achievements
    {
        id: 'time_tracker',
        title: 'Time Tracker',
        description: 'Track 10 hours of work',
        icon: '⏱️',
        category: 'time',
        requirement: 10,
        tier: 'bronze',
    },
    {
        id: 'time_keeper',
        title: 'Time Keeper',
        description: 'Track 50 hours of work',
        icon: '⏰',
        category: 'time',
        requirement: 50,
        tier: 'silver',
    },
    {
        id: 'time_master',
        title: 'Time Master',
        description: 'Track 100 hours of work',
        icon: '🕐',
        category: 'time',
        requirement: 100,
        tier: 'gold',
    },
    {
        id: 'time_lord',
        title: 'Time Lord',
        description: 'Track 500 hours of work',
        icon: '⌚',
        category: 'time',
        requirement: 500,
        tier: 'platinum',
    },

    // Special Achievements
    {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete 10 tasks before 9 AM',
        icon: '🌅',
        category: 'special',
        requirement: 10,
        tier: 'silver',
    },
    {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Complete 10 tasks after 10 PM',
        icon: '🦉',
        category: 'special',
        requirement: 10,
        tier: 'silver',
    },
    {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Complete all tasks for 7 consecutive days',
        icon: '✨',
        category: 'special',
        requirement: 7,
        tier: 'gold',
    },
    {
        id: 'consistent',
        title: 'Consistent',
        description: 'Log in for 7 consecutive days',
        icon: '📅',
        category: 'special',
        requirement: 7,
        tier: 'bronze',
    },
    {
        id: 'dedicated',
        title: 'Dedicated',
        description: 'Log in for 30 consecutive days',
        icon: '🎯',
        category: 'special',
        requirement: 30,
        tier: 'silver',
    },
    {
        id: 'committed',
        title: 'Committed',
        description: 'Log in for 100 consecutive days',
        icon: '💪',
        category: 'special',
        requirement: 100,
        tier: 'gold',
    },
];

// Initialize achievements with unlocked status
export function initializeAchievements(): Achievement[] {
    return ACHIEVEMENTS.map(achievement => ({
        ...achievement,
        unlocked: false,
        progress: 0,
    }));
}

// Check which achievements should be unlocked based on user stats
export function checkAchievements(
    stats: UserStats,
    currentAchievements: Achievement[]
): Achievement[] {
    const updatedAchievements = [...currentAchievements];

    updatedAchievements.forEach((achievement) => {
        if (achievement.unlocked) return;

        let currentProgress = 0;

        switch (achievement.category) {
            case 'tasks':
                currentProgress = stats.totalTasksCompleted;
                break;
            case 'streaks':
                currentProgress = stats.longestStreak;
                break;
            case 'goals':
                currentProgress = stats.totalGoalsCompleted;
                break;
            case 'time':
                currentProgress = Math.floor(stats.totalTimeTracked / 60); // Convert minutes to hours
                break;
            case 'special':
                if (achievement.id === 'early_bird') {
                    currentProgress = stats.earlyBirdTasks;
                } else if (achievement.id === 'night_owl') {
                    currentProgress = stats.nightOwlTasks;
                } else if (achievement.id === 'perfectionist') {
                    currentProgress = stats.consecutivePerfectDays;
                } else if (achievement.id.includes('consistent') || achievement.id.includes('dedicated') || achievement.id.includes('committed')) {
                    currentProgress = stats.currentStreak;
                }
                break;
        }

        achievement.progress = currentProgress;

        if (currentProgress >= achievement.requirement) {
            achievement.unlocked = true;
            achievement.unlockedAt = new Date();
        }
    });

    return updatedAchievements;
}

// Get newly unlocked achievements
export function getNewlyUnlockedAchievements(
    oldAchievements: Achievement[],
    newAchievements: Achievement[]
): Achievement[] {
    return newAchievements.filter((newAch) => {
        const oldAch = oldAchievements.find((a) => a.id === newAch.id);
        return newAch.unlocked && (!oldAch || !oldAch.unlocked);
    });
}

// Get XP reward for completing a task
export function getTaskXPReward(priority: 'low' | 'medium' | 'high'): XPReward {
    let source: XPSource;
    let message: string;

    switch (priority) {
        case 'high':
            source = XPSource.TASK_COMPLETED_HIGH;
            message = 'High priority task completed!';
            break;
        case 'medium':
            source = XPSource.TASK_COMPLETED_MEDIUM;
            message = 'Medium priority task completed!';
            break;
        default:
            source = XPSource.TASK_COMPLETED_LOW;
            message = 'Task completed!';
    }

    return {
        source,
        amount: XP_REWARDS[source],
        message,
    };
}

// Get badge tier color
export function getBadgeTierColor(tier: BadgeTier): string {
    switch (tier) {
        case 'bronze':
            return 'from-amber-600 to-amber-800';
        case 'silver':
            return 'from-gray-400 to-gray-600';
        case 'gold':
            return 'from-yellow-400 to-yellow-600';
        case 'platinum':
            return 'from-cyan-400 to-blue-600';
    }
}

// Get level tier based on level number
export function getLevelTier(level: number): BadgeTier {
    if (level >= 50) return 'platinum';
    if (level >= 25) return 'gold';
    if (level >= 10) return 'silver';
    return 'bronze';
}
