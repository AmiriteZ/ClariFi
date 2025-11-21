import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import PageLoader from "./PageLoader";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Reset loading state when route changes
    setIsLoading(true);

    // Minimum 0.5 second display time for the loader
    const minLoadTime = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(minLoadTime);
  }, [location.pathname]);

  if (isLoading) {
    return <PageLoader />;
  }

  return <div className="page-fade-in">{children}</div>;
}
