'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { Menu, Sun, Moon, Laptop } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { settings, updateSettings } = useStore();
  const { userData, logout } = useAuth();

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(settings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateSettings({ theme: nextTheme });
  };

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {settings.theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userData?.avatar} alt={userData?.name || 'User'} />
                  <AvatarFallback>
                    {userData?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="font-medium">
                {userData?.name || 'Guest User'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm text-muted-foreground">
                {userData?.email || 'guest@example.com'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => (window.location.href = '/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                await logout();
                window.location.href = '/auth/login';
              }}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
