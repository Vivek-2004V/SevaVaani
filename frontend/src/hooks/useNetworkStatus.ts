/**
 * useNetworkStatus — tracks online/offline state in real time.
 *
 * Uses the browser's navigator.onLine property and the 'online' / 'offline'
 * window events. Both fire reliably on Chrome/Firefox/Safari (including mobile).
 *
 * Note: navigator.onLine being true does NOT guarantee server reachability —
 * it only means a network interface is connected. We treat "online" as
 * "probably connected" and surface the actual backend failure at the API layer.
 */
import { useState, useEffect } from 'react';

export interface NetworkStatus {
  /** True when the browser reports a network connection */
  isOnline: boolean;
  /** True when we are *currently* detecting offline state */
  isOffline: boolean;
  /** ISO timestamp of the last status change */
  lastChanged: string;
  /** How many times connection dropped in this session */
  dropCount: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastChanged, setLastChanged] = useState<string>(new Date().toISOString());
  const [dropCount, setDropCount] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChanged(new Date().toISOString());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChanged(new Date().toISOString());
      setDropCount((c) => c + 1);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastChanged,
    dropCount,
  };
}
