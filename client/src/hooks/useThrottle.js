import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook returning a throttled callback function.
 * Ensures the callback is executed at most once per `limit` ms.
 * Supports leading edge (instant trigger on initial invoke) and trailing edge.
 *
 * @template {(...args: any[]) => any} T
 * @param {T} callback - The callback function to throttle.
 * @param {number} [limit=1000] - Minimum duration in ms between invocations.
 * @param {object} [options={ leading: true, trailing: false }]
 * @returns {T & { cancel: () => void }} Memoized throttled function with .cancel()
 */
export function useThrottledCallback(callback, limit = 1000, options = { leading: true, trailing: false }) {
  const { leading = true, trailing = false } = options;
  const callbackRef = useRef(callback);
  const lastRanRef = useRef(0);
  const timerRef = useRef(null);
  const pendingArgsRef = useRef(null);

  // Keep callback reference updated without triggering re-creation
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const throttledFn = useCallback(
    (...args) => {
      const now = Date.now();
      const elapsed = now - lastRanRef.current;

      if (!lastRanRef.current && !leading) {
        lastRanRef.current = now;
      }

      if (elapsed >= limit) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        lastRanRef.current = now;
        return callbackRef.current(...args);
      }

      if (trailing) {
        pendingArgsRef.current = args;
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => {
            lastRanRef.current = leading ? Date.now() : 0;
            timerRef.current = null;
            if (pendingArgsRef.current) {
              const currentArgs = pendingArgsRef.current;
              pendingArgsRef.current = null;
              callbackRef.current(...currentArgs);
            }
          }, limit - elapsed);
        }
      }
    },
    [limit, leading, trailing]
  );

  throttledFn.cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingArgsRef.current = null;
  };

  return throttledFn;
}

export default useThrottledCallback;
