import { useEffect, useRef } from 'react';

/**
 * Custom hook to request and maintain a Screen Wake Lock.
 * This prevents mobile devices from dimming or turning off the screen
 * during gameplay, configuration, or map/magic editing.
 */
export function useWakeLock() {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function requestWakeLock() {
      // Check if Wake Lock API is supported
      if (!('wakeLock' in navigator)) {
        console.warn('Screen Wake Lock API is not supported in this browser.');
        return;
      }

      try {
        // If already holding a wake lock, don't request a duplicate
        if (wakeLockRef.current) {
          return;
        }

        // Request screen wake lock
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        if (isMounted) {
          wakeLockRef.current = wakeLock;
          console.log('Screen Wake Lock acquired successfully.');

          // Listen for sudden release (e.g. system low power mode, window unfocus)
          wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock was released.');
            if (isMounted) {
              wakeLockRef.current = null;
            }
          });
        }
      } catch (err: any) {
        console.warn(`Failed to acquire Screen Wake Lock: ${err.name} - ${err.message}`);
      }
    }

    // Re-acquire lock when tab gains focus/visibility
    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      } else {
        wakeLockRef.current = null;
      }
    }

    // Attempt to acquire wake lock on mount
    requestWakeLock();

    // Listen for visibility change to keep the lock active
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also request wake lock on touch/interaction as browsers may block non-user-gesture requests
    const handleUserInteraction = () => {
      requestWakeLock();
    };
    window.addEventListener('click', handleUserInteraction, { once: true });
    window.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release().then(() => {
            wakeLockRef.current = null;
            console.log('Screen Wake Lock released cleanly on unmount.');
          }).catch((err: any) => {
            console.warn('Error while releasing Screen Wake Lock:', err);
          });
        } catch (e) {
          console.warn('Synchronous error releasing Screen Wake Lock:', e);
        }
      }
    };
  }, []);
}
