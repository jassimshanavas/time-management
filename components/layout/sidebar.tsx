'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  Bell,
  StickyNote,
  Target,
  TrendingUp,
  Clock,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';

const routes = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'text-sky-500',
  },
  {
    label: 'Tasks',
    icon: CheckSquare,
    href: '/tasks',
    color: 'text-violet-500',
  },
  {
    label: 'Reminders',
    icon: Bell,
    href: '/reminders',
    color: 'text-pink-500',
  },
  {
    label: 'Notes',
    icon: StickyNote,
    href: '/notes',
    color: 'text-orange-500',
  },
  {
    label: 'Goals',
    icon: Target,
    href: '/goals',
    color: 'text-emerald-500',
  },
  {
    label: 'Habits',
    icon: TrendingUp,
    href: '/habits',
    color: 'text-green-500',
  },
  {
    label: 'Time Tracking',
    icon: Clock,
    href: '/time-tracking',
    color: 'text-blue-500',
  },
  {
    label: 'Timeline',
    icon: Calendar,
    href: '/timeline',
    color: 'text-indigo-500',
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    href: '/analytics',
    color: 'text-purple-500',
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onMobileClose?: () => void;
}

function SidebarFooter({ isCollapsed }: { isCollapsed: boolean }) {
  const { settings, updateSettings } = useStore();
  const { userData, logout } = useAuth();
  const pathname = usePathname();

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateSettings({ theme: nextTheme });
  };

  const getThemeIcon = () => {
    switch (settings.theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      default:
        return Laptop;
    }
  };

  const ThemeIcon = getThemeIcon();

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div className="space-y-2">
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="w-full h-10 text-muted-foreground hover:text-primary hover:bg-primary/10"
              >
                <ThemeIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Toggle Theme ({settings.theme})
            </TooltipContent>
          </Tooltip>

          {/* Profile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/profile"
                className={cn(
                  'flex items-center justify-center h-10 w-full rounded-lg transition-all duration-200',
                  pathname === '/profile'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
              >
                <User className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              Profile
            </TooltipContent>
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  'flex items-center justify-center h-10 w-full rounded-lg transition-all duration-200',
                  pathname === '/settings'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              Settings
            </TooltipContent>
          </Tooltip>

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await logout();
                  window.location.href = '/auth/login';
                }}
                className="w-full h-10 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Logout
            </TooltipContent>
          </Tooltip>

          <Separator className="my-3" />

          {/* User Profile Card (Collapsed) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center p-3 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300">
                <Avatar className="h-14 w-14 ring-2 ring-primary/40 shadow-lg">
                  <AvatarImage src={userData?.avatar} alt={userData?.name || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
                    {userData?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="text-sm">
                <div className="font-bold">{userData?.name || 'Guest User'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{userData?.email || 'guest@example.com'}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        onClick={toggleTheme}
        className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
      >
        <ThemeIcon className="h-5 w-5 mr-3" />
        <span className="transition-all duration-300">
          Toggle Theme
        </span>
      </Button>

      {/* Profile */}
      <Link
        href="/profile"
        className={cn(
          'flex items-center p-3 w-full rounded-lg transition-all duration-200 text-sm font-medium',
          pathname === '/profile'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
        )}
      >
        <User className="h-5 w-5 mr-3" />
        <span className="transition-all duration-300">Profile</span>
      </Link>

      {/* Settings */}
      <Link
        href="/settings"
        className={cn(
          'flex items-center p-3 w-full rounded-lg transition-all duration-200 text-sm font-medium',
          pathname === '/settings'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
        )}
      >
        <Settings className="h-5 w-5 mr-3" />
        <span className="transition-all duration-300">Settings</span>
      </Link>

      {/* Logout */}
      <Button
        variant="ghost"
        onClick={async () => {
          await logout();
          window.location.href = '/auth/login';
        }}
        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-all duration-200"
      >
        <LogOut className="h-5 w-5 mr-3" />
        <span className="transition-all duration-300">Logout</span>
      </Button>

      <Separator className="my-3" />

      {/* User Profile Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-primary/40 shadow-lg">
            <AvatarImage src={userData?.avatar} alt={userData?.name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-foreground">
              {userData?.name || 'Guest User'}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {userData?.email || 'guest@example.com'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ isCollapsed = false, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "space-y-4 py-4 flex flex-col h-full bg-secondary/30 border-r transition-all duration-300 ease-in-out",
      isCollapsed ? "w-[80px]" : "w-72"
    )}>
      <div className="px-3 py-2 flex-1">
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/dashboard" 
            onClick={onMobileClose}
            className={cn(
              "flex items-center pl-3 transition-all duration-300",
              isCollapsed && "pl-0 justify-center"
            )}>
            <div className={cn(
              "relative h-8 w-8 transition-all duration-300",
              isCollapsed ? "mr-0" : "mr-4"
            )}>
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h1 className={cn(
              "text-2xl font-bold transition-all duration-300 overflow-hidden whitespace-nowrap",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}>TimeFlow</h1>
          </Link>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={cn(
                "hidden md:flex h-8 w-8 transition-all duration-300",
                isCollapsed && "ml-0"
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <TooltipProvider delayDuration={0}>
            <div className="space-y-1">
              {routes.map((route) => {
                const linkContent = (
                  <Link
                    key={route.href}
                    href={route.href}
                    onClick={onMobileClose}
                    className={cn(
                      'text-sm group flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all duration-200',
                      pathname === route.href
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground',
                      isCollapsed ? 'justify-center' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      "flex items-center",
                      isCollapsed ? "" : "flex-1"
                    )}>
                      <route.icon className={cn(
                        'h-5 w-5 transition-all duration-200',
                        isCollapsed ? 'mr-0' : 'mr-3',
                        route.color
                      )} />
                      <span className={cn(
                        "transition-all duration-300 overflow-hidden whitespace-nowrap",
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                      )}>
                        {route.label}
                      </span>
                    </div>
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={route.href}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {route.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          </TooltipProvider>
        </ScrollArea>
      </div>
      <div className="px-3 py-2 space-y-2">
        <Separator className="mb-4" />
        <SidebarFooter isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}
