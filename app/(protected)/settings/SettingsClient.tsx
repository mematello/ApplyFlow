"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { createClient } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import ResumePreviewModal from "../../../components/ResumePreviewModal";

export default function SettingsClient({ 
  initialProfile, 
  applications,
  resumes: initialResumes,
  userEmail 
}: { 
  initialProfile: any; 
  applications: any[];
  resumes: any[];
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

  // Resumes state
  const [resumes, setResumes] = useState(initialResumes);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [isCurrentResume, setIsCurrentResume] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);

  // Deletion Form
  const [deleteStep, setDeleteStep] = useState(0);
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

  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile || !versionLabel) return;
    setIsUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append('file', resumeFile);
    formData.append('version_label', versionLabel);
    formData.append('is_current', String(isCurrentResume));

    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload resume");

      router.refresh();
      if (isCurrentResume) {
         setResumes(prev => prev.map(r => ({ ...r, is_current: false })).concat(data.data).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } else {
         setResumes(prev => [data.data, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      setResumeFile(null);
      setVersionLabel("");
      setIsCurrentResume(false);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResume = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setResumes(prev => prev.filter(r => r.id !== id));
      router.refresh();
    } catch (err: any) {
      alert("Failed to delete resume: " + err.message);
    }
  }

  const handleSetCurrentResume = async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current: true })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setResumes(prev => prev.map(r => ({ ...r, is_current: r.id === id })));
      router.refresh();
    } catch (err: any) {
      alert("Failed to update current resume: " + err.message);
    }
  }

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

      {/* Resumes Section */}
      <section className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 border-b border-gray-200 dark:border-zinc-800 pb-4">Resumes</h2>
        
        {/* Upload Form */}
        <form onSubmit={handleUploadResume} className="w-full mb-8 bg-gray-50 dark:bg-zinc-950 p-4 rounded-md border border-gray-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-4">Upload New Resume</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">File (PDF or DOCX, max 5MB)</label>
              <input 
                type="file" 
                accept=".pdf,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                required
                className="w-full text-sm text-gray-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400 dark:hover:file:bg-blue-900/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Version Label</label>
              <input
                type="text"
                placeholder="e.g. Frontend Dev 2026"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                required
                className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 w-full text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="checkbox" 
              id="is_current_resume"
              checked={isCurrentResume}
              onChange={(e) => setIsCurrentResume(e.target.checked)}
              className="w-4 h-4 rounded bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_current_resume" className="text-sm text-gray-700 dark:text-zinc-300">Set as current default</label>
          </div>

          <button
            type="submit"
            disabled={isUploading || !resumeFile || !versionLabel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            {isUploading ? "Uploading..." : "Upload Resume"}
          </button>
          {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
        </form>

        {/* List of Resumes */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">Saved Resumes</h3>
          {resumes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400">No resumes uploaded yet.</p>
          ) : (
            resumes.map(r => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md shadow-sm">
                <div className="mb-3 sm:mb-0">
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setPreviewResumeId(r.id)}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400 text-left"
                    >
                      {r.version_label}
                    </button>
                    {r.is_current && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium">Current</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Uploaded: {new Date(r.created_at).toLocaleDateString()}
                    {r.extracted_text === null && <span className="text-red-500 ml-2">(Text extraction failed)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {!r.is_current && (
                    <button 
                      onClick={() => handleSetCurrentResume(r.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      Set as current
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteResume(r.id)}
                    className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
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

        {deleteStep === 0 && (
          <button
            onClick={() => setDeleteStep(1)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/50 rounded-md font-medium transition-colors"
          >
            Delete Account
          </button>
        )}

        {deleteStep === 1 && (
          <div className="w-full bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-100 dark:border-red-900/50">
            <p className="font-medium text-red-800 dark:text-red-400 mb-4">
              Are you sure you want to delete your account? This cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteStep(0)}
                className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {deleteStep === 2 && (
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
            <div className="flex gap-4">
              <button
                onClick={() => { setDeleteStep(0); setDeleteEmail(""); setDeleteError(""); }}
                className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border border-gray-300 dark:border-zinc-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteEmail !== userEmail}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:opacity-50 disabled:bg-red-400 transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
          </div>
        )}
      </section>
      <ResumePreviewModal resumeId={previewResumeId} onClose={() => setPreviewResumeId(null)} />
    </div>
  );
}
