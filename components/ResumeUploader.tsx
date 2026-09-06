"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Resume } from '../lib/types';

interface ResumeUploaderProps {
  onSuccess: (resume: Resume, wasSetAsCurrent: boolean) => void;
  forceIsCurrent?: boolean;
}

export default function ResumeUploader({ onSuccess, forceIsCurrent = false }: ResumeUploaderProps) {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [isCurrentResume, setIsCurrentResume] = useState(forceIsCurrent);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");

  const handleUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile || !versionLabel) return;
    setIsUploading(true);
    setUploadError("");
    setUploadWarning("");

    const formData = new FormData();
    formData.append('file', resumeFile);
    formData.append('version_label', versionLabel);
    // If forced, always send 'true', otherwise send the state
    const currentVal = forceIsCurrent ? true : isCurrentResume;
    formData.append('is_current', String(currentVal));

    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload resume");

      if (data.extractionFailed) {
        setUploadWarning("Upload successful, but text extraction failed. AI fit analysis will not run when using this resume.");
      } else {
        setUploadWarning("");
      }

      // Reset local state first
      setResumeFile(null);
      setVersionLabel("");
      if (!forceIsCurrent) {
        setIsCurrentResume(false);
      }
      
      // Let parent component handle the state update (e.g. prepending to list, updating existing `is_current` flags)
      onSuccess(data.data, currentVal);
      
      // We don't call router.refresh() here, the parent handles its own router.refresh or redirect
    } catch (err: unknown) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUploadResume} className="w-full bg-gray-50 dark:bg-zinc-950 p-4 rounded-md border border-gray-200 dark:border-zinc-800">
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
      
      {!forceIsCurrent && (
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
      )}

      <button
        type="submit"
        disabled={isUploading || !resumeFile || !versionLabel}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 transition-colors"
      >
        {isUploading ? "Uploading..." : "Upload Resume"}
      </button>
      {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
      {uploadWarning && <p className="mt-3 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-3 rounded-md border border-amber-200 dark:border-amber-900/50">{uploadWarning}</p>}
    </form>
  );
}
