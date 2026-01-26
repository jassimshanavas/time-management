'use client';

import { useStore } from '@/lib/store';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ProjectSelectorProps {
    value?: string;
    onChange: (value: string | undefined) => void;
    placeholder?: string;
    allowNone?: boolean;
    disabled?: boolean;
}

export function ProjectSelector({
    value,
    onChange,
    placeholder = 'Select project',
    allowNone = true,
    disabled = false,
}: ProjectSelectorProps) {
    const projects = useStore((state) => state.projects);

    const handleValueChange = (newValue: string) => {
        // If "none" is selected, pass undefined
        if (newValue === '__none__') {
            onChange(undefined);
        } else {
            onChange(newValue);
        }
    };

    return (
        <Select
            value={value || '__none__'}
            onValueChange={handleValueChange}
            disabled={disabled}
        >
            <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {allowNone && (
                    <SelectItem value="__none__">
                        <div className="flex items-center gap-2">
                            <span>📝</span>
                            <span>Personal (No Project)</span>
                        </div>
                    </SelectItem>
                )}
                {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: project.color }}
                            />
                            <span>{project.name}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
