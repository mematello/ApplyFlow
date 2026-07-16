"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Check your email for the magic link!");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-sm rounded-lg border p-6 shadow-md bg-zinc-900 border-zinc-800 text-white">
        <h1 className="mb-6 text-2xl font-bold text-center text-white">Sign In</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded border border-zinc-700 bg-zinc-800 p-2 w-full text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 p-2 text-white font-medium hover:bg-blue-700 disabled:bg-zinc-700 transition-colors"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-sm text-zinc-300">{message}</p>}
      </div>
    </div>
  );
}
