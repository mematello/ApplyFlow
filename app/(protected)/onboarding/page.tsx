"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import ResumeUploader from '../../../components/ResumeUploader';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [detectedTz, setDetectedTz] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    try {
      setDetectedTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch (e) {
      setDetectedTz("UTC");
    }
  }, []);

  const isSavingRef = useRef(false);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isSavingRef.current) return;
    
    isSavingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, full_name: name.trim() });

      if (insertError) {
        setError(insertError.message);
      } else {
        setStep(2);
      }
    } finally {
      isSavingRef.current = false;
      setLoading(false);
    }
  };

  const handleTimeSubmit = async (e: React.FormEvent, skip = false) => {
    if (e) e.preventDefault();
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const timeToSave = skip ? "09:00" : reminderTime;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          reminder_timezone: detectedTz, 
          reminder_send_time: timeToSave 
        })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setStep(3);
      }
    } finally {
      isSavingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-lg rounded-lg border p-6 shadow-md bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <h1 className="mb-2 text-2xl font-bold text-center text-gray-900 dark:text-zinc-100">Welcome to ApplyFlow!</h1>
        <p className="mb-6 text-sm text-center text-gray-500 dark:text-zinc-400">
          {step === 1 && "Let's get your profile set up."}
          {step === 2 && "When would you like to receive follow-up reminders?"}
          {step === 3 && "Upload an initial resume for AI matching (Optional)"}
        </p>

        {step === 1 && (
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">What&apos;s your name?</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 w-full text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-600 p-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-sm"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => handleTimeSubmit(e, false)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Reminder Time</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                required
                className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 w-full text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                We&apos;ve detected your timezone as <strong>{detectedTz}</strong>.
              </p>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-600 p-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors shadow-sm"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
            <button
              type="button"
              onClick={(e) => handleTimeSubmit(e, true)}
              disabled={loading}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors py-2 text-center"
            >
              Skip for now
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <ResumeUploader 
              forceIsCurrent={true} 
              onSuccess={() => router.push('/dashboard')} 
            />
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors py-2 text-center"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

