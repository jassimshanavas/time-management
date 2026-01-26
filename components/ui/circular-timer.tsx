'use client';

interface CircularTimerProps {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes?: number;
  maxMinutes?: number;
  size?: number;
  strokeWidth?: number;
}

export function CircularTimer({
  hours,
  minutes,
  seconds,
  totalMinutes = 0,
  maxMinutes = 10080, // 1 week in minutes
  size = 200,
  strokeWidth = 12,
}: CircularTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (totalMinutes / maxMinutes) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-bold font-mono">
          {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:
          {seconds.toString().padStart(2, '0')}
        </div>
        <div className="text-sm opacity-75 mt-1">HH:MM:SS</div>
      </div>
    </div>
  );
}
