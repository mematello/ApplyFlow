"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApplications } from "../../../lib/local/applications";
import { clearDb } from "../../../lib/local/db";
import { Sparkles } from "lucide-react";
import { Application } from "../../../lib/types";

export default function MigratePage() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking for local data...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [appsToMerge, setAppsToMerge] = useState<Application[] | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [intent, setIntent] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Read intent without triggering suspense requirements
    const urlParams = new URLSearchParams(window.location.search);
    const intentParam = urlParams.get('intent');
    if (isMounted) setIntent(intentParam);

    async function checkLocalData() {
      try {
        const localApps = await getApplications();
        
        if (!localApps || localApps.length === 0) {
          if (isMounted) setStatus("No local data to sync. Redirecting...");
          setTimeout(() => router.push("/dashboard"), 1000);
          return;
        }

        if (isMounted) {
          // Explicit casting to match state type since getApplications might return unknown[]
          setAppsToMerge(localApps as Application[]);
          setStatus(""); // clear status text to show prompt
        }
      } catch (err: unknown) {
        console.error("Local check failed:", err);
        setTimeout(() => router.push("/dashboard"), 1000);
      }
    }

    checkLocalData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleMerge = async () => {
    if (!appsToMerge) return;
    setIsMerging(true);
    setStatus(`Syncing ${appsToMerge.length} local application(s) to your account...`);
    try {
      const res = await fetch("/api/applications/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications: appsToMerge }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to migrate data");
      }

      setStatus("Sync complete! Cleaning up...");
      await clearDb();

      setTimeout(() => router.push("/dashboard"), 1000);

    } catch (err: unknown) {
      console.error("Migration failed:", err);
      setErrorMsg("Couldn't sync your local data — it's still saved on this device, we'll retry next visit.");
      setStatus("Redirecting to dashboard...");
      setTimeout(() => router.push("/dashboard"), 3000);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  const handleDelete = async () => {
    await clearDb();
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-8">
        <Sparkles className="w-12 h-12 text-blue-500 animate-pulse mx-auto" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
        Setting up your account
      </h1>
      
      {status && <p className="text-gray-600 dark:text-zinc-400 mb-4">{status}</p>}
      
      {appsToMerge && !isMerging && !errorMsg && (
        <div className="mt-4 flex flex-col gap-4 items-center animate-in fade-in zoom-in duration-300">
          <p className="text-gray-900 dark:text-zinc-100 font-medium text-lg mb-4">
            We found {appsToMerge.length} saved application(s) on this browser — add them to your account?
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl justify-center">
            <button 
              onClick={handleMerge}
              className={`px-4 py-2 rounded-md transition-colors ${intent === 'signup' ? 'bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm' : 'bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 font-medium'}`}
            >
              Yes, add them
            </button>
            <button 
              onClick={handleSkip}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700 rounded-md font-medium transition-colors"
            >
              Skip for now
            </button>
            <button 
              onClick={handleDelete}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-red-600 dark:text-red-400 border border-gray-200 dark:border-zinc-700 rounded-md font-medium transition-colors"
            >
              Not mine — delete it
            </button>
          </div>
        </div>
      )}
      
      {errorMsg && (
        <div className="mt-4 p-4 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 rounded-lg max-w-md text-sm mx-auto">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
