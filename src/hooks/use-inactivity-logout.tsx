import { useEffect, useRef, useCallback } from 'react';
import { useDisconnect, useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_TIME = 30 * 1000; // Show warning 30 seconds before logout

export function useInactivityLogout() {
  const { disconnect } = useDisconnect();
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
  }, []);

  const handleLogout = useCallback(() => {
    disconnect();
    toast({
      title: "Session Expired",
      description: "You've been logged out due to inactivity.",
      variant: "destructive",
    });
  }, [disconnect, toast]);

  const showWarning = useCallback(() => {
    toast({
      title: "Inactivity Warning",
      description: "You will be logged out in 30 seconds due to inactivity.",
    });
  }, [toast]);

  const resetTimer = useCallback(() => {
    if (!isConnected) return;

    clearTimers();

    // Set warning timer (show warning 30 seconds before logout)
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  }, [isConnected, clearTimers, handleLogout, showWarning]);

  useEffect(() => {
    if (!isConnected) {
      clearTimers();
      return;
    }

    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Reset timer on any user activity
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      clearTimers();
    };
  }, [isConnected, resetTimer, clearTimers]);
}
