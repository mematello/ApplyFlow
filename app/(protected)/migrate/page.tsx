"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApplications } from "../../../lib/local/applications";
import { clearDb } from "../../../lib/local/db";
import { Sparkles } from "lucide-react";

export default function MigratePage() {
  const router = useRouter();
  const [status, setStatus] = useState("Checking for local data...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runMigration() {
      try {
        const localApps = await getApplications();
        
        if (!localApps || localApps.length === 0) {
          if (isMounted) setStatus("No local data to sync. Redirecting...");
          setTimeout(() => router.push("/dashboard"), 1000);
          return;
        }

        if (isMounted) setStatus(`Syncing ${localApps.length} local application(s) to your account...`);

        const res = await fetch("/api/applications/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applications: localApps }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to migrate data");
        }

        if (isMounted) setStatus("Sync complete! Cleaning up...");
        await clearDb();

        setTimeout(() => router.push("/dashboard"), 1000);

      } catch (err: unknown) {
        console.error("Migration failed:", err);
        if (isMounted) {
          setErrorMsg("Couldn't sync your local data — it's still saved on this device, we'll retry next visit.");
          setStatus("Redirecting to dashboard...");
        }
        // Redirect to dashboard anyway after a short delay
        setTimeout(() => router.push("/dashboard"), 3000);
      }
    }

    runMigration();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-8">
        <Sparkles className="w-12 h-12 text-blue-500 animate-pulse mx-auto" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
        Setting up your account
      </h1>
      <p className="text-gray-600 dark:text-zinc-400 mb-4">{status}</p>
      
      {errorMsg && (
        <div className="mt-4 p-4 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 rounded-lg max-w-md text-sm">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
