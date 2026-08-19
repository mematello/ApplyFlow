"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the banner
    const hasConsented = localStorage.getItem('applyflow_cookie_consent');
    if (!hasConsented) {
      setShowBanner(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('applyflow_cookie_consent', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 sm:px-6 sm:py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 pr-4 sm:pr-0">
          <p className="mb-1 font-semibold text-gray-900 dark:text-zinc-100">Essential Cookies Only</p>
          <p className="hidden sm:block">
            We only use essential cookies to keep you logged in and local storage to save your UI preferences. 
            We do not use tracking or marketing cookies. Learn more in our{' '}
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </Link>.
          </p>
          <p className="sm:hidden">
            We use essential cookies for auth and preferences. No tracking. See our{' '}
            <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-6 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0"
        >
          Understood
        </button>
      </div>
    </div>
  );
}
