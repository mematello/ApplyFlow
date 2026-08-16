"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('message')) {
      setMessage(params.get('message') as string);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      setIsError(true);
      
      let errMsg = error.message;
      if (!errMsg || (typeof errMsg === 'string' && errMsg === '{}') || typeof errMsg === 'object') {
        errMsg = "Error sending confirmation email. If using Resend sandbox, ensure this email is verified.";
      }

      if (typeof errMsg === 'string' && errMsg.toLowerCase().includes("signups not allowed")) {
         setMessage("No account found. Please sign up instead.");
      } else {
         setMessage(`Error: ${errMsg}`);
      }
    } else {
      setMessage("Click the link we sent to your email to log in.");
    }
    setLoading(false);
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-center text-gray-900 dark:text-zinc-100">Welcome Back</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 w-full text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 p-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-center text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {message}
        </p>
      )}
      <div className="mt-6 text-center text-sm text-gray-600 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
          Sign up
        </Link>
      </div>
    </>
  );
}
