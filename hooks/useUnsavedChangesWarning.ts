import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChangesWarning(isDirty: boolean) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'back' | 'push', url?: string } | null>(null);
  
  const isNavigatingAway = useRef(false);

  useEffect(() => {
    // 1. Guard against hard navigations (refresh, close tab)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty || isNavigatingAway.current) return;
      e.preventDefault();
      e.returnValue = ''; // Required for some browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    // 2. Guard against in-app link clicks
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty || isNavigatingAway.current) return;

      // Bypass modifier clicks (so user can open in new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      // Ignore external links, downloads, new tabs, and same-page hashes
      if (!href || href.startsWith('_') || anchor.hasAttribute('download') || anchor.getAttribute('target') === '_blank' || href.startsWith('#')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setPendingAction({ type: 'push', url: href });
      setShowModal(true);
    };

    // Use capture phase to intercept before Next.js Link handles it
    document.addEventListener('click', handleAnchorClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
    };
  }, [isDirty]);

  useEffect(() => {
    // 3. Guard against browser Back/Forward (popstate)
    // We use the "guard state" pattern. When the form becomes dirty,
    // we push a duplicate history entry. The first time the user clicks "Back"
    // or swipes back, they consume this duplicate entry (URL doesn't change).
    // We intercept that popstate and show our custom modal.
    
    if (isDirty) {
      // Proactively push a guard state so the first back action doesn't change the URL
      window.history.pushState(null, '', window.location.href);

      const handlePopState = () => {
        if (isNavigatingAway.current) return;

        // User swiped or clicked back. Show our custom modal to confirm.
        setPendingAction({ type: 'back' });
        setShowModal(true);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isDirty]);

  const confirmNavigation = () => {
    isNavigatingAway.current = true;
    setShowModal(false);
    
    if (pendingAction?.type === 'push' && pendingAction.url) {
      router.push(pendingAction.url);
    } else if (pendingAction?.type === 'back') {
      window.history.back();
    }
    setPendingAction(null);
  };

  const cancelNavigation = () => {
    setShowModal(false);
    if (pendingAction?.type === 'back') {
      // User canceled back navigation. We must re-insert the guard state
      // because they already consumed it when they swiped/clicked back.
      window.history.pushState(null, '', window.location.href);
    }
    setPendingAction(null);
  };

  return { showModal, confirmNavigation, cancelNavigation };
}
