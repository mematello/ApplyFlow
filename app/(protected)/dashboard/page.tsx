import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch applications for the authenticated user, ordered by date_applied descending
  const { data: applications, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', user.id)
    .order('date_applied', { ascending: false });

  if (error) {
    console.error("Error fetching applications:", error);
    return <div className="p-8 text-red-500">Failed to load applications.</div>;
  }

  // Handle empty state gracefully by prompting the user to track their first application
  if (!applications || applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 text-zinc-100">
        <h2 className="text-2xl font-bold mb-4">No applications yet</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
          You haven't tracked any job applications yet. Paste your first job description to get started!
        </p>
        <Link href="/new" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors">
          Track New Application
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 text-zinc-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/new" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-sm">
          + New Application
        </Link>
      </div>
      
      {/* Pass the loaded data down to the interactive client component */}
      <DashboardClient initialApplications={applications} />
    </div>
  );
}
