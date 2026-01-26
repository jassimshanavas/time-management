'use client';

import { Badge } from '@/components/ui/badge';
import type { BadgeTier } from '@/types/gamification';
import { getBadgeTierColor } from '@/lib/gamification';

interface BadgeDisplayProps {
    tier: BadgeTier;
    label?: string;
    icon?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function BadgeDisplay({ tier, label, icon, size = 'md' }: BadgeDisplayProps) {
    const tierColor = getBadgeTierColor(tier);

    const sizeClasses = {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2',
    };

    return (
        <Badge
            variant="outline"
            className={`bg-gradient-to-r ${tierColor} text-white border-0 font-semibold ${sizeClasses[size]}`}
        >
            {icon && <span className="mr-1">{icon}</span>}
            {label || tier.toUpperCase()}
        </Badge>
    );
}
