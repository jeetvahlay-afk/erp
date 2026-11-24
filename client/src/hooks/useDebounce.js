import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce a value by a specified delay (ms).
 * @template T
 * @param {T} value - The input value to debounce.
 * @param {number} [delay=250] - Debounce delay in milliseconds.
 * @returns {T} The debounced value.
 */
export function useDebounce(value, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
