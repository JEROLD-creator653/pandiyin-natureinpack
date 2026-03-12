import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouteChangeListener } from '@/hooks/useRouteChangeListener';
import loadingGif from '@/assets/loading-screen.gif';

interface RouteLoaderContextType {
  isLoading: boolean;
  startRouteLoad: (minDuration?: number) => void;
  endRouteLoad: () => void;
  forceLoad: (duration: number) => Promise<void>;
  registerDataLoad: (promise: Promise<any>) => Promise<any>;
}

const RouteLoaderContext = createContext<RouteLoaderContextType | undefined>(undefined);

export const useRouteLoader = () => {
  const context = useContext(RouteLoaderContext);
  if (!context) {
    throw new Error('useRouteLoader must be used within RouteLoaderProvider');
  }
  return context;
};

interface RouteLoaderProviderProps {
  children: React.ReactNode;
  minLoadDuration?: number;
  maxLoadDuration?: number;
  autoTrigger?: boolean;
  excludePaths?: string[];
}

export const RouteLoaderProvider: React.FC<RouteLoaderProviderProps> = ({ 
  children,
  minLoadDuration = 1200,
  maxLoadDuration = 2100,
  autoTrigger = true,
  excludePaths = ['/auth']
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const loadingStartTime = useRef<number>(0);
  const minLoadDurationRef = useRef<number>(minLoadDuration);
  const timerIds = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    timerIds.current.forEach(id => window.clearTimeout(id));
    timerIds.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timerIds.current.push(id);
    return id;
  }, []);

  const dismiss = useCallback(() => {
    clearAllTimers();
    setIsLoading(false);
  }, [clearAllTimers]);

  const startRouteLoad = useCallback((customMinDuration?: number) => {
    clearAllTimers();
    setIsLoading(true);
    loadingStartTime.current = Date.now();
    minLoadDurationRef.current = customMinDuration || minLoadDuration;

    // Auto-dismiss after min duration
    addTimer(() => {
      setIsLoading(false);
    }, minLoadDurationRef.current);

    // Hard safety: ALWAYS dismiss after maxLoadDuration no matter what
    addTimer(() => {
      setIsLoading(false);
    }, maxLoadDuration);
  }, [minLoadDuration, maxLoadDuration, clearAllTimers, addTimer]);

  const endRouteLoad = useCallback(() => {
    const elapsed = Date.now() - loadingStartTime.current;
    
    if (elapsed >= minLoadDurationRef.current) {
      dismiss();
    } else {
      const remaining = minLoadDurationRef.current - elapsed;
      addTimer(dismiss, remaining);
    }
  }, [dismiss, addTimer]);

  const forceLoad = useCallback(async (duration: number) => {
    clearAllTimers();
    setIsLoading(true);
    loadingStartTime.current = Date.now();

    return new Promise<void>((resolve) => {
      addTimer(() => {
        setIsLoading(false);
        resolve();
      }, duration);
    });
  }, [clearAllTimers, addTimer]);

  const registerDataLoad = useCallback((promise: Promise<any>): Promise<any> => {
    return promise;
  }, []);

  useRouteChangeListener({
    onRouteChangeStart: (path) => {
      if (autoTrigger) startRouteLoad();
    },
    onRouteChangeComplete: (path) => {
      if (autoTrigger) endRouteLoad();
    },
    minLoadDuration,
    excludePaths,
  });

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const value: RouteLoaderContextType = {
    isLoading,
    startRouteLoad,
    endRouteLoad,
    forceLoad,
    registerDataLoad,
  };

  return (
    <RouteLoaderContext.Provider value={value}>
      {children}
      <GlobalRouteLoader isLoading={isLoading} />
    </RouteLoaderContext.Provider>
  );
};

interface GlobalRouteLoaderProps {
  isLoading: boolean;
}

const GlobalRouteLoader: React.FC<GlobalRouteLoaderProps> = ({ isLoading }) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          key="route-loader"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/90"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-3">
            <img
              src={loadingGif}
              alt="Loading"
              className="w-32 h-32 object-contain"
            />
            <motion.p
              className="text-sm font-medium text-muted-foreground tracking-widest"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              Loading...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
