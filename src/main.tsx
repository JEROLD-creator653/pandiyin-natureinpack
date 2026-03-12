import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./global-animations.css";
import loadingGif from "./assets/loading-screen.gif";

// Preload loading GIF into browser cache immediately
const preloadLoader = new Image();
preloadLoader.src = loadingGif;
import { setupPerformanceOptimizations } from "./lib/performance";

// Preload hero banner from cache BEFORE React renders
// If the index.html inline script already started the download, reuse that.
// Otherwise, start a new download from localStorage cache.
(function preloadHeroBanner() {
  try {
    // Check if index.html already started the download
    const earlyImg = (window as any).__earlyHeroBanner as HTMLImageElement | undefined;
    if (earlyImg) {
      (window as any).__heroBannerPreloaded = earlyImg;
      return;
    }
    
    const cachedUrl = localStorage.getItem('hero_banner_url');
    if (cachedUrl) {
      const img = new Image();
      img.src = cachedUrl;
      (window as any).__heroBannerPreloaded = img;
    }
  } catch (e) {
    // localStorage may not be available
  }
})();

// Initialize performance optimizations
setupPerformanceOptimizations();

createRoot(document.getElementById("root")!).render(<App />);
