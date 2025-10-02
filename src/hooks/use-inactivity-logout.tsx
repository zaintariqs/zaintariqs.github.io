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
  const disconnectRef = useRef(disconnect);
  const toastRef = useRef(toast);

  // Keep refs up to date
  useEffect(() => {
    disconnectRef.current = disconnect;
    toastRef.current = toast;
  }, [disconnect, toast]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = undefined;
    }
  }, []);

  const handleLogout = useCallback(() => {
    console.log('[Inactivity Logout] Logging out due to inactivity');
    clearTimers();
    disconnectRef.current();
    toastRef.current({
      title: "Session Expired",
      description: "You've been logged out due to inactivity.",
      variant: "destructive",
    });
  }, [clearTimers]);

  const showWarning = useCallback(() => {
    console.log('[Inactivity Logout] Showing inactivity warning');
    toastRef.current({
      title: "Inactivity Warning",
      description: "You will be logged out in 30 seconds due to inactivity.",
    });
  }, []);

  const resetTimer = useCallback(() => {
    if (!isConnected) return;

    clearTimers();

    console.log('[Inactivity Logout] Timer reset - will logout in 5 minutes');

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
      console.log('[Inactivity Logout] User not connected, clearing timers');
      clearTimers();
      return;
    }

    console.log('[Inactivity Logout] Setting up inactivity detection');

    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle mousemove to avoid excessive resets
    let mouseMoveTimeout: NodeJS.Timeout;
    const throttledMouseMove = () => {
      if (!mouseMoveTimeout) {
        mouseMoveTimeout = setTimeout(() => {
          resetTimer();
          mouseMoveTimeout = undefined as any;
        }, 1000); // Throttle to once per second
      }
    };

    // Reset timer on any user activity
    const handleActivity = (event: Event) => {
      if (event.type === 'mousemove') {
        throttledMouseMove();
      } else {
        resetTimer();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      console.log('[Inactivity Logout] Cleaning up inactivity detection');
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (mouseMoveTimeout) {
        clearTimeout(mouseMoveTimeout);
      }
      clearTimers();
    };
  }, [isConnected, resetTimer, clearTimers]);
}
