import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';
import Link from 'next/link';

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
  const { data: applications, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error("Error fetching applications:", error);
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 text-gray-900 dark:text-zinc-100">
      <div className="mb-8">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 mb-2 inline-block transition-colors">&larr; Back to Dashboard</Link>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      
      <SettingsClient 
        initialProfile={profile} 
        applications={applications || []} 
        userEmail={user.email || ""} 
      />
    </div>
  );
}
