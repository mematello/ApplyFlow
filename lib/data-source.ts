import { User } from '@supabase/supabase-js';
import { Application } from './types';
import * as localApp from './local/applications';
import { createClient } from './supabase/client';

export async function fetchApplications(user: User | null): Promise<Application[]> {
  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('date_applied', { ascending: false });

    if (error) throw error;
    return data || [];
  } else {
    // We treat local apps as regular apps in the UI
    const locals = await localApp.getApplications();
    return locals as Application[];
  }
}

export async function createApplication(user: User | null, data: Partial<Application>): Promise<Application> {
  if (user) {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to save application");
    return result.data as Application;
  } else {
    const result = await localApp.saveApplication(data);
    return result as unknown as Application;
  }
}

export async function updateApplicationStatus(user: User | null, id: string, status: string): Promise<void> {
  if (user) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update status");
  } else {
    await localApp.updateApplication(id, { status });
  }
}
