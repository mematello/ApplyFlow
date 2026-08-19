import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import Link from 'next/link';
import LogoutButton from '../../../components/LogoutButton';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { Settings } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let firstName = 'Guest';
  let applications = [];

  if (user) {
    // Check for profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (!profile) {
      redirect('/onboarding');
    }

    firstName = profile.full_name.split(' ')[0];

    // Fetch applications for the authenticated user, ordered by date_applied descending
    const { data: fetchedApps, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('date_applied', { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return <div className="p-8 text-red-500 dark:text-red-400">Failed to load applications.</div>;
    }
    applications = fetchedApps || [];
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 text-gray-900 dark:text-zinc-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-4 mb-8">
        <h1 className="text-3xl font-bold">Welcome, {firstName}!</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <ThemeToggle />
          {user && (
            <Link href="/settings" className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors" title="Settings">
              <Settings className="w-5 h-5" />
            </Link>
          )}
          {user ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className="px-4 py-2 min-h-[44px] flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-zinc-100 rounded-md font-medium transition-colors">
              Log in
            </Link>
          )}
          <Link href="/new" className="px-4 py-2 min-h-[44px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-sm">
            + New Application
          </Link>
        </div>
      </div>
      
      {/* Pass the loaded data down to the interactive client component */}
      <DashboardClient initialApplications={applications} isLocal={!user} />
    </div>
  );
}
