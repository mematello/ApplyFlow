"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ResumePreviewModalProps {
  resumeId: string | null;
  onClose: () => void;
}

export default function ResumePreviewModal({ resumeId, onClose }: ResumePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ signedUrl: string, isPdf: boolean, extractedText: string | null } | null>(null);

  useEffect(() => {
    if (!resumeId) return;

    const fetchPreview = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/resumes/${resumeId}/preview`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load preview");
        setData(json);
      } catch (err: unknown) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [resumeId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!resumeId) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Resume Preview</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 p-4 overflow-hidden relative flex flex-col">
          {loading && <div className="absolute inset-0 flex items-center justify-center text-gray-500">Loading preview...</div>}
          {error && <div className="absolute inset-0 flex items-center justify-center text-red-500">{error}</div>}
          
          {data && !loading && !error && (
            <>
              {data.isPdf ? (
                <iframe src={data.signedUrl} className="w-full h-full border-0 rounded" />
              ) : data.extractedText ? (
                <div className="w-full h-full overflow-y-auto whitespace-pre-wrap p-6 bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-zinc-200 rounded text-sm leading-relaxed border border-gray-200 dark:border-zinc-800">
                  {data.extractedText}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="mb-4 text-gray-600 dark:text-zinc-400">Preview unavailable — download the file to view it.</p>
                  <a href={data.signedUrl} download className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
                    Download Resume
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
