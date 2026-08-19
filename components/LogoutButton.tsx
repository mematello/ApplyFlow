"use client";

import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const openModal = () => {
    setIsMounted(true);
    setTimeout(() => setIsVisible(true), 10);
  };

  const closeModal = () => {
    setIsVisible(false);
    setTimeout(() => setIsMounted(false), 200); // 200ms matches transition duration
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (isMounted) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMounted]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh(); // Clear any server component cache
  };

  const modalContent = isMounted ? (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
      onClick={closeModal}
    >
      <div 
        className={`bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-sm p-6 overflow-hidden flex flex-col transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} 
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 mb-2">Log Out</h3>
        <p className="text-gray-600 dark:text-zinc-400 mb-6">Are you sure you want to log out of your account?</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={closeModal}
            className="px-4 py-2 text-gray-700 dark:text-zinc-300 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              closeModal();
              handleLogout();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={openModal}
        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
        title="Log Out"
      >
        <LogOut className="w-5 h-5" />
      </button>
      {typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
}
