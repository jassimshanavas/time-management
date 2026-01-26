'use client';

import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { useEffect, useState } from 'react';

export function DataLoader({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { userId, setUserId, loadAllData, tasks } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      if (user) {
        // If user changed, reload everything
        if (user.uid !== userId) {
          setIsLoading(true);
          setUserId(user.uid);
          await loadAllData();
          setIsLoading(false);
        } else if (tasks.length === 0) {
          // Only show loading if we have no cached data
          setIsLoading(true);
          await loadAllData();
          setIsLoading(false);
        } else {
          // We have cached data, show it immediately and reload in background
          setIsLoading(false);
          loadAllData(); // Background refresh, no await
        }
      } else {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [user, userId, setUserId, loadAllData, tasks.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your data...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
