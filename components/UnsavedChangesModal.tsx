import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({ isOpen, onConfirm, onCancel }: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Unsaved Changes</h3>
          </div>
          <p className="text-gray-600 dark:text-zinc-400 pl-14">
            You have unsaved changes. Are you sure you want to leave this page? Your edits will be lost.
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-zinc-950 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            Stay on Page
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors"
          >
            Leave Page
          </button>
        </div>
      </div>
    </div>
  );
}
