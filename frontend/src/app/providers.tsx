'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '../shared/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const { setOnlineStatus, token, setToken, currentUser } = useAppStore();

  // Initialize theme from storage (default dark)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('samanvay-theme');
      if (saved === 'light') {
        useAppStore.getState().setTheme('light');
      } else {
        useAppStore.getState().setTheme('dark');
      }
    } catch {}
  }, []);

  // Startup session initialization with race cancellation
  useEffect(() => {
    let isCurrent = true;
    const targetEmail = currentUser?.email;
    const initSession = async () => {
      const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
      if (!token && targetEmail && demoPassword) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: targetEmail,
              password: demoPassword,
            }),
          });
          if (res.ok && isCurrent) {
            const data = await res.json();
            // Accept token only if persona has not changed during request
            if (data?.access_token && useAppStore.getState().currentUser?.email === targetEmail) {
              setToken(data.access_token);
            }
          }
        } catch {
          // Backend offline or unreachable at startup; unauthenticated state preserved
        }
      }
    };
    initSession();
    return () => {
      isCurrent = false;
    };
  }, [token, currentUser?.email, setToken]);

  // Clear stale cached queries and refetch when authenticated session or persona token changes
  useEffect(() => {
    if (token) {
      queryClient.clear();
      queryClient.invalidateQueries();
    }
  }, [token, queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      queryClient.invalidateQueries();
    };
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
