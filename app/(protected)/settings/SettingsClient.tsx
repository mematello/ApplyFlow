"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { createClient } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsClient({ 
  initialProfile, 
  applications,
  userEmail 
}: { 
  initialProfile: any; 
  applications: any[];
  userEmail: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Profile Form
  const [fullName, setFullName] = useState(initialProfile.full_name || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // Deletion Form
  const [deleteEmail, setDeleteEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage("");

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', initialProfile.id);

    if (error) {
      setProfileMessage(`Error: ${error.message}`);
    } else {
      setProfileMessage("Profile updated successfully!");
      router.refresh();
    }
    setIsSavingProfile(false);
  };

  const handleDownloadCSV = () => {
    if (!applications || applications.length === 0) {
      alert("No applications to export.");
      return;
    }

    const headers = Object.keys(applications[0]);
    const csvContent = [
      headers.join(','),
      ...applications.map(app => 
        headers.map(header => {
          let val = app[header];
          if (val === null || val === undefined) val = "";
          // Escape quotes and wrap in quotes for CSV
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "applications_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAccount = async () => {
    if (deleteEmail !== userEmail) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
      
      await supabase.auth.signOut();
      router.push('/login?message=Your+account+has+been+deleted.');
    } catch (err: any) {
      setDeleteError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Profile Section */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Profile</h2>
        <form onSubmit={handleSaveProfile} className="w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 w-full text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none mb-4"
          />
          <button
            type="submit"
            disabled={isSavingProfile || fullName === initialProfile.full_name}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            {isSavingProfile ? "Saving..." : "Save Profile"}
          </button>
          {profileMessage && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{profileMessage}</p>}
        </form>
      </section>

      {/* Appearance Section */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Appearance</h2>
        <div className="flex gap-4">
          {mounted && ['light', 'dark', 'system'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded-md font-medium capitalize border transition-colors ${
                theme === t 
                  ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent' 
                  : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Data Export */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Data Export</h2>
        <p className="text-gray-600 dark:text-zinc-400 mb-4">Download a complete copy of all your tracked applications.</p>
        <button
          onClick={handleDownloadCSV}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
        >
          Download as CSV
        </button>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-500 mb-6 border-b border-red-100 dark:border-red-900/30 pb-4">Danger Zone</h2>
        <p className="text-gray-600 dark:text-zinc-400 mb-4">
          Permanently delete your account and all associated applications. This action cannot be undone.
        </p>
        <div className="w-full bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-100 dark:border-red-900/50">
          <label className="block text-sm font-medium text-red-800 dark:text-red-400 mb-2">
            Type <span className="font-bold select-all">{userEmail}</span> to confirm
          </label>
          <input
            type="email"
            value={deleteEmail}
            onChange={(e) => setDeleteEmail(e.target.value)}
            className="rounded border border-red-300 dark:border-red-800/50 bg-white dark:bg-zinc-900 p-2 w-full text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-red-500 outline-none mb-4"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting || deleteEmail !== userEmail}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:opacity-50 disabled:bg-red-400 transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
          {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
        </div>
      </section>
    </div>
  );
}
