import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

export function ScreenOrientationLock() {
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  useEffect(() => {
    function checkOrientation() {
      // Check if it's mobile (width < 768px in portrait or height < 768px in landscape?)
      // Better check: is width > height (landscape) AND height < 500 (typical mobile width becomes height)
      const isLandscape = window.innerWidth > window.innerHeight;
      const isMobileSize = window.innerHeight < 600 && window.innerWidth < 950; // flexible bounds for mobile landscape

      setIsLandscapeMobile(isLandscape && isMobileSize);
    }

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!isLandscapeMobile) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-900 flex flex-col items-center justify-center text-center p-6 text-white animate-in fade-in duration-300">
      <div className="animate-pulse">
        <Smartphone className="w-16 h-16 mb-4 rotate-90 mx-auto" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Please Rotate Your Device</h2>
      <p className="text-neutral-400 max-w-xs mx-auto">
        We rely on a specific layout for the best experience. Please switch back
        to portrait mode.
      </p>
    </div>
  );
}
