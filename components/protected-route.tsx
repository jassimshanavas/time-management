'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" suppressHydrationWarning={true}>
        <div className="text-center" suppressHydrationWarning={true}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" suppressHydrationWarning={true}></div>
          <p className="text-muted-foreground" suppressHydrationWarning={true}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
