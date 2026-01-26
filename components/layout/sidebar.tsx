'use client';

import { useState } from 'react';
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
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Laptop,
  User,
  Plus,
  FolderKanban,
  Home,
  Trophy,
  Sparkles,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';

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
            <TooltipContent side="right">Profile</TooltipContent>
          </Tooltip>

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
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>

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
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>

          <Separator className="my-3" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex justify-center p-3 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg">
                <Avatar className="h-14 w-14 ring-2 ring-primary/40">
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
                <div className="text-xs text-muted-foreground">{userData?.email}</div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        onClick={toggleTheme}
        className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/10"
      >
        <ThemeIcon className="h-5 w-5 mr-3" />
        <span>Toggle Theme</span>
      </Button>

      <Link
        href="/profile"
        className={cn(
          'flex items-center p-3 w-full rounded-lg transition-all text-sm font-medium',
          pathname === '/profile'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
        )}
      >
        <User className="h-5 w-5 mr-3" />
        <span>Profile</span>
      </Link>

      <Link
        href="/settings"
        className={cn(
          'flex items-center p-3 w-full rounded-lg transition-all text-sm font-medium',
          pathname === '/settings'
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
        )}
      >
        <Settings className="h-5 w-5 mr-3" />
        <span>Settings</span>
      </Link>

      <Button
        variant="ghost"
        onClick={async () => {
          await logout();
          window.location.href = '/auth/login';
        }}
        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
      >
        <LogOut className="h-5 w-5 mr-3" />
        <span>Logout</span>
      </Button>

      <Separator className="my-3" />

      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 shadow-lg">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 ring-2 ring-primary/40">
            <AvatarImage src={userData?.avatar} alt={userData?.name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{userData?.name || 'Guest User'}</p>
            <p className="text-xs text-muted-foreground truncate">{userData?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ isCollapsed = false, onToggleCollapse, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { projects } = useStore();
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [personalExpanded, setPersonalExpanded] = useState(true);

  const personalRoutes = [
    { label: 'Tasks', icon: CheckSquare, href: '/tasks', color: 'text-violet-500' },
    { label: 'Notes', icon: StickyNote, href: '/notes', color: 'text-orange-500' },
    { label: 'Goals', icon: Target, href: '/goals', color: 'text-emerald-500' },
    { label: 'Habits', icon: TrendingUp, href: '/habits', color: 'text-green-500' },
    { label: 'Time Tracking', icon: Clock, href: '/time-tracking', color: 'text-blue-500' },
    { label: 'Reminders', icon: Bell, href: '/reminders', color: 'text-pink-500' },
  ];

  return (
    <div
      className={cn(
        'space-y-4 py-4 flex flex-col h-full bg-secondary/30 border-r transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-[80px]' : 'w-72'
      )}
    >
      <div className="px-3 py-2 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/dashboard"
            onClick={onMobileClose}
            className={cn(
              'flex items-center pl-3 transition-all duration-300',
              isCollapsed && 'pl-0 justify-center'
            )}
          >
            <div className={cn('relative h-8 w-8 transition-all', isCollapsed ? 'mr-0' : 'mr-4')}>
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h1
              className={cn(
                'text-2xl font-bold transition-all duration-300 overflow-hidden whitespace-nowrap',
                isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
              )}
            >
              TimeFlow
            </h1>
          </Link>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className={cn('hidden md:flex h-8 w-8 transition-all', isCollapsed && 'ml-0')}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <TooltipProvider delayDuration={0}>
            <div className="space-y-1">
              {/* Top Level - Home & Today */}
              <Link
                href="/dashboard"
                onClick={onMobileClose}
                className={cn(
                  'text-sm flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all',
                  pathname === '/dashboard' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <Home className={cn('h-5 w-5 text-sky-500', isCollapsed ? 'mr-0' : 'mr-3')} />
                <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
                  Home
                </span>
              </Link>

              <Link
                href="/today"
                onClick={onMobileClose}
                className={cn(
                  'text-sm flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all',
                  pathname === '/today' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <Calendar className={cn('h-5 w-5 text-indigo-500', isCollapsed ? 'mr-0' : 'mr-3')} />
                <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
                  Today
                </span>
              </Link>

              <Link
                href="/calendar"
                onClick={onMobileClose}
                className={cn(
                  'text-sm flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all',
                  pathname === '/calendar' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <CalendarDays className={cn('h-5 w-5 text-teal-500', isCollapsed ? 'mr-0' : 'mr-3')} />
                <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
                  Calendar
                </span>
              </Link>

              <Link
                href="/timeline"
                onClick={onMobileClose}
                className={cn(
                  'text-sm flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all',
                  pathname === '/timeline' || pathname === '/timeline/gantt' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <BarChart3 className={cn('h-5 w-5 text-amber-500', isCollapsed ? 'mr-0' : 'mr-3')} />
                <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
                  Timeline
                </span>
              </Link>

              <Link
                href="/board"
                onClick={onMobileClose}
                className={cn(
                  'text-sm flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all',
                  pathname === '/board' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <Sparkles className={cn('h-5 w-5 text-purple-500', isCollapsed ? 'mr-0' : 'mr-3')} />
                <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
                  Board
                </span>
              </Link>

              {!isCollapsed && <Separator className="my-4" />}

              {/* PROJECTS Section */}
              {!isCollapsed ? (
                <Collapsible open={projectsExpanded} onOpenChange={setProjectsExpanded}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    <ChevronDown
                      className={cn('h-4 w-4 transition-transform', !projectsExpanded && '-rotate-90')}
                    />
                    <FolderKanban className="h-4 w-4" />
                    <span className="flex-1 text-left">Projects</span>
                    <CreateProjectDialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-primary/10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </CreateProjectDialog>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {projects.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-6 py-2 italic">No projects yet</p>
                    ) : (
                      projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          onClick={onMobileClose}
                          className={cn(
                            'flex items-center gap-3 px-6 py-2 text-sm font-medium rounded-lg transition-all hover:bg-primary/10',
                            pathname === `/projects/${project.id}` ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                          )}
                        >
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                          <span className="flex-1 truncate">{project.name}</span>
                        </Link>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 py-2">
                      <FolderKanban className="h-5 w-5 text-muted-foreground" />
                      {projects.slice(0, 3).map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
                          style={{ backgroundColor: project.color }}
                        />
                      ))}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="text-sm">
                      <div className="font-bold mb-1">Projects ({projects.length})</div>
                      {projects.slice(0, 5).map((p) => (
                        <div key={p.id} className="text-xs">{p.name}</div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}

              {!isCollapsed && <Separator className="my-4" />}

              {/* PERSONAL Section */}
              {!isCollapsed ? (
                <Collapsible open={personalExpanded} onOpenChange={setPersonalExpanded}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                    <ChevronDown
                      className={cn('h-4 w-4 transition-transform', !personalExpanded && '-rotate-90')}
                    />
                    <User className="h-4 w-4" />
                    <span className="flex-1 text-left">Personal</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    {personalRoutes.map((route) => (
                      <Link
                        key={route.href}
                        href={route.href}
                        onClick={onMobileClose}
                        className={cn(
                          'flex items-center gap-3 px-6 py-2 text-sm font-medium rounded-lg transition-all hover:bg-primary/10',
                          pathname === route.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                        )}
                      >
                        <route.icon className={cn('h-5 w-5', route.color)} />
                        <span className="flex-1">{route.label}</span>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  {personalRoutes.map((route) => (
                    <Tooltip key={route.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={route.href}
                          onClick={onMobileClose}
                          className={cn(
                            'flex items-center justify-center h-10 w-10 rounded-lg transition-all hover:bg-primary/10',
                            pathname === route.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                          )}
                        >
                          <route.icon className={cn('h-5 w-5', route.color)} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{route.label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}

              {!isCollapsed && <Separator className="my-4" />}

              {/* Bottom - Analytics & Achievements */}
              <Link
                href="/analytics"
                onClick={onMobileClose}
                className={cn(
                  'text-sm flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all',
                  pathname === '/analytics' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <BarChart3 className={cn('h-5 w-5 text-purple-500', isCollapsed ? 'mr-0' : 'mr-3')} />
                <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
                  Analytics
                </span>
              </Link>

              <Link
                href="/achievements"
                onClick={onMobileClose}
                className={cn(
                  'text-sm flex p-3 w-full font-medium cursor-pointer hover:bg-primary/10 rounded-lg transition-all',
                  pathname === '/achievements' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                  isCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <Trophy className={cn('h-5 w-5 text-yellow-500', isCollapsed ? 'mr-0' : 'mr-3')} />
                <span className={cn('transition-all overflow-hidden', isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100')}>
                  Achievements
                </span>
              </Link>
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
