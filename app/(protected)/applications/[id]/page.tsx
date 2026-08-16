import { createClient } from '../../../../lib/supabase/server';
import { redirect } from 'next/navigation';
import ApplicationDetailClient from './ApplicationDetailClient';

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Unauthenticated, render the client component with isLocal=true
    return <ApplicationDetailClient initialApplication={null} isLocal={true} appId={id} />;
  }

  // Fetch the application, strictly scoping to the current user
  const { data: application, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !application) {
    console.error("Error fetching application:", error);
    // If not found, or not owned by user, gracefully redirect back to dashboard
    redirect('/dashboard');
  }

  return <ApplicationDetailClient initialApplication={application} isLocal={false} appId={id} />;
}
