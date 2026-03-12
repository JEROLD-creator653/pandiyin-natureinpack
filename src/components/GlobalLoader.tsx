import { AnimatePresence, motion } from 'framer-motion';
import loadingGif from '@/assets/loading-screen.gif';

/**
 * Simple loading fallback for Suspense boundaries ONLY.
 * Does NOT track global fetch state — that caused full-screen blocking on mobile.
 */
export const GlobalLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <img src={loadingGif} alt="Loading" className="w-24 h-24 object-contain" />
        <p className="text-sm font-medium text-muted-foreground tracking-widest animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
};
