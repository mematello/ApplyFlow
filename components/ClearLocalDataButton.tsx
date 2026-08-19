"use client";

import { useState } from "react";
import { clearDb } from "../lib/local/db";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ClearLocalDataButton() {
  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();

  const handleClear = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete all local application data? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setIsClearing(true);
      await clearDb();
      window.alert("Local data cleared successfully.");
      // Force reload to reset state
      window.location.reload();
    } catch (err) {
      console.error("Failed to clear local data:", err);
      window.alert("Failed to clear local data. Check console for details.");
      setIsClearing(false);
    }
  };

  return (
    <button
      onClick={handleClear}
      disabled={isClearing}
      className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-md text-sm font-medium transition-colors disabled:opacity-50 min-h-[44px]"
    >
      <Trash2 className="w-4 h-4" />
      {isClearing ? "Clearing..." : "Clear Local Data"}
    </button>
  );
}
