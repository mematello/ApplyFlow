import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/onboarding');
  }

  // Fetch applications for CSV export
  const { data: applications, error: appError } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', user.id);

  if (appError) {
    console.error("Error fetching applications:", appError);
  }

  // Fetch resumes
  const { data: resumes, error: resumesError } = await supabase
    .from('resumes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (resumesError) {
    console.error("Error fetching resumes:", resumesError);
  }

  // Fetch safe API Keys metadata (explicitly excluding encrypted_key, iv, auth_tag)
  const { data: apiKeys, error: keysError } = await supabase
    .from('user_api_keys')
    .select('provider, created_at')
    .eq('user_id', user.id);

  if (keysError) {
    console.error("Error fetching API keys metadata:", keysError);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 text-gray-900 dark:text-zinc-100">
      <div className="mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-2 flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      
      <SettingsClient 
        initialProfile={profile} 
        applications={applications || []} 
        resumes={resumes || []}
        apiKeys={apiKeys || []}
        userEmail={user.email || ""} 
      />
    </div>
  );
}
