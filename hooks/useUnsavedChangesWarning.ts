import { useEffect } from 'react';

export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    // 1. Guard against hard navigations (refresh, close tab)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
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
      if (!isDirty) return;

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

      if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        e.preventDefault();
        e.stopPropagation();
      }
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
    // we push a duplicate history entry. The first time the user clicks "Back",
    // they consume this duplicate entry (URL doesn't change). We intercept that
    // popstate and ask for confirmation.
    
    if (isDirty) {
      // Proactively push a guard state so the first back action doesn't change the URL
      window.history.pushState(null, '', window.location.href);

      const handlePopState = () => {
        setTimeout(() => {
          if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
            // User confirmed. We want to actually go back now.
            window.removeEventListener('popstate', handlePopState);
            window.history.back();
          } else {
            // User canceled. We need to re-insert the guard state for the next time they hit back.
            window.history.pushState(null, '', window.location.href);
          }
        }, 0);
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isDirty]);
}
