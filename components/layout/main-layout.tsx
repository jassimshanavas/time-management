'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { DndProviderWrapper } from '@/components/providers/dnd-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapse state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapse state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DndProviderWrapper>
        <div className="flex h-screen overflow-hidden">
          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed md:relative inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out md:translate-x-0 ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } ${isCollapsed ? 'md:w-[80px]' : 'md:w-72'}`}
          >
            <Sidebar 
              isCollapsed={isCollapsed} 
              setIsCollapsed={setIsCollapsed}
              onCloseMobileMenu={() => setSidebarOpen(false)}
            />
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile menu button */}
            <header className="h-16 border-b flex items-center px-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="ml-4">
                <h1 className="text-xl font-semibold">Habit Tracker</h1>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </DndProviderWrapper>
    </ThemeProvider>
  );
}
