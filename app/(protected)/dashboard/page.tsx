import { createClient } from '../../../lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome! You are logged in as {user.email}</p>
      <div className="mt-8">
        <p className="text-sm text-gray-500">Your Supabase Magic Link session is active.</p>
        <p className="text-sm text-gray-500">The /api/extract route is now securely protected!</p>
      </div>
    </div>
  );
}
