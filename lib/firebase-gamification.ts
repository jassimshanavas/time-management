// Firebase Gamification Service

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    increment,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserGamification, UserStats, Achievement } from '@/types/gamification';
import { initializeAchievements } from './gamification';

// Get user gamification data
export async function getUserGamification(userId: string): Promise<UserGamification | null> {
    try {
        const docRef = doc(db, 'gamification', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                ...data,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                lastLoginDate: data.lastLoginDate?.toDate(),
                achievements: data.achievements.map((ach: any) => ({
                    ...ach,
                    unlockedAt: ach.unlockedAt?.toDate(),
                })),
            } as UserGamification;
        }

        return null;
    } catch (error) {
        console.error('Error getting user gamification:', error);
        return null;
    }
}

// Initialize user gamification data
export async function initializeUserGamification(userId: string): Promise<void> {
    try {
        const initialData: Omit<UserGamification, 'createdAt' | 'updatedAt'> = {
            userId,
            xp: 0,
            level: 1,
            achievements: initializeAchievements(),
            stats: {
                totalTasksCompleted: 0,
                totalHabitsCompleted: 0,
                totalGoalsCompleted: 0,
                totalTimeTracked: 0,
                longestStreak: 0,
                currentStreak: 0,
                earlyBirdTasks: 0,
                nightOwlTasks: 0,
                perfectDays: 0,
                consecutivePerfectDays: 0,
            },
            lastLoginDate: new Date(),
        };

        await setDoc(doc(db, 'gamification', userId), {
            ...initialData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error initializing user gamification:', error);
        throw error;
    }
}

// Update user XP
export async function updateUserXP(userId: string, xpToAdd: number): Promise<void> {
    try {
        const docRef = doc(db, 'gamification', userId);
        await updateDoc(docRef, {
            xp: increment(xpToAdd),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating user XP:', error);
        throw error;
    }
}

// Update user level
export async function updateUserLevel(userId: string, level: number): Promise<void> {
    try {
        const docRef = doc(db, 'gamification', userId);
        await updateDoc(docRef, {
            level,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating user level:', error);
        throw error;
    }
}

// Update user stats
export async function updateUserStats(
    userId: string,
    stats: Partial<UserStats>
): Promise<void> {
    try {
        const docRef = doc(db, 'gamification', userId);
        const updates: any = { updatedAt: serverTimestamp() };

        Object.entries(stats).forEach(([key, value]) => {
            updates[`stats.${key}`] = value;
        });

        await updateDoc(docRef, updates);
    } catch (error) {
        console.error('Error updating user stats:', error);
        throw error;
    }
}

// Increment user stat
export async function incrementUserStat(
    userId: string,
    statKey: keyof UserStats,
    amount: number = 1
): Promise<void> {
    try {
        const docRef = doc(db, 'gamification', userId);
        await updateDoc(docRef, {
            [`stats.${statKey}`]: increment(amount),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error incrementing user stat:', error);
        throw error;
    }
}

// Update achievements
export async function updateAchievements(
    userId: string,
    achievements: Achievement[]
): Promise<void> {
    try {
        const docRef = doc(db, 'gamification', userId);
        await updateDoc(docRef, {
            achievements,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating achievements:', error);
        throw error;
    }
}

// Update last login date
export async function updateLastLogin(userId: string): Promise<void> {
    try {
        const docRef = doc(db, 'gamification', userId);
        await updateDoc(docRef, {
            lastLoginDate: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating last login:', error);
        throw error;
    }
}
