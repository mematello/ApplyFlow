"use server";

import { createClient } from '../../../lib/supabase/server';
import { getProvider } from '../../../lib/ai/provider';
import { encrypt } from '../../../lib/utils/encryption';
import { revalidatePath } from 'next/cache';

export async function updatePreferredProvider(provider: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ preferred_provider: provider })
    .eq('id', user.id); // Explicit scoping for defense-in-depth

  if (error) {
    console.error("Error updating preferred provider:", error);
    return { error: 'Failed to update preferred provider' };
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function saveApiKey(provider: string, rawKey: string) {
  if (!rawKey || rawKey.trim() === '') {
    return { error: 'API key cannot be empty.' };
  }
  const cleanKey = rawKey.trim();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return { error: 'Unauthorized' };
  }

  let providerInstance;
  try {
    providerInstance = getProvider(provider, cleanKey);
  } catch (err) {
    return { error: 'Unsupported provider.' };
  }

  let isValid = false;
  try {
    isValid = await providerInstance.validateKey(cleanKey);
  } catch (err: any) {
    return { error: err.message };
  }

  if (!isValid) {
    return { error: 'Invalid API key.' };
  }

  let encryptedData;
  try {
    encryptedData = encrypt(cleanKey);
  } catch (encErr) {
    console.error("Encryption failed:", encErr);
    return { error: 'Failed to encrypt API key securely.' };
  }

  const { error: upsertError } = await supabase
    .from('user_api_keys')
    .upsert(
      {
        user_id: user.id, // Enforced from server session
        provider: provider,
        encrypted_key: encryptedData.encryptedKey,
        iv: encryptedData.iv,
        auth_tag: encryptedData.authTag
      },
      { onConflict: 'user_id, provider' }
    );

  if (upsertError) {
    console.error("Error saving API key:", upsertError);
    return { error: 'Failed to save API key' };
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function deleteApiKey(provider: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', user.id) // Explicit scoping for defense-in-depth
    .eq('provider', provider);

  if (error) {
    console.error("Error deleting API key:", error);
    return { error: 'Failed to delete API key' };
  }

  revalidatePath('/settings');
  return { success: true };
}
