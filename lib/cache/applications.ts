import { unstable_cache } from 'next/cache';
import { createServiceClient } from '../supabase/serviceClient';

export function getCachedApplications(userId: string) {
  return unstable_cache(
    async () => {
      // Using service client because cookies() cannot be used inside unstable_cache
      const supabase = createServiceClient();
      console.log(`[CACHE MISS] Fetching applications for user ${userId} from DB`);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    [`applications-${userId}`],
    { tags: [`applications-${userId}`], revalidate: 60 }
  )();
}
