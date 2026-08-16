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

function validateFit(data: Partial<Application>) {
  if (data.role_fit !== undefined && data.role_fit !== null) {
    if (data.role_fit < 1 || data.role_fit > 5) throw new Error("role_fit must be between 1 and 5");
  }
  if (data.culture_fit !== undefined && data.culture_fit !== null) {
    if (data.culture_fit < 1 || data.culture_fit > 5) throw new Error("culture_fit must be between 1 and 5");
  }
}

export async function createApplication(user: User | null, data: Partial<Application>): Promise<Application> {
  validateFit(data);
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

export async function updateApplication(user: User | null, id: string, data: Partial<Application>): Promise<void> {
  validateFit(data);
  if (user) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Failed to update application");
  } else {
    await localApp.updateApplication(id, data);
  }
}

export async function deleteApplication(user: User | null, id: string): Promise<void> {
  if (user) {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to delete application");
    }
  } else {
    await localApp.deleteApplication(id);
  }
}

export async function fetchApplicationById(user: User | null, id: string): Promise<Application | null> {
  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw error;
    }
    return data;
  } else {
    const localData = await localApp.getApplicationById(id);
    return localData as Application | null;
  }
}
