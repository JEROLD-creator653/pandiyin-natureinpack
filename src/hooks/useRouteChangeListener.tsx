import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteChangeListenerOptions {
  onRouteChangeStart?: (path: string) => void;
  onRouteChangeComplete?: (path: string) => void;
  minLoadDuration?: number;
  excludePaths?: string[];
}

/**
 * Hook that detects route changes and triggers loader callbacks.
 * Fires onRouteChangeStart immediately, then onRouteChangeComplete
 * after minLoadDuration has elapsed.
 */
export const useRouteChangeListener = ({
  onRouteChangeStart,
  onRouteChangeComplete,
  minLoadDuration = 1200,
  excludePaths = ['/auth'],
}: RouteChangeListenerOptions) => {
  const location = useLocation();
  const prevLocationRef = useRef(location.pathname);
  const isInitialMount = useRef(true);
  const timerId = useRef<number>();

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevLocationRef.current = location.pathname;
      return;
    }

    const currentPath = location.pathname;
    const prevPath = prevLocationRef.current;

    if (currentPath === prevPath) return;

    prevLocationRef.current = currentPath;

    const shouldExclude = excludePaths.some(
      (excludePath) => currentPath.startsWith(excludePath)
    );

    if (shouldExclude) return;

    // Fire start immediately
    onRouteChangeStart?.(currentPath);

    // Fire complete after minLoadDuration
    if (timerId.current) window.clearTimeout(timerId.current);
    timerId.current = window.setTimeout(() => {
      onRouteChangeComplete?.(currentPath);
    }, minLoadDuration);

    return () => {
      if (timerId.current) window.clearTimeout(timerId.current);
    };
  }, [location.pathname, onRouteChangeStart, onRouteChangeComplete, minLoadDuration, excludePaths]);
};
