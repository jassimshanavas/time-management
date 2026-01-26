'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Achievement, XPReward } from '@/types/gamification';
import { getBadgeTierColor } from '@/lib/gamification';
import { Trophy, X, Sparkles } from 'lucide-react';

interface AchievementToastProps {
    achievement?: Achievement;
    xpReward?: XPReward;
    onClose: () => void;
}

export function AchievementToast({ achievement, xpReward, onClose }: AchievementToastProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (achievement || xpReward) {
            setShow(true);
            // Auto-close after 5 seconds
            const timer = setTimeout(() => {
                handleClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [achievement, xpReward]);

    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 300); // Wait for animation to complete
    };

    if (!achievement && !xpReward) return null;

    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* Confetti effect for achievements */}
                    {achievement && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 pointer-events-none z-50"
                        >
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{
                                        x: '50vw',
                                        y: '50vh',
                                        scale: 0,
                                    }}
                                    animate={{
                                        x: `${Math.random() * 100}vw`,
                                        y: `${Math.random() * 100}vh`,
                                        scale: [0, 1, 0],
                                        rotate: Math.random() * 360,
                                    }}
                                    transition={{
                                        duration: 2,
                                        delay: i * 0.05,
                                    }}
                                    className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                                />
                            ))}
                        </motion.div>
                    )}

                    {/* Toast notification */}
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
                    >
                        <Card
                            className={`shadow-2xl border-2 ${achievement
                                    ? `border-primary bg-gradient-to-br ${getBadgeTierColor(
                                        achievement.tier
                                    )} bg-opacity-10`
                                    : 'border-blue-500'
                                }`}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {achievement ? (
                                            <>
                                                <Trophy className="h-6 w-6 text-yellow-500" />
                                                <CardTitle className="text-lg">Achievement Unlocked!</CardTitle>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="h-6 w-6 text-blue-500" />
                                                <CardTitle className="text-lg">XP Earned!</CardTitle>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClose}
                                        className="h-6 w-6 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {achievement && (
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl">{achievement.icon}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold">{achievement.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {achievement.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                +50 XP Bonus
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {xpReward && !achievement && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm">{xpReward.message}</p>
                                        <p className="font-bold text-blue-500">+{xpReward.amount} XP</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
