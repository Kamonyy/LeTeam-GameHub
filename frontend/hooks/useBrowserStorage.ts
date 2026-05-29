'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type SetStateAction<T> = T | ((prev: T | null) => T | null);

export function useBrowserStorage<T>(
  key: string,
  readValue: () => T | null,
  writeValue: (value: T) => void,
  serverFallback: T | null = null
) {
  const [value, setValue] = useState<T | null>(serverFallback);
  const [isHydrated, setIsHydrated] = useState(false);
  const readRef = useRef(readValue);
  readRef.current = readValue;

  useEffect(() => {
    setValue(readRef.current());
    setIsHydrated(true);
  }, [key]);

  const setStoredValue = useCallback(
    (next: SetStateAction<T | null>) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ?
            (next as (previous: T | null) => T | null)(prev)
          : next;
        if (resolved != null) {
          writeValue(resolved);
        }
        return resolved;
      });
    },
    [writeValue]
  );

  return { value, setValue: setStoredValue, isHydrated };
}
