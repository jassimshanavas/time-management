'use client';

import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

interface ProjectBadgeProps {
    projectId?: string;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function ProjectBadge({
    projectId,
    showIcon = true,
    size = 'sm',
    className = ''
}: ProjectBadgeProps) {
    const project = useStore((state) =>
        state.projects.find((p) => p.id === projectId)
    );

    if (!projectId || !project) {
        return null;
    }

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
    };

    return (
        <Badge
            variant="outline"
            className={`${sizeClasses[size]} inline-flex items-center gap-1.5 ${className}`}
            style={{
                borderColor: project.color,
                color: project.color,
                backgroundColor: `${project.color}10`,
            }}
        >
            {showIcon && (
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                />
            )}
            <span className="font-medium">{project.name}</span>
        </Badge>
    );
}
